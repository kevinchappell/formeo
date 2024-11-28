import i18n from '@draggable/i18n'
import { toTitleCase } from '../../common/utils/string.mjs'
import Components from '../index.js'
import dom from '../../common/dom.js'

export const BASE_NAME = 'f-autocomplete'
export const DISPLAY_FIELD_CLASSNAME = `${BASE_NAME}-display-field`
export const LIST_CLASSNAME = `${BASE_NAME}-list`
export const HIGHLIGHT_CLASSNAME = 'highlight-component'
export const LIST_ITEM_CLASSNAME = `${LIST_CLASSNAME}-item`

/**
 * Counts the number of occurences of a string in an array of strings
 * @param {Array} arr labels
 * @param {String} label
 */
export const labelCount = (arr, label) => {
  const count = arr.reduce((n, x) => n + (x === label), 0)
  return count > 1 ? `(${count})` : ''
}

const fieldLabelPaths = ['config.label', 'config.controlId']
const rowLabelPaths = ['config.legend', 'name']
const componentLabelPaths = [...fieldLabelPaths, ...rowLabelPaths]

const resolveFieldLabel = field => {
  return fieldLabelPaths.reduce((acc, path) => {
    if (!acc) {
      return field.get(path)
    }
    return acc
  }, null)
}

const resolveComponentLabel = component => {
  return (
    componentLabelPaths.reduce((acc, path) => {
      if (!acc) {
        return component.get(path)
      }
      return acc
    }, null) || toTitleCase(component.name)
  )
}

const labelResolverMap = new Map([
  ['condition.source', resolveFieldLabel],
  ['if.condition.source', resolveFieldLabel],
  ['if.condition.target', resolveFieldLabel],
  ['then.condition.target', resolveComponentLabel],
  ['condition.target', resolveComponentLabel],
])

/**
 * Find or generate a label for components and external data
 * @param {Object} Component
 * @return {String} component label
 */
export const getComponentLabel = ({ id, ...component }, key) => {
  const { name } = component.name
  const labelResolver = labelResolverMap.get(key)
  const label = labelResolver(component)
  const externalLabel = (...externalAddress) =>
    i18n.get(externalAddress.join('.')) || toTitleCase(externalAddress.join(' '))

  return label || (name === 'external' && externalLabel(name, id))
}

const makeOptionData = ({ selectedId, ...option }) => {
  if (option.value === selectedId) {
    option.selected = true
  }

  return option
}

const realTarget = target => {
  if (!target.classList.contains(LIST_ITEM_CLASSNAME)) {
    target = target.parentElement
  }

  return target
}

const makeListItem = ({ value, textLabel, htmlLabel, componentType }, autocomplete) => {
  const optionConfig = {
    tag: 'li',
    children: htmlLabel,
    dataset: {
      value,
      label: textLabel,
    },
    className: [LIST_ITEM_CLASSNAME, `component-type-${componentType}`],
    action: {
      mousedown: ({ target }) => {
        target = realTarget(target)
        autocomplete.setValue(target)
        autocomplete.selectOption(target)
        autocomplete.hideList()
      },
      mouseover: ({ target }) => {
        target = realTarget(target)
        autocomplete.removeHighlight()
        autocomplete.highlightComponent(target)
      },
      mouseleave: ({ target }) => {
        target = realTarget(target)
        autocomplete.removeHighlight()
      },
    },
  }
  return dom.create(optionConfig)
}

const makeComponentOptionsList = (component, autocomplete) => {
  const items = component.data.options.map((option, index) => {
    const value = `${component.address}.options[${index}]`
    const textLabel = option.label
    const htmlLabel = option.label
    return makeListItem({ value, textLabel, htmlLabel, componentType: 'option' }, autocomplete)
  })

  const list = dom.create({
    tag: 'ul',
    attrs: { className: [LIST_CLASSNAME, 'options-list'] },
    children: items,
  })

  return list
}

/**
 * Generate options for the autolinker component
 * @param {String} selectedId option value
 * @return {Array} option config objects
 */
export const componentOptions = autocomplete => {
  const selectedId = autocomplete.value
  const labels = []
  const flatList = Components.flatList()
  const options = Object.entries(flatList).reduce((acc, [value, component]) => {
    const label = getComponentLabel(component, autocomplete.key)
    if (label) {
      const componentType = component.name
      const typeConfig = {
        tag: 'span',
        content: ` ${toTitleCase(componentType)}`,
        className: 'component-type',
      }
      const labelKey = `${componentType}.${label}`
      labels.push(labelKey)
      const count = labelCount(labels, labelKey)

      const countConfig = {
        tag: 'span',
        content: count,
        className: 'component-label-count',
      }
      const htmlLabel = [`${label} `, countConfig, typeConfig]
      const textLabel = [label, count].join(' ').trim()

      if (component.isCheckbox) {
        const componentOptionsList = makeComponentOptionsList(component, autocomplete)
        htmlLabel.push(componentOptionsList)
      }
      const optionData = makeOptionData({ value, textLabel, htmlLabel, componentType, selectedId })

      acc.push(makeListItem(optionData, autocomplete))
    }

    return acc
  }, [])

  return options
}
