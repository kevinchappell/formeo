import i18n from '@draggable/i18n'
import { orderObjectsBy, indexOfNode } from '../../../common/helpers.mjs'
import dom from '../../../common/dom.js'
import animate from '../../../common/animation.js'
import {
  CONDITION_INPUT_ORDER,
  FIELD_INPUT_PROPERTY_MAP,
  OPERATORS,
  INTERNAL_COMPONENT_INDEX_TYPES,
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
  noop,
} from '../../../common/utils/index.mjs'
import { toTitleCase } from '../../../common/utils/string.mjs'
import { Condition } from './condition.mjs'
import { addOptions, getOptionConfigs } from './condition-helpers.mjs'
import { INPUT_TYPE_ACTION, ITEM_INPUT_TYPE_MAP, labelHelper } from './helpers.mjs'

const optionDataCache = {}

const componentIndexRegex = new RegExp(`^(${INTERNAL_COMPONENT_INDEX_TYPES.join('|')}).`)

const makeOptionDom = ({ fieldVal, key, value, selected }) => {
  const option = {
    tag: 'option',
    content: i18n.get(`${fieldVal}.${key}`) || key.toLowerCase(),
    attrs: {
      value,
    },
  }

  if (selected === value) {
    option.attrs.selected = true
  }

  return dom.create(option)
}

const createOptions = (fieldVal, selected) => {
  // console.log('createOptions', fieldVal, selected)
  const data = optionDataCache[fieldVal] || getOptionConfigs(fieldVal)

  optionDataCache[fieldVal] = data

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (key !== 'id') {
      acc.push(makeOptionDom({ fieldVal, key, value, selected }))
    }
    return acc
  }, [])
}

const INPUT_ORDER = ['selected', 'checked']

/**
 * Edit Panel Item
 */
export default class EditPanelItem {
  /**
   * Set defaults and load panelData
   * @param  {String} itemKey attribute name or options index
   * @param  {Object} itemData existing field ID
   * @param  {String} field
   * @return {Object} field object
   */
  constructor({ key, data, index, field }) {
    this.itemValues = orderObjectsBy(Object.entries(data), INPUT_ORDER, '0')
    const [panelName, item] = key.split('.')
    this.field = field
    this.itemKey = key
    this.itemIndex = index
    this.panelName = panelName
    this.isDisabled = field.isDisabledProp(item, panelName)
    this.isHidden = this.isDisabled && field.config.panels[panelName].hideDisabled
    this.isLocked = field.isLockedProp(item, panelName)
    this.address = `${field.indexName}.${field.id}.${key}`
    this.dom = dom.create({
      tag: 'li',
      className: [`field-${key.replace(/\./g, '-')}`, 'prop-wrap', this.isHidden && 'hidden-property'],
      children: { className: 'field-prop', children: [this.itemInputs, this.itemControls] },
    })
  }

  get itemInputs() {
    this.itemFieldGroups = []

    const inputs = {
      className: `${this.panelName}-prop-inputs prop-inputs f-input-group`,
      children: this.itemValues.map(([key, val]) => {
        let inputConfig =
          this.panelName === 'conditions' ? this.generateConditionFields(key, val) : this.itemInput(key, val)
        if (['selected', 'checked'].includes(key)) {
          inputConfig = {
            className: 'f-addon',
            children: inputConfig,
          }
        }
        return inputConfig
      }),
    }

    return inputs
  }

  generateConditionFields = (conditionType, conditionVals) => {
    const conditionFields = conditionVals.map((condition, i) => {
      const conditionField = new Condition({ conditionValues: condition, conditionType, index: i }, this)

      return conditionField.dom
    })

    return conditionFields
  }

  processConditionUIState = fields => {
    // console.log(fields)
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

  get itemControls() {
    if (this.isLocked) {
      const controls = {
        className: `${this.panelName}-prop-controls prop-controls`,
        content: [],
      }
      return controls
    }

    const remove = {
      tag: 'button',
      attrs: {
        type: 'button',
        className: 'prop-remove prop-control',
      },
      action: {
        click: () => {
          animate.slideUp(this.dom, 250, elem => {
            this.field.remove(this.itemKey)
            dom.remove(elem)
            this.field.resizePanelWrap()
          })
        },
      },
      content: dom.icon('remove'),
    }
    const controls = {
      className: `${this.panelName}-prop-controls prop-controls`,
      content: [remove],
    }
    return controls
  }

  itemInput(key, value) {
    const valType = dom.childType(value) || 'string'

    const inputTypeConfig = { ...{ config: {}, attrs: {} }, ...ITEM_INPUT_TYPE_MAP[valType]({ key, value }) }
    const dataKey = this.itemKey.replace(/.\d+$/, index => `${index}.${key}`)
    const labelKey = dataKey.split('.').filter(Number.isNaN).join('.') || key

    const [id, name] = [[...this.itemKey.split('.'), key], [key]].map(attrVars =>
      [this.field.id, ...attrVars].filter(Boolean).join('-'),
    )

    inputTypeConfig.config = {
      ...inputTypeConfig.config,
      ...{
        label: this.panelName !== 'options' && (labelHelper(labelKey) || toTitleCase(labelKey)),
        labelAfter: false,
      },
    }

    inputTypeConfig.attrs = {
      ...inputTypeConfig.attrs,
      ...{
        name,
        id,
        disabled: this.isDisabled,
        locked: this.isLocked,
      },
    }

    inputTypeConfig.action = {
      ...INPUT_TYPE_ACTION[valType](dataKey, this.field),
    }

    return inputTypeConfig
  }
}
