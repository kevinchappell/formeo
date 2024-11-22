import {
  COMPONENT_INDEX_TYPES,
  COMPONENT_TYPE_CLASSNAMES_REGEXP,
  COMPONENT_TYPE_CLASSNAMES_LOOKUP,
  CHILD_TYPE_MAP,
  ANIMATION_SPEED_SLOW,
  ANIMATION_SPEED_BASE,
  DEFAULT_FORMDATA,
  INTERNAL_COMPONENT_INDEX_TYPES,
  COMPONENT_INDEX_TYPE_MAP,
  CHILD_TYPE_INDEX_MAP,
} from '../../constants.js'
import mergeWith from 'lodash/mergeWith.js'

const uuidv4 = () => crypto.randomUUID()

/**
 * Match the values from a string or array against a str.
 * @param  {String} str    String we are searching
 * @param  {String|Array}  filter String or array of values to match
 * @return {Boolean}        [description]
 */
export const match = (str = '', filter) => {
  if (!filter) {
    console.warn('utils.match missing argument 2.')
    return false
  }
  const matchOperators = /[|\\{}()[\]^*$+?.]/g
  let filterArray = typeof filter === 'string' ? [filter] : filter
  filterArray = filterArray.map(filterStr => {
    return filterStr === '*' ? '' : filterStr.replace(matchOperators, '\\$&')
  })

  let isMatch = true
  if (filterArray.length) {
    isMatch = !new RegExp(filterArray.join('|'), 'i').exec(str)
  }

  return isMatch
}

/**
 * Removes a value from an array
 * @param  {Array} arr
 * @param  {String|Number} val
 */
export const remove = (arr, val) => {
  const index = arr.indexOf(val)

  if (index !== -1) {
    arr.splice(index, 1)
  }
}

/**
 * Find the closest parent by class
 * @param  {Object} el  DOM element
 * @param  {String} cls class
 * @return {Object}     DOM Element
 */
export const closest = (element, cls) => {
  const className = cls.replace('.', '')
  let current = element.parentElement
  while (current && !current.classList.contains(className)) {
    current = current.parentElement
  }
  return current
}

/**
 * Find the closest parent by class
 * @param  {Object} el  DOM element
 * @param  {String} cls class
 * @return {Object}     DOM Element
 */
export const closestFtype = el => {
  while (el) {
    el = el.parentElement
    if (!el || componentType(el)) {
      break
    }
  }
  return el
}

/**
 * Determine component type
 * @param  {NodeElement} node
 * @return {String}     component type or undefined
 */
export const componentType = node => {
  const classMatch = node.className?.match(COMPONENT_TYPE_CLASSNAMES_REGEXP)
  return classMatch && COMPONENT_TYPE_CLASSNAMES_LOOKUP[classMatch[0]]
}

/**
 * Remove duplicates from an array of elements
 * @param  {Array} array with possible duplicates
 * @return {Array} array with only unique values
 */
export const unique = array => Array.from(new Set(array))

// Get or generate a uuid
export const uuid = elem => {
  let id
  if (elem) {
    const { attrs = {} } = elem
    id = attrs.id || elem.id || uuidv4()
    elem.id = id
  } else {
    id = uuidv4()
  }
  return id
}

/**
 * Merge one object with another.
 * This can be expensive, use as little as possible.
 * @param  {Object} obj1
 * @param  {Object} obj2
 * @return {Object}      merged object
 */
export const merge = (obj1, obj2) => {
  const customizer = (objValue, srcValue) => {
    if (Array.isArray(objValue)) {
      if (srcValue !== undefined && srcValue !== null) {
        return unique(objValue.concat(srcValue))
      }

      return srcValue
    }

    if (Array.isArray(srcValue)) {
      if (objValue !== undefined && objValue !== null) {
        return unique(srcValue.concat(objValue))
      }

      return srcValue
    }
  }
  return mergeWith({}, obj1, obj2, customizer)
}

export const clone = obj => {
  let copy

  const isPromise = obj instanceof Promise
  const isObject = typeof obj === 'object'

  // Handle the 4 simple types, and null or undefined
  if (obj === null || !isObject || isPromise) {
    return obj
  }

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date()
    copy.setTime(obj.getTime())
    return copy
  }

  // Handle Array
  if (Array.isArray(obj)) {
    copy = []
    for (let i = 0, len = obj.length; i < len; i++) {
      copy[i] = clone(obj[i])
    }
    return copy
  }

  // Handle Object
  if (obj instanceof Object) {
    copy = {}
    for (const attr in obj) {
      if (Object.hasOwn(obj, attr)) {
        copy[attr] = clone(obj[attr])
      }
    }

    return copy
  }

  throw new Error('Unable to copy Object, type not supported.')
}

export const percent = (val, total) => (val / total) * 100

export const numToPercent = num => `${num.toString()}%`

export const numberBetween = (num, min, max) => num > min && num < max

/**
 * Determine if an element was clicked or dragged. Handles firefox issue
 * where on dragstart and onclick both fire
 * @param {Number} x
 * @param {Number} y
 * @param {Object} position
 * @param {Number} button
 * @return {Boolean} clicked
 */
export const clicked = (x, y, position, button) => {
  const xMin = position.x - 5
  const xMax = position.x + 5
  const yMin = position.y - 5
  const yMax = position.y + 5
  const xOK = numberBetween(x, xMin, xMax)
  const yOK = numberBetween(y, yMin, yMax)

  return xOK && yOK && button !== 2
}

/**
 * Cache results of expensive functions
 * @param  {Function} fn
 * @param  {Function} resolver
 * @return {String|Object} memoized
 */
export const memoize = (fn, resolver) => {
  if (typeof fn !== 'function' || (resolver && typeof resolver !== 'function')) {
    throw new TypeError('memoize: First argument must be a function')
  }
  const memoized = (...args) => {
    const key = resolver ? resolver.apply(memoized, args) : args[0]
    const cache = memoized.cache

    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn.apply(memoized, args)
    memoized.cache = cache.set(key, result)
    return result
  }
  memoized.cache = new Map()
  return memoized
}

export const sessionStorage = Object.create(null, {
  get: {
    value: key => {
      const itemValue = window.sessionStorage?.getItem(key)
      try {
        return JSON.parse(itemValue)
      } catch (_err) {
        return itemValue
      }
    },
  },
  set: {
    value: (key, itemValue) => {
      try {
        return window.sessionStorage?.setItem(key, JSON.stringify(itemValue))
      } catch (error) {
        console.error(error)
      }
    },
  },
})

/**
 * Escape markup so it can be displayed rather than rendered
 * @param  {String} html markup
 * @return {String}      escaped html
 */
export const escapeHtml = html => {
  const escapeElement = document.createElement('textarea')
  escapeElement.textContent = html
  return escapeElement.innerHTML
}

const componentIndexRegex = new RegExp(`^${COMPONENT_INDEX_TYPES.join('|')}.`)

/**
 * Test if a string is a formeo address
 * @param {String} str
 */
export const isAddress = str => {
  return componentIndexRegex.test(str)
}

/**
 * Test if a string is an external address
 * @param {String} str
 */
export const isExternalAddress = str => {
  return /^external./.test(str)
}

const internalComponentIndexRegex = new RegExp(`^${INTERNAL_COMPONENT_INDEX_TYPES.join('|')}.`)

/**
 * Checks if a given string is an internal address.
 *
 * This function uses a regular expression to test if the input string matches
 * any of the internal component index types defined in the `INTERNAL_COMPONENT_INDEX_TYPES` array.
 *
 * @param {string} str - The string to be tested.
 * @returns {boolean} - Returns `true` if the string matches an internal address pattern, otherwise `false`.
 */
export const isInternalAddress = str => {
  return internalComponentIndexRegex.test(str)
}

/**
 * Retrieves the component type based on the provided index type.
 *
 * @param {string} indexType - The type of the index to look up.
 * @returns {string|undefined} The component type corresponding to the index type, or undefined if not found.
 */
export const getIndexComponentType = indexType => COMPONENT_INDEX_TYPE_MAP.get(indexType)

/**
 * Tests if key is for a boolean property
 * assumes property starts with is or has
 * @param {String} key
 */
export const isBoolKey = key => /^is|^has/.test(key)

export const typeIsChildOf = (childType, parentType) => CHILD_TYPE_MAP.get(parentType) === childType

/**
 * Creates a throttled function that only invokes the provided callback at most once per every limit milliseconds.
 *
 * @param {Function} callback - The function to throttle.
 * @param {number} limit - The number of milliseconds to throttle invocations to.
 * @returns {Function} - Returns the new throttled function.
 */
export function throttle(callback, limit = ANIMATION_SPEED_SLOW) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      callback.apply(this, args)
    }
  }
}

/**
 * Creates a debounced function that delays invoking the provided function until after the specified delay.
 *
 * @param {Function} fn - The function to debounce.
 * @param {number} [delay=ANIMATION_SPEED_BASE] - The number of milliseconds to delay invocation.
 * @returns {Function} - A new debounced function.
 */
export function debounce(fn, delay = ANIMATION_SPEED_BASE) {
  let timeoutID
  return function (...args) {
    if (timeoutID) {
      clearTimeout(timeoutID)
    }
    timeoutID = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function identity(value) {
  return value
}

export function noop() {
  // Do nothing
}

/**
 * Parses the provided data argument. If the argument is a string, it attempts to parse it as JSON.
 * If the parsing fails, it logs an error and returns an empty object.
 * If the argument is not a string, it returns the argument as is.
 *
 * @param {string|Object} dataArg - The data to be parsed. Can be a JSON string or an object.
 * @returns {Object} - The parsed object or the original object if the input was not a string.
 */
export function parseData(data = Object.create(null)) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      console.error('Invalid JSON string provided:', e)
      return Object.create(null)
    }
  }

  return data
}

export const cleanFormData = formData => (formData ? clone(parseData(formData)) : DEFAULT_FORMDATA())
/**
 * Builds a flat data structure from a nested data object.
 *
 * @param {Object} data - The nested data object containing components.
 * @param {string} componentId - The ID of the component to start building the flat structure from.
 * @param {string} componentType - The type of the component to start building the flat structure from.
 * @param {Object} [result={}] - The result object to store the flat data structure.
 * @returns {Object} The flat data structure with component IDs as keys and component data as values.
 */
export function buildFlatDataStructure(data, componentId, componentType, result = {}) {
  if (!componentId || !data[componentType][componentId]) {
    return result
  }

  // Add current component to result
  const key = `${componentType}.${componentId}`
  result[key] = data[componentType][componentId]

  // Get the child type for current component
  const childType = CHILD_TYPE_INDEX_MAP.get(componentType)

  if (childType) {
    const childrenIds = data[componentType][componentId].data?.children || []

    // Recursively process each child
    for (const childId of childrenIds) {
      buildFlatDataStructure(data, childId, childType, result)
    }
  }

  return result
}
