import Data from './data.js'
import { sessionStorage, isAddress, parseData, clone, buildFlatDataStructure } from '../common/utils/index.mjs'
import ControlsData from './controls/index.js'

import StagesData from './stages/index.js'
import RowsData from './rows/index.js'
import ColumnsData from './columns/index.js'
import FieldsData from './fields/index.js'
import ExternalsData from './externals.js'
import { COMPONENT_INDEX_TYPE_MAP, DEFAULT_FORMDATA, SESSION_FORMDATA_KEY, version } from '../constants.js'
import { splitAddress } from '../common/utils/string.mjs'

export const Stages = StagesData
export const Rows = RowsData
export const Columns = ColumnsData
export const Fields = FieldsData
export const Controls = ControlsData
export const Externals = ExternalsData

const getFormData = (formData, useSessionStorage = false) => {
  if (formData) {
    return clone(parseData(formData))
  }
  if (useSessionStorage) {
    return sessionStorage.get(SESSION_FORMDATA_KEY) || DEFAULT_FORMDATA()
  }

  return DEFAULT_FORMDATA()
}

export class Components extends Data {
  constructor() {
    super('components')
    this.disableEvents = true
    this.stages = Stages
    this.rows = Rows
    this.columns = Columns
    this.fields = Fields
    this.controls = Controls
    this.externals = Externals
  }

  load = (formDataArg, opts) => {
    this.empty()
    const formData = getFormData(formDataArg, opts.sessionStorage)

    this.opts = opts

    this.set('id', formData.id)
    this.add('stages', Stages.load(formData.stages))
    this.add('rows', Rows.load(formData.rows))
    this.add('columns', Columns.load(formData.columns))
    this.add('fields', Fields.load(formData.fields))
    this.add('externals', Externals.load(this.opts.external))

    for (const stage of Object.values(this.get('stages'))) {
      stage.loadChildren()
    }

    return this.data
  }

  /**
   * flattens the component tree
   * @returns {Object} where keys contains component type
   */
  flatList() {
    const result = {}

    for (const stageId of Object.keys(this.data.stages)) {
      buildFlatDataStructure(this.data, stageId, 'stages', result)
    }

    return result
  }

  getChildData = ({ type, id }) => {
    const component = this.get(type, id)
    if (component) {
      return component.getData()
    }
  }

  get json() {
    return window.JSON.stringify({
      $schema: `https://cdn.jsdelivr.net/npm/formeo@${version}/dist/formData_schema.json`,
      ...this.formData,
    })
  }

  get formData() {
    return {
      id: this.get('id'),
      stages: StagesData.getData(),
      rows: RowsData.getData(),
      columns: ColumnsData.getData(),
      fields: FieldsData.getData(),
    }
  }

  set config(config) {
    const { stages, rows, columns, fields } = config
    Stages.config = stages
    Rows.config = rows
    Columns.config = columns
    Fields.config = fields
  }

  getIndex(type) {
    return this[type] || this[COMPONENT_INDEX_TYPE_MAP.get(type)]
  }

  /**
   * call `set` on a component in memory
   */
  setAddress(fullAddress, value) {
    if (!isAddress(fullAddress)) {
      return
    }
    const [type, id, ...localAddress] = Array.isArray(fullAddress) ? fullAddress : splitAddress(fullAddress)
    const componentIndex = this.getIndex(type)
    const component = componentIndex.get(id)

    component?.set(localAddress, value)

    return component
  }

  /**
   * Fetch a component from memory by address
   */
  getAddress(fullAddress) {
    if (!isAddress(fullAddress)) {
      return
    }
    const [type, id, ...localAddress] = Array.isArray(fullAddress) ? fullAddress : splitAddress(fullAddress)
    const componentIndex = this.getIndex(type)
    const component = componentIndex.get(id)

    if (localAddress.length && !component) {
      return
    }

    return localAddress.length ? component.get(localAddress) : component
  }
}

const components = new Components()

export default components
