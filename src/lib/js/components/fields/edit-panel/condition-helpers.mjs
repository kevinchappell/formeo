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
import { ITEM_INPUT_TYPE_MAP } from './helpers.mjs'

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

    return componentInput
  },
  sourceProperty: createConditionSelect,
  targetProperty: createConditionSelect,
  target: args => segmentTypes.source(args),
  value: ({ key, value, onChange }, conditionValues) => {
    const valueField = ITEM_INPUT_TYPE_MAP.string({ key: `condition.${key}`, value })

    valueField.action = {
      input: onChange,
    }

    return valueField
  },
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

const toggleFieldVisibility = (fieldConditions, fields) => {
  for (const [fieldName, conditions] of Object.entries(fieldConditions)) {
    fields.get(fieldName)?.classList.toggle(hiddenPropertyClassname, !conditions.every(Boolean))
  }
}

const isCheckedValue = 'isChecked'
const togglePropertyOptions = (isCheckbox, propertyField) => {
  const options = Array.from(propertyField.querySelectorAll('option'))

  for (const option of options) {
    const optionIsChecked = option.value === isCheckedValue
    const shouldHide = isCheckbox ? !optionIsChecked : optionIsChecked

    option.classList.toggle(hiddenOptionClassname, shouldHide)
  }

  propertyField.value = isCheckbox
    ? isCheckedValue
    : options.find(opt => opt.value !== isCheckedValue)?.value || propertyField.value
}

export const conditionFieldHandlers = {
  source: (field, fields) => {
    const hasValue = !!field.value
    const isCheckbox = !!field.value.match(optionsAddressRegex)
    const target = fields.get('target')
    const visibilityConditions = {
      sourceProperty: [hasValue],
      comparison: [hasValue, !isCheckbox],
      target: [hasValue],
      targetProperty: [hasValue, target.value],
    }

    toggleFieldVisibility(visibilityConditions, fields)
    togglePropertyOptions(isCheckbox, fields.get('sourceProperty'))
  },
  target: (field, fields) => {
    const targetProperty = fields.get('targetProperty')
    const isCheckbox = !!field.value.match(optionsAddressRegex)
    const hasValue = !!field.value
    const visibilityConditions = {
      targetProperty: [hasValue, isInternalAddress(field.value)],
      assignment: [hasValue, !isCheckbox],
      value: [hasValue, targetProperty.value !== isCheckedValue],
    }

    toggleFieldVisibility(visibilityConditions, fields)
    togglePropertyOptions(isCheckbox, targetProperty)
  },
}
