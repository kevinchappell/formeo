import i18n from '@draggable/i18n'
import Autocomplete from '../../autocomplete.mjs'
import { toTitleCase } from '../../../common/utils/string.mjs'
import dom from '../../../common/dom'
import {
  getIndexComponentType,
  isAddress,
  isBoolKey,
  isExternalAddress,
  isInternalAddress,
} from '../../../common/utils/index.mjs'
import { FIELD_INPUT_PROPERTY_MAP, INTERNAL_COMPONENT_INDEX_TYPES, OPERATORS } from '../../../constants'
import { Components } from '../..'
import events from '../../../common/events'
import { indexOfNode } from '../../../common/helpers.mjs'
import { ITEM_INPUT_TYPE_MAP } from './helpers.mjs'

const optionDataCache = {}

const optionDataMap = {
  'field.property': FIELD_INPUT_PROPERTY_MAP,
  'field.input.property': FIELD_INPUT_PROPERTY_MAP,
  'field.checkbox.property': FIELD_INPUT_PROPERTY_MAP,
  sourceProperty: FIELD_INPUT_PROPERTY_MAP,
  targetProperty: FIELD_INPUT_PROPERTY_MAP,
  ...OPERATORS,
}

const componentIndexRegex = new RegExp(`^(${INTERNAL_COMPONENT_INDEX_TYPES.join('|')}).`)

export const INPUT_ORDER = ['selected', 'checked']

export const segmentTypes = {
  assignment: createConditionSelect,
  comparison: createConditionSelect,
  logical: createConditionSelect,
  source: ({ key: keyArg, value, onChange, conditionType }) => {
    const componentInput = ITEM_INPUT_TYPE_MAP.autocomplete({
      key: `${conditionType}.condition.${keyArg}`,
      value,
      onChange,
      className: `condition-${keyArg}`,
    })
    // add to condition map for the type so we can perform reverse lookup when editing a field connected to this condition
    // Components.setConditionMap(value, field)

    // componentInput.addEvent('onChange', evt => {
    //   Components.removeConditionMap(Components.getAddress(dataPath))
    //   onChangeCondition(evt)
    //   Components.setConditionMap(evt.target.value, field)
    // })

    return componentInput
  },
  sourceProperty: createConditionSelect,
  targetProperty: createConditionSelect,
  target: args => segmentTypes.source(args),
  value: ({ key, value, onChange }) => {
    console.log('value', value)
    const valueField = ITEM_INPUT_TYPE_MAP.string({ key: `condition.${key}`, value })

    valueField.action = {
      input: onChange,
    }

    return dom.create(valueField)
  },
  // assignment: value => createConditionSelect('assignment', value),
}

function processConditionUIState(fields) {
  const findFields = classNames => {
    classNames = classNames.split('|')
    return fields.filter(field => classNames.includes(field.className))
  }
  const hideFields = fields => {
    fields = Array.isArray(fields) ? fields : [fields]
    for (const field of fields) {
      const elem = field.dom || field
      elem.style.display = 'none'
    }
  }
  const showFields = fields => {
    fields = Array.isArray(fields) ? fields : [fields]
    for (const field of fields) {
      const elem = field.dom || field
      elem.removeAttribute('style')
    }
  }
  const actions = new Map([
    [
      'condition-source',
      field => {
        const foundFields = findFields('condition-sourceProperty')
        const [sourceProperty] = foundFields
        let key = field.value
        if (isInternalAddress(field.value)) {
          const matches = field.value.match(componentIndexRegex)

          if (matches?.[1]) {
            const componentType = getIndexComponentType(matches[1])
            key = `${componentType}.property`
          }
        }

        key = isExternalAddress(field.value) ? field.value : 'field.property'
        const sourcePropertyOptions = createOptions(key, sourceProperty.value)
        addOptions(sourceProperty, sourcePropertyOptions)

        if (field.value) {
          return showFields(foundFields)
        }
        return hideFields(foundFields)
      },
    ],
    [
      'condition-target',
      field => {
        const foundFields = findFields('condition-targetProperty')
        if (isAddress(field.value) && field.value) {
          return showFields(foundFields)
        }
        return hideFields(foundFields)
      },
    ],
    [
      'condition-sourceProperty',
      field => {
        const foundFields = findFields('condition-comparison|condition-targetProperty|condition-target')
        const val = field.value
        const key = val.substring(val.lastIndexOf('.') + 1, val.length)

        if (!isBoolKey(key)) {
          return showFields(foundFields)
        }

        return hideFields(foundFields)
      },
    ],
  ])

  for (const field of fields) {
    const action = actions.get(field.className)
    if (action) {
      action(field)
    }
  }
}

export function addOptions(select, options) {
  dom.empty(select)
  for (const option of options) {
    select.add(option)
  }
}

export function getOptionConfigs(fieldName, fieldValue) {
  const isExternal = isExternalAddress(fieldName)
  const externalOptionData = address => Components.getAddress(address).getData()

  const data = isExternal ? externalOptionData(fieldName) : optionDataMap[fieldName]
  return Object.entries(data || {}).map(([key, optionValue]) =>
    makeOptionDomConfig({ fieldName, fieldValue, key, optionValue }),
  )
}

function makeOptionDomConfig({ fieldName, fieldValue, key, optionValue }) {
  return {
    label: i18n.get(`${fieldName}.${key}`) || toTitleCase(key).toLowerCase(),
    value: optionValue,
    selected: optionValue === fieldValue,
  }
}

function createConditionSelect({ key, value }) {
  // console.log(key)
  const optionConfigs = getOptionConfigs(key, value)
  const propertyFieldConfig = ITEM_INPUT_TYPE_MAP.array({ key: `condition.${key}`, value: optionConfigs })

  propertyFieldConfig.action = {
    change: onChangeCondition,
    // onRender: elem => onChangeCondition({ target: elem }),
  }

  return propertyFieldConfig
}

function onChangeCondition({ target }) {
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
