import i18n from '@draggable/i18n'
import dom from '../../../common/dom.js'
import { CONDITION_INPUT_ORDER } from '../../../constants.js'
import events from '../../../common/events.js'
import Components from '../../index.js'
import { debounce } from '../../../common/utils/index.mjs'
import { conditionFieldHandlers, segmentTypes } from './condition-helpers.mjs'

function orderConditionValues(conditionValues, fieldOrder = CONDITION_INPUT_ORDER) {
  return fieldOrder.reduce((acc, fieldName) => {
    if (conditionValues[fieldName] !== undefined) {
      acc.push([fieldName, conditionValues[fieldName]])
    }
    return acc
  }, [])
}

const conditionLabels = new Map([
  ['condition-if', [i18n.get('condition.type.if'), i18n.get('condition.type.or')]],
  ['condition-then', [i18n.get('condition.type.then'), i18n.get('condition.type.and')]],
])

console.log(Array.from(conditionLabels.values()))

export class Condition {
  constructor({ conditionValues, conditionType, index }, parent) {
    this.values = new Map(orderConditionValues(conditionValues))
    this.conditionType = conditionType
    this.index = index
    this.parent = parent
    this.address = `${parent.address}.${conditionType}[${index}]`
    this.fields = new Map()

    this.dom = this.generateDom()
  }

  label() {
    console.log(conditionLabels.get(`condition-${this.conditionType}`))
    const conditionTypeLabelIndex = this.index ? 1 : 0
    return conditionLabels.get(`condition-${this.conditionType}`)?.[conditionTypeLabelIndex]
  }

  generateDom() {
    const label = {
      tag: 'label',
      className: `condition-label ${this.conditionType}-condition-label`,
      content: this.label(),
    }

    const fieldsDom = []
    for (const [key, value] of this.values) {
      const onChange = evt => this.onChangeCondition({ key, target: evt.target })
      const fieldArgs = { key, value, conditionType: this.conditionType, onChange }
      const conditionField = segmentTypes[key](fieldArgs, this.values)
      const conditionFieldDom = conditionField.dom || dom.create(conditionField)
      this.fields.set(key, conditionField.dom ? conditionField : conditionFieldDom)
      fieldsDom.push(conditionFieldDom)
    }

    const conditionTypeRow = {
      children: [label, ...fieldsDom],
      className: `f-condition-row ${this.conditionType}-condition-row`,
      action: {
        onRender: elem => {
          this.processUiState()
        },
      },
    }

    // const addConditionType = dom.btnTemplate({
    //   title: i18n.get(`add${this.conditionType}Condition`),
    //   className: 'prop-control',
    //   content: dom.icon('plus'),
    // })

    const removeConditionType = dom.btnTemplate({
      title: i18n.get(`remove${this.conditionType}Condition`),
      className: 'remove-condition-type',
      content: dom.icon('minus'),
    })

    const conditionRowWrap = {
      tag: 'div',
      className: 'f-condition-row-wrap',
      children: [conditionTypeRow, removeConditionType],
    }

    return dom.create(conditionRowWrap)
  }

  get value() {
    return Array.from(this.fields).reduce((acc, [key, field]) => {
      acc[key] = field.value
      return acc
    }, {})
  }

  processUiState() {
    for (const [key, field] of this.fields) {
      this.onChangeCondition({ target: field, key })
    }
  }

  updateDataDebounced = debounce(evtData => {
    events.formeoUpdated(evtData)
    Components.setAddress(evtData.dataPath, evtData.value)
  })

  onChangeCondition = ({ key, target }) => {
    const evtData = {
      dataPath: this.address,
      value: this.value,
      src: target,
    }

    conditionFieldHandlers[key]?.(target, this.fields)

    this.updateDataDebounced(evtData)
  }
}
