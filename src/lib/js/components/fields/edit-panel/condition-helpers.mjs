import i18n from '@draggable/i18n'
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
import Components from '../../index.js'
import events from '../../../common/events'
import { indexOfNode, isInt } from '../../../common/helpers.mjs'
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
  value: ({ key, value, onChange }, conditionValues) => {
    console.log('value.conditionValues', conditionValues)
    const valueField = ITEM_INPUT_TYPE_MAP.string({ key: `condition.${key}`, value })

    valueField.action = {
      input: onChange,
    }

    return valueField
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

function createConditionSelect({ key, value, onChange }) {
  // console.log(key)
  const optionConfigs = getOptionConfigs(key, value)
  const propertyFieldConfig = ITEM_INPUT_TYPE_MAP.array({ key: `condition.${key}`, value: optionConfigs })

  propertyFieldConfig.action = {
    change: onChange,
    // onRender: elem => onChangeCondition({ target: elem }),
  }

  return propertyFieldConfig
}

const hiddenPropertyClassname = 'hidden-property'
const hiddenOptionClassname = 'hidden-option'
const optionsAddressRegex = /\.options\.\d+$/

export const conditionFieldHandlers = {
  source: (field, fields) => {
    const hasValue = !!field.value
    const isCheckbox = !!field.value.match(optionsAddressRegex)
    const sourceProperty = fields.get('sourceProperty')
    const target = fields.get('target')
    const visibilityConditions = {
      sourceProperty: [hasValue],
      comparison: [hasValue, !isCheckbox],
      target: [hasValue],
      targetProperty: [hasValue, target.value],
    }

    for (const [fieldName, conditions] of Object.entries(visibilityConditions)) {
      fields.get(fieldName)?.classList.toggle(hiddenPropertyClassname, !conditions.every(Boolean))
    }

    const options = sourceProperty.querySelectorAll('option')

    for (const option of options) {
      const isChecked = option.value === 'isChecked'
      if (isCheckbox) {
        option.classList.toggle(hiddenOptionClassname, !isChecked)
      } else {
        option.classList.toggle(hiddenOptionClassname, isChecked)
      }
    }

    if (!isCheckbox) {
      const firstNotIsChecked = sourceProperty.querySelector('option:not([value="isChecked"])')
      sourceProperty.value = firstNotIsChecked.value
    } else {
      sourceProperty.value = 'isChecked'
    }
  },
}
