import i18n from '@draggable/i18n'
import animate from '../common/animation.js'
import dom from '../common/dom.js'
import Components from './index.js'
import { ANIMATION_SPEED_FAST, ANIMATION_SPEED_SLOW } from '../constants.js'
import { toTitleCase } from '../common/utils/string.mjs'
import { isAddress } from '../common/utils/index.mjs'

const BASE_NAME = 'f-autocomplete'
const DISPLAY_FIELD_CLASSNAME = `${BASE_NAME}-display-field`
const LIST_CLASSNAME = `${BASE_NAME}-list`
const LIST_ITEM_CLASSNAME = `${LIST_CLASSNAME}-item`
const HIGHLIGHT_CLASSNAME = 'highlight-component'

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
  ['if.condition.source', resolveFieldLabel],
  ['if.condition.target', resolveFieldLabel],
  ['then.condition.target', resolveComponentLabel],
])

/**
 * Find or generate a label for components and external data
 * @param {Object} Component
 * @return {String} component label
 */
const getComponentLabel = ({ id, ...component }, key) => {
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
    const value = `${component.address}.options.${index}`
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
    const label = getComponentLabel(component, `${autocomplete.i18nKey}.${autocomplete.key}`)
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

/**
 * Autocomplete class
 * Output an autocomplete form element
 */
export default class Autocomplete {
  lastCache = Date.now()
  optionsCache = null
  /**
   * Create an Autocomplete instance
   * @param {String} key - The key for the autocomplete instance
   * @param {String} value - The initial value for the autocomplete input
   * @param {String} i18nKey - The internationalization key for the autocomplete
   */
  constructor(key, value, i18nKey) {
    this.key = key
    this.className = key.replace(/\./g, '-')
    this.value = value
    this.events = []
    this.i18nKey = i18nKey

    this.build()
  }

  get isAddress() {
    return isAddress(this.value)
  }

  get valueComponent() {
    return isAddress(this.value) && Components.getAddress(this.value)
  }

  /**
   * build a text DOM element, supporting other jquery text form-control's
   * @return {Object} DOM Element to be injected into the form.
   */
  build() {
    const keyboardNav = e => {
      const list = this.list
      const activeOption = this.getActiveOption()
      const keyCodeMap = new Map([
        [
          38, // up arrow
          () => {
            const previous = this.getPreviousOption(activeOption)
            if (previous) {
              this.selectOption(previous)
            }
          },
        ],

        [
          40, // down arrow
          () => {
            const next = this.getNextOption(activeOption)
            if (next) {
              this.selectOption(next)
            }
          },
        ],

        [
          13, // enter
          () => {
            if (activeOption) {
              this.selectOption(activeOption)
              this.setValue(activeOption)
              if (list.style.display === 'none') {
                this.showList(activeOption)
              } else {
                this.hideList()
              }
            }
            e.preventDefault()
          },
        ],

        [
          27, // escape
          () => {
            this.hideList()
          },
        ],
      ])

      let direction = keyCodeMap.get(e.keyCode)
      if (!direction) {
        direction = () => false
      }

      return direction()
    }
    const autoCompleteInputActions = {
      focus: ({ target }) => {
        this.updateOptions()
        target.parentElement.classList.add(`${this.className}-focused`)
        const filteredOptions = dom.toggleElementsByStr(this.list.querySelectorAll('li'), target.value)
        target.addEventListener('keydown', keyboardNav)
        const selectedOption = this.list.querySelector('.active-option') || filteredOptions[0]
        this.showList(selectedOption)
      },
      blur: ({ target }) => {
        target.parentElement.classList.remove(`${this.className}-focused`)
        target.removeEventListener('keydown', keyboardNav)
        this.hideList()
      },
      input: evt => {
        const filteredOptions = dom.toggleElementsByStr(this.list.querySelectorAll('li'), evt.target.value)

        if (evt.target.value.length === 0) {
          this.clearValue()
        }

        if (filteredOptions.length === 0) {
          this.hideList()
        } else {
          const activeOption = this.getActiveOption() || filteredOptions[0]
          this.showList(activeOption)
        }

        const value = evt.target.value.trim()

        this.hiddenField.value = value
        this.value = value

        this.setValue({ dataset: { label: value, value } })
      },
    }

    this.displayField = dom.create({
      tag: 'input',
      autocomplete: 'off',
      action: autoCompleteInputActions,
      attrs: {
        type: 'text',
        className: DISPLAY_FIELD_CLASSNAME,
        value: this.label || this.value,
        placeholder: i18n.get(`${this.i18nKey}.${this.key}.placeholder`),
      },
    })
    this.hiddenField = dom.create({
      tag: 'input',
      attrs: { type: 'hidden', className: this.className, value: this.value },
    })

    this.list = dom.create({
      tag: 'ul',
      attrs: { className: LIST_CLASSNAME },
    })

    const clearButton = {
      tag: 'span',
      content: dom.icon('remove'),
      className: 'clear-button',
      action: { click: () => this.clearValue() },
    }

    this.dom = dom.create({
      children: [this.displayField, clearButton, this.hiddenField],
      className: this.className,
      action: {
        onRender: element => {
          this.stage = element.closest('.formeo-stage')
          const component = this.value && Components.getAddress(this.value)
          this.label = component && getComponentLabel(component)
          if (this.label) {
            this.displayField.value = this.label
          }
        },
      },
    })

    return this.dom
  }

  updateOptions() {
    let options = this.optionsCache
    const now = Date.now()

    if (now - this.lastCache > ANIMATION_SPEED_SLOW * 5 || !options) {
      dom.empty(this.list)
      options = this.generateOptions()
      this.lastCache = now
    }

    if (!this.list.children.length) {
      this.list.append(...options)
    }
  }

  generateOptions() {
    this.optionsCache = componentOptions(this)

    return this.optionsCache
  }

  setListPosition() {
    const { offsetHeight, offsetWidth } = this.displayField
    const containerRect = this.displayField.closest('.formeo-stage').getBoundingClientRect()
    const triggerRect = this.displayField.getBoundingClientRect()
    const listStyle = {
      position: 'absolute',
      top: `${triggerRect.y + offsetHeight - containerRect.y}px`,
      left: `${triggerRect.x + window.scrollX - containerRect.x + 2}px`,
      width: `${offsetWidth}px`,
    }
    Object.assign(this.list.style, listStyle)
  }

  /**
   * Shows autocomplete list. Automatically selects 'selectedOption'
   * @param {Object} list - list of autocomplete options
   * @param {Object} selectedOption - option to be selected
   */
  showList(selectedOption, list = this.list) {
    if (!this.stage.contains(this.list)) {
      this.stage.appendChild(this.list)
    }
    this.setListPosition()
    this.selectOption(selectedOption)
    animate.slideDown(list, ANIMATION_SPEED_FAST)
  }

  /**
   * Hides autocomplete list and deselects all the options
   * @param {Object} list - list of autocomplete options
   */
  hideList(list = this.list) {
    animate.slideUp(list, ANIMATION_SPEED_FAST)
    this.removeHighlight()
    if (this.stage.contains(this.list)) {
      this.stage.removeChild(this.list)
    }
  }

  /**
   * Returns first option from autocomplete list with 'active-option' class
   * @param {Object} list - list of autocomplete options
   * @return {Object} first list option with 'active-option' class
   */
  getActiveOption(list = this.list) {
    const activeOption = list.querySelector('.active-option')
    if (activeOption?.style.display !== 'none') {
      return activeOption
    }
    return null
  }

  /**
   * Previous next option to the current option
   * @param {Object} current - currently selected option
   * @return {Object} previous option to the current option or null if previous doesn't exist
   */
  getPreviousOption(current) {
    let previous = current
    do {
      previous = previous ? previous.previousSibling : null
    } while (previous != null && previous.style.display === 'none')
    return previous
  }

  /**
   * Returns next option to the current option
   * @param {Object} current - currently selected option
   * @return {Object} next option to the current option or null if next doesn't exist
   */
  getNextOption(current) {
    let next = current
    do {
      next = next ? next.nextSibling : null
    } while (next != null && next.style.display === 'none')
    return next
  }

  /**
   * Selects option in autocomplete list. Removes class 'active-option' from all options
   * and then adds that class to 'selected' option. If 'selected' is null then no option is selected
   * @param {Object} list - list of autocomplete options
   * @param {Object} selectedOption - option - 'li' element - to be selected in autocomplete list
   */
  selectOption(selectedOption, list = this.list) {
    const options = list.querySelectorAll('li')
    for (const option of options) {
      const {
        dataset: { value },
      } = option
      option.classList.remove('active-option')

      if (isAddress(value)) {
        const component = Components.getAddress(value)
        component.dom?.classList.remove(HIGHLIGHT_CLASSNAME)
      }
    }
    if (selectedOption) {
      selectedOption.classList.add('active-option')
      this.highlightComponent(selectedOption)
    }
  }

  /**
   * removes the highlight from
   */
  removeHighlight() {
    const highlightedComponents = document.getElementsByClassName(HIGHLIGHT_CLASSNAME)
    for (const component of highlightedComponents) {
      component.classList.remove(HIGHLIGHT_CLASSNAME)
    }
  }

  /**
   * Highlight a component that maps to the option
   */
  highlightComponent(option) {
    const {
      dataset: { value },
    } = option

    if (isAddress(value)) {
      const isOptions = value.includes('.options.')
      const [componentAddress, optionIndex] = isOptions ? value.split('.options.') : [value, null]
      const component = Components.getAddress(componentAddress)
      if (component.dom) {
        component.dom.classList.add(HIGHLIGHT_CLASSNAME)
        if (optionIndex) {
          const checkboxes = component.dom.querySelectorAll('.field-preview .f-checkbox')
          checkboxes[optionIndex]?.classList.add(HIGHLIGHT_CLASSNAME)
        }
      }
    }
  }

  /**
   * Clears the autocomplete values and fires onChange event
   */
  clearValue() {
    this.selectOption(null)

    this.setValue({ dataset: { label: '', value: '' } })
  }

  /**
   * Sets the hidden and display values
   * @param {String} label display text
   * @param {String} value display text
   */
  setValue(target) {
    const { label, value } = target.dataset
    const trimmedValue = value.trim()

    this.displayField.value = label
    this.hiddenField.value = trimmedValue
    this.value = trimmedValue

    this.runEvent('onChange', { target: this.hiddenField })
  }

  addEvent(key, event) {
    this.events.push([key, event])
  }

  runEvent(eventName, evt) {
    for (const [key, event] of this.events) {
      if (key === eventName) {
        event(evt)
      }
    }
  }
}
