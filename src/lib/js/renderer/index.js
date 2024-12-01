import dom from '../common/dom'
import { uuid, isAddress, isExternalAddress, merge, cleanFormData } from '../common/utils/index.mjs'
import { STAGE_CLASSNAME } from '../constants'
import { fetchDependencies } from '../common/loaders'
import { splitAddress } from '../common/utils/string.mjs'
import {
  baseId,
  comparisonMap,
  createRemoveButton,
  processOptions,
  propertyMap,
  RENDER_PREFIX,
  targetPropertyMap,
} from './helpers'

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

  get formData() {
    return this.form
  }
  set formData(data) {
    this.form = cleanFormData(data)
  }
  get userData() {
    const userData = new FormData(this.renderedForm)

    const formDataObj = {}
    for (const [key, value] of userData.entries()) {
      if (formDataObj[key]) {
        if (Array.isArray(formDataObj[key])) {
          formDataObj[key].push(value)
        } else {
          formDataObj[key] = [formDataObj[key], value]
        }
      } else {
        formDataObj[key] = value
      }
    }

    return formDataObj
  }
  set userData(data = {}) {
    const form = this.container.querySelector('form')
    for (const key of Object.keys(data)) {
      const fields = form.elements[key]

      // Handle checkbox groups
      if (fields.length && fields[0].type === 'checkbox') {
        // Convert to array if not already
        const values = Array.isArray(data[key]) ? data[key] : [data[key]]

        for (const field of fields) {
          field.checked = values.includes(field.value)
        }
      }
      // Handle radio groups
      else if (fields.length && fields[0].type === 'radio') {
        for (const field of fields) {
          field.checked = field.value === data[key]
        }
      }
      // Handle single inputs
      else if (fields.type) {
        fields.value = data[key]
      }
    }
  }

  /**
   * Renders the formData to a target Element
   * @param {Object} formData
   */
  render(formData = this.form) {
    const renderedForm = this.getRenderedForm(formData)
    const existingRenderedForm = this.container.querySelector('.formeo-render')

    if (existingRenderedForm) {
      existingRenderedForm.replaceWith(renderedForm)
    } else {
      this.container.appendChild(renderedForm)
    }
  }

  getRenderedForm(formData = this.form) {
    this.form = cleanFormData(formData)

    const renderCount = document.getElementsByClassName('formeo-render').length
    const config = {
      tag: 'form',
      id: this.form.id,
      className: `formeo-render formeo formeo-rendered-${renderCount}`,
      children: this.processedData,
    }

    this.renderedForm = dom.render(config)

    this.applyConditions()

    return this.renderedForm
  }

  get html() {
    const renderedForm = this.renderedForm || this.getRenderedForm()
    return renderedForm.outerHTML
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
    return {
      ...rest,
      id: uuid(id),
      children: children?.length && children.map(({ id }) => this.cloneComponentData(baseId(id))),
    }
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
        const elem = dom.create(this.cloneComponentData(id))
        fInputGroup.insertBefore(elem, fInputGroup.lastChild)
        const removeButton = dom.create(createRemoveButton())

        elem.appendChild(removeButton)
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
              const component = this.getComponent(source)
              this.handleComponentCondition(component, ifRest, thenConditions)
              // const components = this.getComponents(source)
              // for (const component of components) {
              //   this.handleComponentCondition(component, ifRest, thenConditions)
              // }
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
    const sourceValue = propertyMap[sourceProperty]?.(evt.target)

    if (typeof sourceValue === 'boolean') {
      return sourceValue
    }

    const targetValue = String(isAddress(target) ? this.getComponent(target)[targetProperty] : target)

    return comparisonMap[comparison]?.(sourceValue, targetValue)
  }

  execResult = ({ target, targetProperty, assignment, value }) => {
    if (isAddress(target)) {
      const elem = this.getComponent(target)

      targetPropertyMap[targetProperty]?.(elem, { targetProperty, assignment, value })
    }
  }

  getComponent = address => {
    if (!isAddress(address)) {
      return null
    }
    const [componentIndexType, componentId, optionsKey, optionIndex] = splitAddress(address)

    if (componentIndexType === 'external') {
      return this.external[componentId]
    }

    const component = this.renderedForm.querySelector(`#${RENDER_PREFIX}${componentId}`)

    if (!component) {
      return null
    }

    if (optionsKey) {
      const options = component.querySelectorAll('input')
      return options[optionIndex]
    }

    return component
  }

  getComponents = address => {
    const components = []
    const componentId = address.slice(address.indexOf('.') + 1)
    // const

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
