import { unique } from './utils/index.mjs'
import { get } from './utils/object.mjs'

/**
 * Tests if is whole number. returns false if n is Float
 * @param {String|Number} n
 */
export const isInt = n => Number.isInteger(Number(n))

/**
 * Finds the index of an element in its parent
 * @param {NodeElement} node
 */
export const indexOfNode = node => {
  let index = 0
  let currentNode = node
  while (currentNode.previousElementSibling) {
    currentNode = currentNode.previousElementSibling
    index++
  }
  return index
}

/**
 * Orders an array of objects by specific attributes
 * @param  {Array}  elements  Array of element objects
 * @param  {Array}  order     array of keys to order objects by
 * @param  {String} path      string path to property to order by
 * @return {Array}            Ordered Array of Element Objects
 */
export const orderObjectsBy = (elements, order, path) => {
  // OR operator for path
  const splitPath = path.split('||')
  const newOrder = unique(order)
    .map(key =>
      elements.find(elem => {
        const newPath = splitPath.find(p => !!get(elem, p))
        return newPath && get(elem, newPath) === key
      }),
    )
    .filter(Boolean)
  const orderedElements = newOrder.concat(elements)

  return unique(orderedElements)
}

/**
 * @param {Array|NodeList} arr to be iterated
 * @param {Function} cb
 * @param {Context}
 */
export const forEach = (arr, cb, scope) => {
  for (let i = 0; i < arr.length; i++) {
    cb.call(scope, arr[i], i)
  }
}

/**
 * @param {Array|NodeList} arr to be iterated
 * @param {Function} cb
 * @return {Array} newArray
 */
export const map = (arr, cb) => {
  const newArray = []
  forEach(arr, (elem, i) => newArray.push(cb(elem, i)))

  return newArray
}

const sanitizedAttributeNames = {}

/**
 * Sanitizes an attribute name to ensure it is valid for use in HTML.
 *
 * @param {string} name - The attribute name to sanitize.
 * @returns {string} - The sanitized attribute name.
 */
export const safeAttrName = name => {
  const attributeMap = {
    className: 'class',
  }

  if (sanitizedAttributeNames[name]) {
    return sanitizedAttributeNames[name]
  }

  const attributeName = attributeMap[name] || name
  const sanitizedAttributeName = attributeName.replace(/^\d+/, '').replace(/[^a-zA-Z0-9-:]/g, '')

  sanitizedAttributeNames[name] = sanitizedAttributeName

  return sanitizedAttributeName
}

export const capitalize = str => str.replace(/\b\w/g, m => m.toUpperCase())

// Expensive recursive object copy
export const copyObj = obj => window.JSON.parse(window.JSON.stringify(obj))

// subtract the contents of 1 array from another
export const subtract = (arr, from) => from.filter(a => !~arr.indexOf(a))

export const isIE = () => window.navigator.userAgent.indexOf('MSIE ') !== -1

export const helpers = {
  capitalize,
  safeAttrName,
  forEach,
  copyObj,

  // basic map that can be used on nodeList
  map,
  subtract,
  indexOfNode,
  isInt,
  get,

  orderObjectsBy,
  isIE,
}

export default helpers
