import ComponentData from '../component-data.js'
import Field from './field.js'
import Controls from '../controls/index.js'
import { get, set } from '../../common/utils/object.mjs'
import { parseData } from '../../common/utils/index.mjs'

const DEFAULT_CONFIG = {
  actionButtons: {
    buttons: ['move', 'edit', 'clone', 'remove'],
    disabled: [],
  },
  panels: {
    disabled: [],
    attrs: {
      disabled: ['type'],
      hideDisabled: true,
      locked: [],
    },
    order: ['attrs', 'options', 'conditions'],
  },
  label: {
    disableHTML: false,
  },
}

export class Fields extends ComponentData {
  constructor(fieldData) {
    super('fields', fieldData)
    this.config = { all: DEFAULT_CONFIG }
  }
  Component(data) {
    return new Field(data)
  }
  get = path => {
    let found = path && get(this.data, path)
    if (!found) {
      const control = Controls.get(path)
      if (control) {
        found = this.add(null, control.controlData)
      }
    }
    return found
  }

  getData = () => {
    return Object.entries(this.data).reduce((acc, [key, val]) => {
      const { conditions, ...data } = val?.getData() || val

      // if (conditions?.length) {
      //   let hasConditions = true
      //   if (conditions.length === 1) {
      //     const [firstCondition] = conditions
      //     hasConditions = Boolean(firstCondition.if[0].source)
      //   }
      //   if (hasConditions) {
      //     data.conditions = conditions
      //   }
      // }

      acc[key] = data
      return acc
    }, {})
  }

  load = (dataArg = Object.create(null)) => {
    const allFieldData = parseData(dataArg)
    this.empty()

    for (const [key, val] of Object.entries(allFieldData)) {
      const { meta, ...data } = val
      // meta object is only for controls, we want to migrate it out of field data
      // we only need the control id to tie actions back to control definitons
      if (meta?.id) {
        set(data, 'config.controlId', meta?.id)
      }
      this.add(key, data)
    }

    return this.data
  }
}

const fields = new Fields()

export default fields
