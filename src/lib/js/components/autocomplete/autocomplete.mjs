import i18n from '@draggable/i18n'
import animate from '../../common/animation.js'
import dom from '../../common/dom.js'
import Components from '../index.js'
import { ANIMATION_SPEED_FAST, ANIMATION_SPEED_SLOW } from '../../constants.js'
import { isAddress, noop } from '../../common/utils/index.mjs'
import {
  componentOptions,
  DISPLAY_FIELD_CLASSNAME,
  getComponentLabel,
  HIGHLIGHT_CLASSNAME,
  LIST_CLASSNAME,
} from './helpers.mjs'
import { splitAddress } from '../../common/utils/string.mjs'

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
   */
  constructor({ key, value, className, onChange = noop }) {
    this.key = key
    this.className = className || this.key.replace(/\./g, '-')
    this.value = value
    this.onChange = onChange || noop
    this.events = []

    this.build()
  }

  createProxy() {
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop]
        }

        if (prop in target.dom) {
          const value = target.dom[prop]
          return typeof value === 'function' ? value.bind(target.dom) : value
        }

        return undefined
      },
      set(target, prop, value) {
        if (prop in target) {
          target[prop] = value
        } else {
          target.dom[prop] = value
        }
        return true
      },
    })
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
        const { value } = evt.target
        const filteredOptions = dom.toggleElementsByStr(this.list.querySelectorAll('li'), value)

        if (value.length === 0) {
          this.clearValue()
        }

        if (filteredOptions.length === 0) {
          this.hideList()
        } else {
          const activeOption = this.getActiveOption() || filteredOptions[0]
          this.showList(activeOption)
        }

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
        placeholder: i18n.get(`${this.key}.placeholder`),
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

    this.clearButton = dom.create({
      tag: 'span',
      content: dom.icon('remove'),
      className: 'clear-button hidden',
      action: { click: () => this.clearValue() },
    })

    this.dom = dom.create({
      children: [this.displayField, this.clearButton, this.hiddenField],
      className: this.className,
      action: {
        onRender: element => {
          this.stage = element.closest('.formeo-stage')
          if (this.value) {
            this.displayField.value = this.label
          }
        },
      },
    })

    return this.dom
  }

  get label() {
    const component = this.value && Components.getAddress(this.value)
    return (component && getComponentLabel(component, `${this.key}`)) || this.value
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
      const { componentAddress, isOptionAddress, optionIndex } = splitAddress(value).reduce(
        (acc, cur) => {
          if (cur === 'options') {
            acc.isOptionAddress = true
            return acc
          }
          if (!acc.isOptionAddress) {
            acc.componentAddress.push(cur)
            return acc
          }

          acc.optionIndex = +cur

          return acc
        },
        {
          componentAddress: [],
          optionIndex: null,
          isOptionAddress: false,
        },
      )

      const component = Components.getAddress(componentAddress)

      if (component?.dom) {
        component.dom.classList.add(HIGHLIGHT_CLASSNAME)
        if (isOptionAddress) {
          const checkboxes = component.dom.querySelectorAll('.field-preview .f-checkbox, .field-preview .f-radio')
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
    this.displayField.focus()
  }

  /**
   * Sets the hidden and display values
   * @param {String} label display text
   * @param {String} value display text
   */
  setValue(target) {
    const { label, value } = target.dataset

    this.displayField.value = label
    this.hiddenField.value = value
    this.value = value

    this.clearButton.classList.toggle('hidden', !value.length)

    this.onChange?.({ target: this.hiddenField })
  }
}
