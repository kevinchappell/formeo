import isEqual from 'lodash/isEqual'
import dom from '../common/dom'
import { cleanFormData } from '../common/utils/index.mjs'
import { ASSIGNMENT_OPERATORS, COMPARISON_OPERATORS, UUID_REGEXP } from '../constants'

export const RENDER_PREFIX = 'f-'

export const containerLookup = container =>
  typeof container === 'string' ? document.querySelector(container) : container
export const processOptions = ({ editorContainer, renderContainer, formData, ...opts }) => {
  const processedOptions = {
    renderContainer: containerLookup(renderContainer),
    editorContainer: containerLookup(editorContainer),
    formData: cleanFormData(formData),
  }

  return { elements: {}, ...opts, ...processedOptions }
}

export const baseId = id => {
  const match = id.match(UUID_REGEXP)
  return match?.[0] || id``
}

const isVisible = elem => {
  if (!elem) return false

  if (elem.hasAttribute('hidden') || elem.parentElement.hasAttribute('hidden')) {
    return false
  }

  const computedStyle = window.getComputedStyle(elem)
  return !(computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0')
}

export const propertyMap = {
  isChecked: elem => {
    return elem.checked
  },
  isNotChecked: elem => {
    return !elem.checked
  },
  value: elem => {
    return elem.value
  },
  isVisible: elem => {
    return isVisible(elem)
  },
  isNotVisible: elem => {
    return !isVisible(elem)
  },
}

export const createRemoveButton = () =>
  dom.btnTemplate({
    className: 'remove-input-group',
    children: dom.icon('remove'),
    action: {
      mouseover: ({ target }) => target.parentElement.classList.add('will-remove'),
      mouseleave: ({ target }) => target.parentElement.classList.remove('will-remove'),
      click: ({ target }) => target.parentElement.remove(),
    },
  })

export const comparisonHandlers = {
  equals: isEqual,
  notEquals: (source, target) => !isEqual(source, target),
  contains: (source, target) => source.includes(target),
  notContains: (source, target) => !source.includes(target),
}

export const comparisonMap = Object.entries(COMPARISON_OPERATORS).reduce((acc, [key, value]) => {
  // support and new comparison operators for backwards compatibility
  acc[value] = comparisonHandlers[key]
  acc[key] = comparisonHandlers[key]

  return acc
}, {})

const assignmentHandlers = {
  equals: (elem, { targetProperty, value }) => {
    elem[`_${targetProperty}`] = elem[targetProperty]
    elem[targetProperty] = value
  },
}

export const assignmentMap = Object.entries(ASSIGNMENT_OPERATORS).reduce((acc, [key, value]) => {
  acc[value] = assignmentHandlers[key]
  acc[key] = assignmentHandlers[key]

  return acc
}, {})

export const targetPropertyMap = {
  isChecked: elem => {
    elem.checked = true
  },
  isNotChecked: elem => {
    elem.checked = false
  },
  value: (elem, { assignment, ...rest }) => {
    return assignmentMap[assignment]?.(elem, rest)
  },
  isNotVisible: elem => {
    if (elem?._required === undefined) {
      elem._required = elem.required
    }
    elem.parentElement.setAttribute('hidden', true)
    elem.required = false // Hidden input cannot be required.
  },
  isVisible: elem => {
    elem.parentElement.removeAttribute('hidden')
    elem.required = elem._required
  },
}
