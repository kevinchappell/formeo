import i18n from '@draggable/i18n'
import { orderObjectsBy, indexOfNode } from '../../../common/helpers.mjs'
import dom from '../../../common/dom.js'
import animate from '../../../common/animation.js'
import {
  CONDITION_INPUT_ORDER,
  FIELD_INPUT_PROPERTY_MAP,
  OPERATORS,
  INTERNAL_COMPONENT_INDEX_TYPES,
  LOGICAL_OPERATORS,
} from '../../../constants.js'
import events from '../../../common/events.js'
import Components from '../../index.js'
import Autocomplete from '../../autocomplete.mjs'
import {
  isExternalAddress,
  isAddress,
  isBoolKey,
  getIndexComponentType,
  isInternalAddress,
} from '../../../common/utils/index.mjs'
import { toTitleCase } from '../../../common/utils/string.mjs'
import { segmentTypes } from './condition-helpers.mjs'

function orderConditionValues(conditionValues, fieldOrder = CONDITION_INPUT_ORDER) {
  return fieldOrder.reduce((acc, fieldName) => {
    if (conditionValues[fieldName] !== undefined) {
      acc.push([fieldName, conditionValues[fieldName]])
    }
    return acc
  }, [])
}

class ConditionField {
  constructor({ key, value, conditionType }, conditionValues) {
    this.name = key
    this.value = value

    this.values = conditionValues
    // console.log(dom)
    this.dom = this.generateDom({ key, value, conditionType })
  }

  generateDom(args) {
    return segmentTypes[this.name](args, this.values)
  }
}

export class Condition {
  constructor({ conditionValues, conditionType, index }, parent) {
    // this.values = new Map(orderConditionValues(conditionValues))
    this.conditionType = conditionType
    this.index = index
    this.parent = parent
    this.address = `${parent.address}.${conditionType}.${index}`
    this.fields = new Map()
    this.dom = this.generateDom(conditionValues)
  }

  generateDom(conditionValues) {
    const orderedValues = new Map(orderConditionValues(conditionValues))
    const label = {
      tag: 'label',
      className: `condition-label ${this.conditionType}-condition-label`,
      content: i18n.get(this.conditionType) || this.conditionType,
    }

    const fieldsDom = []
    // console.log(this.conditionType, conditionValues, orderedValues)
    for (const [key, value] of orderedValues) {
      const conditionField = new ConditionField({ key, value, conditionType: this.conditionType }, orderedValues)
      this.fields.set(key, conditionField)
      fieldsDom.push(conditionField.dom)
    }

    return {
      children: [label, ...fieldsDom],
      className: `f-condition-row ${this.conditionType}-condition-row`,
    }
  }

  get value() {
    return Array.from(this.fields).reduce((acc, [key, field]) => {
      acc[key] = field.value
      return acc
    }, {})
  }

  onChangeCondition = ({ target }) => {
    const conditionRow = target.closest('.f-condition-row')
    const regex = new RegExp(`${target.className}(?:\\S?)+`, 'gm')
    conditionRow.className = conditionRow.className.replace(regex, '')
    if (target.tagName === 'SELECT') {
      conditionRow.classList.add([target.className, target.value].filter(Boolean).join('-'))
    }

    const evtData = {
      dataPath,
      value: target.value,
      src: target,
    }

    events.formeoUpdated(evtData)
    Components.setAddress(dataPath, target.value)

    const rowIndex = indexOfNode(conditionRow)
    this.processConditionUIState(this.itemFieldGroups[rowIndex])
  }
}
