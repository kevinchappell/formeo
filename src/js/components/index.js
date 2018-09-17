import Data from './data'
import { uuid, sessionStorage } from '../common/utils'
import './controls'

import StagesData from './stages'
import RowsData from './rows'
import ColumnsData from './columns'
import FieldsData from './fields'
import { SESSION_FORMDATA_KEY } from '../constants'

export const Stages = StagesData
export const Rows = RowsData
export const Columns = ColumnsData
export const Fields = FieldsData

const DEFAULT_DATA = {
  id: uuid(),
}

export class Components extends Data {
  constructor(opts) {
    super('components')
    this.opts = opts
    this.data = DEFAULT_DATA
    this.disableEvents = true
    this.stages = Stages
    this.rows = Rows
    this.columns = Columns
    this.fields = Fields
  }

  sessionFormData = () => {
    if (this.opts && this.opts.sessionStorage) {
      return sessionStorage.get(SESSION_FORMDATA_KEY)
    }
  }

  load = (formData, opts = Object.create(null)) => {
    this.opts = opts
    const { stages = { [uuid()]: {} }, rows, columns, fields, id = uuid() } = Object.assign(
      {},
      this.sessionFormData(),
      formData
    )
    this.set('id', id)
    this.add('stages', Stages.load(stages))
    this.add('rows', Rows.load(rows))
    this.add('columns', Columns.load(columns))
    this.add('fields', Fields.load(fields))

    Object.values(this.get('stages')).forEach(stage => stage.loadChildren())

    return this.data
  }

  get json() {
    return window.JSON.stringify(this.formData)
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
}

const components = new Components()

export default components