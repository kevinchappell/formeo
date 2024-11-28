import { uuid } from '../common/utils/index.mjs'
import events from '../common/events.js'
import { get, set } from '../common/utils/object.mjs'
import isEqual from 'lodash/isEqual.js'
import { splitAddress } from '../common/utils/string.mjs'

const getChangeType = (oldVal, newVal) => {
  if (oldVal === undefined) {
    return 'added'
  }
  if (newVal === undefined) {
    return 'removed'
  }
  if (isEqual(oldVal, newVal)) {
    return 'unchanged'
  }
  return 'changed'
}

export default class Data {
  constructor(name, data = Object.create(null)) {
    this.name = name
    this.data = data
    this.dataPath = ''
  }
  get size() {
    return Object.keys(this.data).length
  }
  get js() {
    return this.data
  }
  get json() {
    return this.data
  }
  toJSON = (data, format) => JSON.stringify(data, null, format)
  get = path => get(this.data, path)
  set(path, newVal) {
    const oldVal = get(this.data, path)

    const data = set(this.data, path, newVal)

    const callbackPath = Array.isArray(path) ? path.join('.') : path
    const callBackGroups = Object.keys(this.setCallbacks).filter(setKey => new RegExp(setKey).test(callbackPath))
    const cbArgs = { newVal, oldVal, path }
    for (const cbGroup of callBackGroups) {
      for (const cb of this.setCallbacks[cbGroup]) {
        cb(cbArgs)
      }
    }

    if (!this.disableEvents) {
      const evtData = {
        entity: this,
        dataPath: this.dataPath.replace(/\.+$/, ''),
        changePath: this.dataPath + path,
        value: newVal,
        data,
        changeType: getChangeType(oldVal, newVal),
        src: this.dom,
      }
      if (oldVal) {
        evtData.previousValue = oldVal
      }

      events.formeoUpdated(evtData)
    }

    return data
  }
  addSetCallback(path, cb) {
    if (this.setCallbacks[path]) {
      this.setCallbacks[path].push(cb)
    } else {
      this.setCallbacks[path] = [cb]
    }
  }
  removeSetCallback(path, cb) {
    this.setCallbacks[path] = this.setCallbacks[path].filter(setCb => setCb !== cb)
  }
  add = (id, data = Object.create(null)) => {
    const { id: dataId } = data
    const elemId = id || dataId || uuid()
    return this.set(elemId, data)
  }
  remove = path => {
    const delPath = splitAddress(path)
    const delItem = delPath.pop()
    const parent = this.get(delPath)
    if (Array.isArray(parent)) {
      parent.splice(Number(delItem), 1)
    } else if (parent) {
      delete parent[delItem]
    }
    return parent
  }
  empty() {
    this.data = Object.create(null)
  }
  getData = () => {
    return Object.entries(this.data).reduce((acc, [key, val]) => {
      acc[key] = val?.data ? val.getData() : val
      return acc
    }, {})
  }
  setCallbacks = {}
  configVal = Object.create(null)
}
