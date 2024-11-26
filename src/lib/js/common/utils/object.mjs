import lodashSet from 'lodash/set.js'
import lodashGet from 'lodash/get.js'

export const get = lodashGet
export const set = lodashSet

/**
 * Empty an objects contents
 * @param  {Object} obj
 * @return {Object} fresh
 */
export const cleanObj = obj => {
  const fresh = { ...obj }
  const typeMap = {
    string: () => '',
    boolean: () => false,
    object: val => cleanObj(val),
  }

  for (const key of Object.keys(obj)) {
    const valType = typeof obj[key]
    if (typeMap[valType]) {
      fresh[key] = typeMap[valType](obj[key])
    }
  }

  return fresh
}

/**
 * Determines if a value should be cloned.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} - Returns `true` if the value is an object and not null, otherwise `false`.
 */
export function shouldClone(value) {
  return value !== null && typeof value === 'object'
}

/**
 * Deeply clones an object or array.
 *
 * This function recursively clones all nested objects and arrays within the provided object.
 * If the input is not an object or array, it returns the input as is.
 *
 * @param {Object|Array} obj - The object or array to be deeply cloned.
 * @returns {Object|Array} - A deep clone of the input object or array.
 */
export function deepClone(obj, seen = new WeakMap()) {
  if (!shouldClone(obj)) return obj

  if (seen.has(obj)) {
    return seen.get(obj)
  }

  if (Array.isArray(obj)) {
    const clonedArray = obj.map(item => deepClone(item, seen))
    seen.set(obj, clonedArray)
    return clonedArray
  }

  const clonedObject = {}
  seen.set(obj, clonedObject)

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      clonedObject[key] = deepClone(obj[key], seen)
    }
  }

  return clonedObject
}

/**
 * Merges two action objects. If a key already exists in the target object,
 * converts the value to an array and adds the value of the source object's key to the array.
 *
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns {Object} - The merged object.
 */
export function mergeActions(target, source = {}) {
  const result = { ...target }

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      if (Object.hasOwn(result, key)) {
        if (Array.isArray(result[key])) {
          result[key].push(source[key])
        } else {
          result[key] = [result[key], source[key]]
        }
      } else {
        result[key] = source[key]
      }
    }
  }

  return result
}

/**
 * Converts an array of strings into an object where each string becomes both a key and its value
 * @param {string[]} arr - The input array of strings
 * @returns {Object.<string, string>} An object where each array item is both a key and value
 * @example
 * objectFromStringArray(['foo', 'bar']) // returns { foo: 'foo', bar: 'bar' }
 */
export function objectFromStringArray(arr) {
  return arr.reduce((acc, item) => {
    acc[item] = item
    return acc
  }, {})
}
