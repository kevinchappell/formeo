import h, { forEach } from './helpers.mjs'
import i18n from '@draggable/i18n'
import animate from './animation.js'
import Components from '../components/index.js'
import { uuid, componentType, merge } from './utils/index.mjs'
import {
  ROW_CLASSNAME,
  STAGE_CLASSNAME,
  COLUMN_CLASSNAME,
  FIELD_CLASSNAME,
  CONTROL_GROUP_CLASSNAME,
  CHILD_CLASSNAME_MAP,
  iconPrefix,
  formeoSpriteId,
} from '../constants.js'
import { extractTextFromHtml, slugify, truncateByWord } from './utils/string.mjs'

const iconFontTemplates = {
  glyphicons: icon => `<span class="glyphicon glyphicon-${icon}" aria-hidden="true"></span>`,
  'font-awesome': icon => {
    const [style, name] = icon.split(' ')
    return `<i class="${style} fa-${name}"></i>`
  },
  fontello: icon => `<i class="${iconPrefix}${icon}">${icon}</i>`,
}

const inputTags = new Set(['input', 'textarea', 'select'])

export const getName = (elem = {}) => {
  let name = elem?.attrs?.name || elem?.name

  if (name) {
    return name
  }

  const id = uuid(elem)
  let label = elem.config?.label || elem.attrs?.label || elem?.label

  if (label) {
    if (typeof label === 'object') {
      label = dom.create(label).textContent
    }

    if (/^<.+>.+<.+>$/gim.test(label)) {
      label = extractTextFromHtml(label)
    }

    name = `${id}-${slugify(truncateByWord(label, 24, null))}`
  }

  return name
}

/**
 * General purpose markup utilities and generator.
 */
class DOM {
  /**
   * Set defaults, store references to key elements
   * like stages, rows, columns etc
   */
  constructor(options = Object.create(null)) {
    this.options = options
  }

  set setOptions(options) {
    this.options = merge(this.options, options)
  }

  /**
   * Ensure elements have proper tagName
   * @param  {Object|String} elem
   * @return {Object} valid element object
   */
  processElemArg(elemArg) {
    let elem = elemArg
    let tagName
    if (typeof elem === 'string') {
      tagName = elem
      elem = { tag: tagName }
      return elem
    }

    if (elem.attrs) {
      const { tag, ...restAttrs } = elem.attrs
      // this is used for interchangeable tagNames like h1, h2, h3 etc
      if (tag) {
        if (typeof tag === 'string') {
          tagName = tag
        } else {
          const selectedTag = tag.find(t => t.selected === true) || tag[0]
          tagName = selectedTag.value
        }
      }
      elem.attrs = restAttrs
    }

    elem.tag = tagName || elem.tag || 'div'

    return elem
  }

  /**
   * Wraps dom.create to modify data
   * Used when rendering components in form- not editor
   */
  render = elem => {
    elem.id = `f-${elem.id || uuid()}`
    return this.create(elem)
  }

  /**
   * Creates DOM elements
   * @param  {Object}  elem      element config object
   * @param  {Boolean} isPreview generating element for preview or render?
   * @return {Object}            DOM Object
   */
  create = (elemArg, isPreview = false) => {
    if (!elemArg) {
      return
    }
    if (this.isDOMElement(elemArg)) {
      return elemArg
    }

    const _this = this
    const processed = ['children', 'content']
    const { className, options, dataset, conditions, ...elem } = this.processElemArg(elemArg)
    processed.push('tag')
    let childType
    const { tag } = elem
    let i
    const wrap = {
      attrs: {},
      className: [h.get(elem, 'config.inputWrap')],
      children: [],
      config: {},
    }

    let element = document.createElement(tag)

    /**
     * Object for mapping contentType to its function
     * @type {Object}
     */
    const appendChildren = {
      string: children => {
        element.innerHTML += children
      },
      object: children => {
        return children && element.appendChild(_this.create(children, isPreview))
      },
      node: children => {
        return element.appendChild(children)
      },
      component: children => {
        return element.appendChild(children.dom)
      },
      array: children => {
        for (const child of children) {
          childType = _this.childType(child)
          appendChildren[childType](child)
        }
      },
      function: children => {
        children = children()
        childType = _this.childType(children)
        appendChildren[childType](children)
      },
      undefined: () => null,
      boolean: () => null,
    }

    // check for root className property
    if (className) {
      elem.attrs = merge(elem.attrs, { className })
    }

    if (options) {
      const processedOptions = this.processOptions(options, elem, isPreview)
      if (this.holdsContent(element) && tag !== 'button') {
        // mainly used for <select> tag
        appendChildren.array.call(this, processedOptions)
        elem.content = undefined
      } else {
        h.forEach(processedOptions, option => {
          wrap.children.push(_this.create(option, isPreview))
        })
        if (elem.attrs.className) {
          wrap.className = elem.attrs.className
        }
        wrap.id = elem.id
        wrap.config = { ...elem.config }
        return this.create(wrap, isPreview)
      }
      processed.push('options')
    }

    // Set element attributes
    if (elem.attrs) {
      _this.processAttrs(elem, element, isPreview)
      processed.push('attrs')
    }

    if (elem.config) {
      if (
        elem.config.label &&
        ((elem.config.label && tag !== 'button') || ['radio', 'checkbox'].includes(h.get(elem, 'attrs.type'))) &&
        !isPreview
      ) {
        const label = _this.label(elem)

        if (!elem.config.hideLabel) {
          const wrapContent = [label, element]
          if (_this.labelAfter(elem)) {
            wrapContent.reverse()
          }
          // if has label config, must be a field.
          // @todo change this logic so dom.create is project agnostic
          wrap.className.push('formeo-field')
          wrap.children.push(wrapContent)
        }
      }

      processed.push('config')
    }

    // Append Element Content
    if (elem.content || elem.children) {
      const children = elem.content || elem.children
      childType = _this.childType(children)
      if (!appendChildren[childType]) {
        console.error(`childType: ${childType} is not supported`)
      }
      appendChildren[childType].call(this, children)
    }

    // Set the new element's dataset
    if (dataset) {
      for (const data in dataset) {
        if (Object.hasOwn(dataset, data)) {
          element.dataset[data] = typeof dataset[data] === 'function' ? dataset[data]() : dataset[data]
        }
      }
      processed.push('dataset')
    }

    // Add listeners for defined actions
    if (elem.action) {
      this.actionHandler(element, elem.action)
      processed.push('action')
    }

    // Subtract processed and ignored and attach the rest
    const remaining = h.subtract(processed, Object.keys(elem))
    for (i = remaining.length - 1; i >= 0; i--) {
      element[remaining[i]] = elem[remaining[i]]
    }

    if (wrap.children.length) {
      element = this.create(wrap)
    }

    return element
  }

  onRender = (node, cb) => {
    if (!node.parentElement) {
      window.requestAnimationFrame(() => this.onRender(node, cb))
    } else {
      cb(node)
    }
  }

  /**
   * Processes element config object actions (click, onRender etc)
   */
  actionHandler(node, actions) {
    const handlers = {
      onRender: dom.onRender,
      render: dom.onRender,
    }
    const useCaptureEvts = ['focus', 'blur']
    const defaultHandler = event => (node, cb) => node.addEventListener(event, cb, useCaptureEvts.includes(event))

    return Object.entries(actions).map(([event, cb]) => {
      const cbs = Array.isArray(cb) ? cb : [cb]

      return cbs.map(cb => {
        const action = handlers[event] || defaultHandler(event)
        return action(node, cb)
      })
    })
  }

  get icons() {
    if (this.iconSymbols) {
      return this.iconSymbols
    }

    const iconSymbolNodes = document.querySelectorAll(`#${formeoSpriteId} svg symbol`)

    const createSvgIconConfig = symbolId => ({
      tag: 'svg',
      attrs: {
        className: ['svg-icon', symbolId],
      },
      children: [
        {
          tag: 'use',
          attrs: {
            'xmlns:xlink': 'http://www.w3.org/1999/xlink',
            'xlink:href': `#${symbolId}`,
          },
        },
      ],
    })

    this.iconSymbols = Array.from(iconSymbolNodes).reduce((acc, symbol) => {
      const name = symbol.id.replace(iconPrefix, '')
      acc[name] = createSvgIconConfig(symbol.id)
      return acc
    }, {})
    this.cachedIcons = {}

    return this.iconSymbols
  }

  /**
   * Create and SVG or font icon.
   * Simple string concatenation instead of DOM.create because:
   *  - we don't need the perks of having icons be DOM objects at this stage
   *  - it forces the icon to be appended using innerHTML which helps svg render
   * @param  {String} name - icon name
   * @param  {Function} config - dom element config object
   * @return {String} icon markup
   */
  icon(name, config) {
    if (!name) {
      return
    }

    const cacheKey = `${name}?${new URLSearchParams(config).toString()}`

    if (this.cachedIcons?.[cacheKey]) {
      return this.cachedIcons[cacheKey]
    }

    const iconConfig = this.icons[name]

    if (iconConfig) {
      if (config) {
        const mergedConfig = merge(iconConfig, config)

        this.cachedIcons[cacheKey] = dom.create(mergedConfig).outerHTML

        return this.cachedIcons[cacheKey]
      }

      this.cachedIcons[cacheKey] = dom.create(iconConfig).outerHTML
      return this.cachedIcons[cacheKey]
    }

    return iconFontTemplates[dom.options.iconFont]?.(name) || name
  }

  /**
   * JS Object to DOM attributes
   * @param  {Object} elem    element config object
   * @param  {Object} element DOM element we are building
   * @param  {Boolean} isPreview
   * @return {void}
   */
  processAttrs(elem, element, isPreview) {
    const { attrs = {} } = elem

    if (!isPreview && !attrs.name && attrs.name !== null && this.isInput(elem.tag)) {
      const name = getName(elem)
      if (name) {
        element.setAttribute('name', name)
      }
    }

    // Set element attributes
    for (const attr of Object.keys(attrs)) {
      const safeAttrName = h.safeAttrName(attr)

      const value = this.processAttrValue(attrs[attr])

      if (value !== false) {
        element.setAttribute(safeAttrName, value)
      }
    }
  }

  processAttrValue(valueArg) {
    if (typeof valueArg === 'function') {
      return valueArg()
    }

    if (typeof valueArg === 'boolean') {
      if (valueArg) {
        return ''
      }
      return valueArg
    }

    let value = valueArg || ''
    if (Array.isArray(value)) {
      if (typeof value[0] === 'object') {
        const selected = value.filter(t => t.selected === true)
        value = selected.length ? selected[0].value : value[0].value
      } else {
        value = value.join(' ')
      }
    }

    return value
  }

  /**
   * Hide or show an Array or HTMLCollection of elements
   * @param  {Array} elems
   * @param  {String} term  match textContent to this term
   * @return {Array}        filtered elements
   */
  toggleElementsByStr = (elems, term) => {
    const filteredElems = []
    const containsTextCb = (elem, contains) => {
      if (contains) {
        elem.style.display = 'block'
        filteredElems.push(elem)
      } else {
        elem.style.display = 'none'
      }
    }

    dom.elementsContainText(elems, term, containsTextCb)

    return filteredElems
  }

  elementsContainText = (collection, term, cb) => {
    const elementsContainingText = []
    forEach(collection, elem => {
      const txt = elem.textContent.toLowerCase()
      const contains = txt.indexOf(term.toLowerCase()) !== -1
      cb?.(elem, contains)
      contains && elementsContainingText.push(elem)
    })
    return elementsContainingText
  }

  generateOption = ({ type = 'option', label, value, i = 0, selected }) => {
    const isOption = type === 'option'
    return {
      tag: isOption ? 'option' : 'input',
      attrs: {
        type,
        value: value || `${type}-${i}`,
        [type === 'option' ? 'selected' : 'checked']: selected || !i,
      },
      config: {
        label:
          label ||
          i18n.get('labelCount', {
            label: i18n.get('option'),
            count: i,
          }),
      },
    }
  }

  /**
   * Extend Array of option config objects
   * @param  {Array} options
   * @param  {Object} elem element config object
   * @param  {Boolean} isPreview
   * @return {Array} option config objects
   */
  processOptions(options, elem, isPreview) {
    const { action, attrs } = elem
    const fieldType = attrs.type || elem.tag
    const id = attrs.id || elem.id

    const optionMap = (option, i) => {
      const { label, ...rest } = option
      const defaultInput = () => {
        const input = {
          tag: 'input',
          attrs: {
            name: id,
            type: fieldType,
            value: option.value || '',
            id: `${id}-${i}`,
            ...rest,
          },
          action,
        }
        const optionLabel = {
          tag: 'label',
          attrs: {
            for: `${id}-${i}`,
          },
          children: option.label,
        }
        const inputWrap = {
          children: [input, optionLabel],
          className: [`f-${fieldType}`],
        }

        if (elem.attrs.className) {
          elem.config.inputWrap = elem.attrs.className
        }

        if (elem.config.inline) {
          inputWrap.className.push(`f-${fieldType}-inline`)
        }

        if (option.selected) {
          input.attrs.checked = true
        }

        if (isPreview) {
          optionLabel.attrs.contenteditable = true
        }

        return inputWrap
      }

      const optionMarkup = {
        select: () => {
          const defaultAttrs = option.attrs || option
          const mergedOption = { attrs: defaultAttrs, ...option, ...defaultAttrs }
          const { label, checked, selected, attrs } = mergedOption
          return {
            tag: 'option',
            attrs: { ...attrs, selected: !!(checked || selected) },
            children: label,
          }
        },
        button: option => {
          const { type, label, className, id } = option
          return {
            ...elem,
            attrs: {
              type,
            },
            className,
            id: id || uuid(),
            options: undefined,
            children: label,
            action: elem.action,
          }
        },
        checkbox: defaultInput,
        radio: defaultInput,
      }

      return optionMarkup[fieldType]?.(option)
    }

    const mappedOptions = options.map(optionMap)

    return mappedOptions
  }

  /**
   * Checks if there is a closing tag, if so it can hold content
   * @param  {Object} element DOM element
   * @return {Boolean} holdsContent
   */
  holdsContent(element) {
    return element.outerHTML.indexOf('/') !== -1
  }

  /**
   * Is this a textarea, select or other block input
   * also isContentEditable
   * @param  {Object}  element
   * @return {Boolean}
   */
  isBlockInput(element) {
    return !this.isInput(element) && this.holdsContent(element)
  }

  /**
   * Determine if an element is an input field
   * @param  {String|Object} tag tagName or DOM element
   * @return {Boolean} isInput
   */
  isInput(tagArg) {
    let tag = tagArg
    if (typeof tag !== 'string') {
      tag = tag.tagName
    }
    return inputTags.has(tag)
  }

  /**
   * Converts escaped HTML into usable HTML
   * @param  {String} html escaped HTML
   * @return {String}      parsed HTML
   */
  parsedHtml(html) {
    const escapeElement = document.createElement('textarea')
    escapeElement.innerHTML = html
    return escapeElement.textContent
  }

  /**
   * Test if label should be display before or after an element
   * @param  {Object} elem config
   * @return {Boolean} labelAfter
   */
  labelAfter(elem) {
    const type = h.get(elem, 'attrs.type')
    const labelAfter = h.get(elem, 'config.labelAfter')
    const isCB = type === 'checkbox' || type === 'radio'
    return labelAfter !== undefined ? labelAfter : isCB
  }

  requiredMark = () => ({
    tag: 'span',
    className: 'text-error',
    children: '*',
  })

  /**
   * Generate a label
   * @param  {Object} elem config object
   * @param  {String} fMap map to label's value in formData
   * @return {Object}      config object
   */
  label(elem, fMap) {
    const required = h.get(elem, 'attrs.required')
    let {
      config: { label: labelText = '' },
    } = elem
    const { id: elemId, attrs } = elem
    if (typeof labelText === 'function') {
      labelText = labelText()
    }
    const fieldLabel = {
      tag: 'label',
      attrs: {
        for: elemId || attrs?.id,
      },
      className: [],
      children: [labelText, required && this.requiredMark()],
      action: {},
    }

    if (fMap) {
      // for attribute will prevent label focus
      fieldLabel.attrs.for = undefined
      fieldLabel.attrs.contenteditable = true
      fieldLabel.fMap = fMap
    }

    return fieldLabel
  }

  /**
   * Determine content type
   * @param  {Node | String | Array | Object} content
   * @return {String}
   */
  childType(content) {
    if (content === undefined) {
      return content
    }

    return [
      ['array', content => Array.isArray(content)],
      ['node', content => content instanceof window.Node || content instanceof window.HTMLElement],
      ['component', () => content?.dom],
      [typeof content, () => true],
    ].find(typeCondition => typeCondition[1](content))[0]
  }

  /**
   * Get the computed style for DOM element
   * @param  {Object}  elem     dom element
   * @param  {Boolean} property style eg. width, height, opacity
   * @return {String}           computed style
   */
  getStyle(elem, property = false) {
    let style
    if (window.getComputedStyle) {
      style = window.getComputedStyle(elem, null)
    } else if (elem.currentStyle) {
      style = elem.currentStyle
    }

    return property ? style[property] : style
  }

  /**
   * Retrieves an element by config object, string id,
   * or existing reference
   * @param  {Object|String|Node} elem
   * @return {Object}             DOM element
   */
  getElement(elem) {
    const getElement = {
      node: () => elem,
      object: () => document.getElementById(elem.id),
      string: () => document.getElementById(elem),
    }
    const type = this.childType(elem)
    const element = getElement[type]()

    return element
  }

  /**
   * Util to remove contents of DOM Object
   * @param  {Object} elem
   * @return {Object} element with its children removed
   */
  empty(elem) {
    while (elem.firstChild) {
      this.remove(elem.firstChild)
    }
    return elem
  }

  /**
   * Remove elements without f children
   * @param  {Object} element DOM element
   * @return {Object} formData
   */
  removeEmpty = element => {
    const parent = element.parentElement
    const type = componentType(element)
    const children = parent.getElementsByClassName(`formeo-${type}`)
    this.remove(element)
    if (!children.length) {
      if (!this.isStage(parent)) {
        return this.removeEmpty(parent)
      }
      return this.emptyClass(parent)
    }
  }

  /**
   * Removes element from DOM and data
   * @param  {Object} elem
   * @return  {Object} parent element
   */
  remove(elem) {
    const type = componentType(elem)
    if (type) {
      return Components.remove(`${type}s.${elem.id}`)
    }

    return elem.parentElement.removeChild(elem)
  }

  /**
   * Removes a class or classes from nodeList
   *
   * @param  {NodeList|Node} nodeList
   * @param  {String | Array} className
   */
  removeClasses(nodeList, className) {
    const removeClass = {
      string: elem => elem.classList.remove(className),
      array: elem => {
        for (const name of className) {
          elem.classList.remove(name)
        }
      },
    }
    removeClass.object = removeClass.string // handles regex map
    h.forEach(nodeList, removeClass[this.childType(className)])
  }

  /**
   * Adds a class or classes from nodeList
   *
   * @param  {NodeList} nodeList
   * @param  {String | Array} className
   */
  addClasses(nodeList, className) {
    const addClass = {
      string: elem => elem.classList.add(className),
      array: elem => {
        for (const name of className) {
          elem.classList.add(name)
        }
      },
    }
    h.forEach(nodeList, addClass[this.childType(className)])
  }

  /**
   * Wrap content in a formGroup
   * @param  {Object|Array|String} content
   * @param  {String} className
   * @return {Object} formGroup config
   */
  formGroup(content, className = '') {
    return {
      className: ['f-field-group', className],
      children: content,
    }
  }

  /**
   * Returns the {x, y} coordinates for the
   * center of a given element
   * @param  {DOM} element
   * @return {Object}      {x,y} coordinates
   */
  coords(element) {
    const elemPosition = element.getBoundingClientRect()
    const bodyRect = document.body.getBoundingClientRect()

    return {
      pageX: elemPosition.left + elemPosition.width / 2,
      pageY: elemPosition.top - bodyRect.top - elemPosition.height / 2,
    }
  }

  /**
   * Removes all fields and resets a stage
   * @param  {DOM} stage DOM element
   */
  clearStage(stage) {
    stage.classList.add('removing-all-fields')

    const resetStage = () => {
      // Empty the data register for stage
      // and everything below it.
      dom.empty(stage)
      stage.classList.remove('removing-all-fields')
      // data.save()
      dom.emptyClass(stage)
      animate.slideDown(stage, 300)
    }

    // var markEmptyArray = [];

    // if (opts.prepend) {
    //   markEmptyArray.push(true);
    // }

    // if (opts.append) {
    //   markEmptyArray.push(true);
    // }

    // if (!markEmptyArray.some(elem => elem === true)) {
    // stage.classList.add('empty-stages');
    // }

    animate.slideUp(stage, 600, resetStage)
    // animate.slideUp(stage, 2000);
  }

  /**
   * Toggles a sortables `disabled` option.
   * @param  {Object} elem DOM element
   * @param  {Boolean} state
   */
  toggleSortable(elem, stateArg) {
    let state = stateArg
    const fType = componentType(elem)
    if (!fType) {
      return
    }
    const pFtype = componentType(elem.parentElement)
    const sortable = dom[fType].get(elem.id).sortable
    if (!state) {
      state = !sortable.option('disabled')
    }
    sortable.option('disabled', state)
    if (pFtype && ['rows', 'columns', 'stages'].includes(pFtype)) {
      this.toggleSortable(elem.parentElement, state)
    }
  }

  /**
   * Apply empty class to element if does not have children
   * @param  {Object} elem
   */
  emptyClass(elem) {
    const children = elem.getElementsByClassName(CHILD_CLASSNAME_MAP.get(elem.classList.item(0)))
    elem.classList.toggle('empty', !children.length)
  }

  btnTemplate = ({ title = '', ...rest }) => ({
    tag: 'button',
    attrs: {
      type: 'button',
      title,
    },
    ...rest,
  })

  isControls = node => componentType(node) === CONTROL_GROUP_CLASSNAME
  isStage = node => componentType(node) === STAGE_CLASSNAME
  isRow = node => componentType(node) === ROW_CLASSNAME
  isColumn = node => componentType(node) === COLUMN_CLASSNAME
  isField = node => componentType(node) === FIELD_CLASSNAME
  asComponent = elem => Components[`${componentType(elem)}s`].get(elem.id)

  isDOMElement(variable) {
    return (
      variable instanceof Element ||
      variable instanceof HTMLElement ||
      (variable && typeof variable === 'object' && variable.nodeType === 1 && typeof variable.nodeName === 'string')
    )
  }
}

export const dom = new DOM()

export default dom
