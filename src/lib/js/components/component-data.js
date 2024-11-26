import Data from './data.js'
import { uuid, clone, merge, parseData } from '../common/utils/index.mjs'
import { get } from '../common/utils/object.mjs'

export default class ComponentData extends Data {
  load = dataArg => {
    const data = parseData(dataArg)
    this.empty()
    for (const [key, val] of Object.entries(data)) {
      this.add(key, val)
    }
    return this.data
  }

  /**
   * Retrieves data from the specified path or adds new data if no path is provided.
   *
   * @param {string} [path] - The path to retrieve data from. If not provided, new data will be added.
   * @returns {*} The data retrieved from the specified path or the result of adding new data.
   */
  get = path => (path ? get(this.data, path) : this.add())

  /**
   * Adds a new component with the given id and data.
   *
   * @param {string} id - The unique identifier for the component. If not provided, a new UUID will be generated.
   * @param {Object} [data=Object.create(null)] - The data to initialize the component with.
   * @returns {Object} The newly created component.
   */
  add = (id, data = Object.create(null)) => {
    const elemId = id || uuid()
    const component = this.Component({ ...data, id: elemId })
    this.data[elemId] = component
    // this.set(elemId, component)
    this.active = component

    return component
  }

  /**
   * removes a component form the index
   * @param {String|Array} componentId
   */
  remove = componentId => {
    if (Array.isArray(componentId)) {
      for (const id of componentId) {
        this.get(id).remove()
      }
    } else {
      this.get(componentId).remove()
    }

    return this.data
  }

  /**
   * Deletes a component from the data object.
   *
   * @param {string} componentId - The ID of the component to delete.
   * @returns {string} The ID of the deleted component.
   */
  delete = componentId => {
    delete this.data[componentId]
    return componentId
  }

  /**
   * Clears all instances from the store
   * @param {Object} evt
   */
  clearAll = (isAnimated = true) => {
    const promises = Object.values(this.data).map(component => component.empty(isAnimated))
    return Promise.all(promises)
  }

  /**
   * Extends the configVal for a component type,
   * eventually read by Component
   * @return {Object} configVal
   */
  set config(config) {
    this.configVal = merge(this.configVal, clone(config))
  }

  /**
   * Reads configVal for a component type
   * @return {Object} configVal
   */
  get config() {
    return this.configVal
  }

  conditionMap = new Map()
}
