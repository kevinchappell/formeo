import isEqual from 'lodash/isEqual'
import dom from './common/dom'
import { uuid, isAddress, isExternalAddress, merge, cleanFormData } from './common/utils/index.mjs'
import { COMPARISON_OPERATORS, STAGE_CLASSNAME, UUID_REGEXP } from './constants'
import { fetchDependencies } from './common/loaders'
import { splitAddress } from './common/utils/string.mjs'

const RENDER_PREFIX = 'f-'

const containerLookup = container => (typeof container === 'string' ? document.querySelector(container) : container)
const processOptions = ({ editorContainer, renderContainer, formData, ...opts }) => {
  const processedOptions = {
    renderContainer: containerLookup(renderContainer),
    editorContainer: containerLookup(editorContainer),
    formData: cleanFormData(formData),
  }

  return { elements: {}, ...opts, ...processedOptions }
}

const baseId = id => {
  const match = id.match(UUID_REGEXP)
  return match?.[0] || id
}

const newUUID = id => id.replace(UUID_REGEXP, uuid())

const createRemoveButton = () =>
  dom.btnTemplate({
    className: 'remove-input-group',
    children: dom.icon('remove'),
    action: {
      mouseover: ({ target }) => target.parentElement.classList.add('will-remove'),
      mouseleave: ({ target }) => target.parentElement.classList.remove('will-remove'),
      click: ({ target }) => target.parentElement.remove(),
    },
  })

const comparisonHandlers = {
  equals: isEqual,
  notEquals: (source, target) => !isEqual(source, target),
  contains: (source, target) => source.includes(target),
  notContains: (source, target) => !source.includes(target),
}

const comparisonMap = Object.entries(COMPARISON_OPERATORS).reduce((acc, [key, value]) => {
  // support and new comparison operators for backwards compatibility
  acc[value] = comparisonHandlers[key]
  acc[key] = comparisonHandlers[key]

  return acc
}, {})

export default class FormeoRenderer {
  constructor(opts, formDataArg) {
    const { renderContainer, external, elements, formData } = processOptions(opts)
    this.container = renderContainer
    this.form = cleanFormData(formDataArg || formData)
    this.external = external
    this.dom = dom
    this.components = Object.create(null)
    this.elements = elements
  }

  /**
   * Renders the formData to a target Element
   * @param {Object} formData
   */
  render = (formData = this.form) => {
    this.form = cleanFormData(formData)

    const renderCount = document.getElementsByClassName('formeo-render').length
    const config = {
      id: this.form.id,
      className: `formeo-render formeo formeo-rendered-${renderCount}`,
      children: this.processedData,
    }

    this.renderedForm = dom.render(config)

    this.applyConditions()

    const existingRenderedForm = this.container.querySelector('.formeo-render')

    if (existingRenderedForm) {
      existingRenderedForm.replaceWith(this.renderedForm)
    } else {
      this.container.appendChild(this.renderedForm)
    }
  }

  orderChildren = (type, order) =>
    order.reduce((acc, cur) => {
      acc.push(this.form[type][cur])
      return acc
    }, [])

  prefixId = id => RENDER_PREFIX + id

  /**
   * Convert sizes, apply styles for render
   * @param  {Object} columnData
   * @return {Object} processed column data
   */
  processColumn = ({ id, ...columnData }) => ({
    ...columnData,
    ...{
      id: this.prefixId(id),
      children: this.processFields(columnData.children),
      style: `width: ${columnData.config.width || '100%'}`,
    },
  })

  processRows = stageId =>
    this.orderChildren('rows', this.form.stages[stageId].children).reduce((acc, row) => {
      if (row) {
        acc.push(this.processRow(row))
      }
      return acc
    }, [])

  cacheComponent = data => {
    this.components[baseId(data.id)] = data
    return data
  }

  /**
   * Applies a row's config
   * @param {Object} row data
   * @return {Object} row config object
   */
  processRow = (data, type = 'row') => {
    const { config, id } = data
    const className = [`formeo-${type}-wrap`]
    const rowData = { ...data, children: this.processColumns(data.id), id: this.prefixId(id) }
    this.cacheComponent(rowData)

    const configConditions = [
      { condition: config.legend, result: () => ({ tag: config.fieldset ? 'legend' : 'h3', children: config.legend }) },
      { condition: true, result: () => rowData },
      { condition: config.inputGroup, result: () => this.addButton(id) },
    ]

    const children = configConditions.reduce((acc, { condition, result }) => {
      if (condition) {
        acc.push(result())
      }
      return acc
    }, [])

    if (config.inputGroup) {
      className.push(`${RENDER_PREFIX}input-group-wrap`)
    }

    return {
      tag: config.fieldset ? 'fieldset' : 'div',
      className,
      children,
    }
  }

  cloneComponentData = componentId => {
    const { children = [], id, ...rest } = this.components[componentId]
    return Object.assign({}, rest, {
      id: newUUID(id),
      children: children.length && children.map(({ id }) => this.cloneComponentData(baseId(id))),
    })
  }

  addButton = id => ({
    tag: 'button',
    attrs: {
      className: 'add-input-group btn pull-right',
      type: 'button',
    },
    children: 'Add +',
    action: {
      click: e => {
        const fInputGroup = e.target.parentElement
        const elem = this.cloneComponentData(id)
        fInputGroup.insertBefore(elem, fInputGroup.lastChild)
        elem.appendChild(createRemoveButton())
      },
    },
  })

  processColumns = rowId => {
    return this.orderChildren('columns', this.form.rows[rowId].children).map(column =>
      this.cacheComponent(this.processColumn(column)),
    )
  }

  processFields = fieldIds =>
    this.orderChildren('fields', fieldIds).map(({ id, ...field }) => {
      const controlId = field.config?.controlId || field.meta?.id
      const { action = {}, dependencies = {} } = this.elements[controlId] || {}

      if (dependencies) {
        fetchDependencies(dependencies)
      }

      const mergedFieldData = merge({ action }, field)

      return this.cacheComponent({ ...mergedFieldData, id: this.prefixId(id) })
    })

  get processedData() {
    return Object.values(this.form.stages).map(stage => {
      stage.children = this.processRows(stage.id)
      stage.className = STAGE_CLASSNAME
      return stage
    })
  }

  /**
   * Evaulate and execute conditions for fields by creating listeners for input and changes
   * @return {Array} flattened array of conditions
   */
  handleComponentCondition = (component, ifRest, thenConditions) => {
    const listenerEvent = LISTEN_TYPE_MAP(component)

    if (listenerEvent) {
      component.addEventListener(
        listenerEvent,
        evt => {
          if (this.evaluateCondition(ifRest, evt)) {
            for (const thenCondition of thenConditions) {
              this.execResult(thenCondition, evt)
            }
          }
        },
        false,
      )
    }

    // Evaluate conditions on load.
    const fakeEvt = { target: component }
    if (this.evaluateCondition(ifRest, fakeEvt)) {
      for (const thenCondition of thenConditions) {
        this.execResult(thenCondition, fakeEvt)
      }
    }
  }

  applyConditions = () => {
    for (const { conditions } of Object.values(this.components)) {
      if (conditions) {
        for (const condition of conditions) {
          const { if: ifConditions, then: thenConditions } = condition

          for (const ifCondition of ifConditions) {
            const { source, ...ifRest } = ifCondition

            if (isAddress(source)) {
              const components = this.getComponents(source)
              for (const component of components) {
                this.handleComponentCondition(component, ifRest, thenConditions)
              }
            }
          }
        }
      }
    }
  }

  /**
   * Evaulate conditions
   */
  evaluateCondition = ({ sourceProperty, targetProperty, comparison, target }, evt) => {
    // Compare as string, this allows values like "true" to be checked for properties like "checked".
    const sourceValue = String(evt.target[sourceProperty])
    const targetValue = String(isAddress(target) ? this.getComponent(target)[targetProperty] : target)
    return comparisonMap[comparison]?.(sourceValue, targetValue)
  }

  execResult = ({ assignment, target, targetProperty, value }) => {
    const assignMap = {
      equals: elem => {
        const propMap = {
          value: () => {
            elem[targetProperty] = value
          },
          isNotVisible: () => {
            elem.parentElement.setAttribute('hidden', true)
            elem.required = false // Hidden input cannot be required.
          },
          isVisible: () => {
            elem.parentElement.removeAttribute('hidden')
            elem.required = elem._required
          },
        }
        propMap[targetProperty]?.()
      },
    }

    const targetPropertyMap = {
      isChecked: elem => {
        elem.checked = value
      },
    }

    if (isAddress(target)) {
      const elem = this.getComponent(target)

      // Store required value.
      if (elem && elem._required === undefined) {
        elem._required = elem.required
      }

      targetPropertyMap[targetProperty]?.(elem)
      // assignMap[assignment]?.(elem)
    }
  }

  getComponent = address => {
    if (!isAddress(address)) {
      return null
    }
    const [addressArray] = splitAddress(address)
    const componentId = address.slice(address.indexOf('.') + 1)
    debugger
    const component = isExternalAddress(address)
      ? this.external[componentId]
      : this.renderedForm.querySelector(`#f-${componentId}`)
    return component
  }

  getComponents = address => {
    const components = []
    const componentId = address.slice(address.indexOf('.') + 1)

    if (isExternalAddress(address)) {
      components.push(this.external[componentId])
    } else {
      components.push(...this.renderedForm.querySelectorAll(`[name=f-${componentId}]`))
    }

    return components
  }
}

const LISTEN_TYPE_MAP = component => {
  const typesMap = [
    ['input', c => ['textarea', 'text'].includes(c.type)],
    ['change', c => ['select'].includes(c.tagName.toLowerCase()) || ['checkbox', 'radio'].includes(c.type)],
  ]

  const [listenerEvent] = typesMap.find(typeMap => typeMap[1](component)) || [false]

  return listenerEvent
}
