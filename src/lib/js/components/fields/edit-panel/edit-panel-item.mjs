import { orderObjectsBy } from '../../../common/helpers.mjs'
import dom from '../../../common/dom.js'
import animate from '../../../common/animation.js'

import { slugifyAddress, toTitleCase } from '../../../common/utils/string.mjs'
import { Condition } from './condition.mjs'
import { INPUT_TYPE_ACTION, ITEM_INPUT_TYPE_MAP, labelHelper } from './helpers.mjs'
import { merge } from '../../../common/utils/index.mjs'
import { mergeActions } from '../../../common/utils/object.mjs'
import { CHECKED_TYPES, REVERSED_CHECKED_TYPES } from '../../../constants.js'

const panelDataKeyMap = new Map([
  ['attrs', ({ itemKey }) => itemKey],
  ['options', ({ itemKey, key }) => `${itemKey}.${key}`],
])

export const toggleOptionMultiSelect = (isMultiple, field) => {
  if (field.controlId === 'select') {
    const optionsPanel = field.editPanels.get('options')
    const [fromCheckedType, toCheckedType] = isMultiple ? CHECKED_TYPES : REVERSED_CHECKED_TYPES
    const updatedOptionsData = optionsPanel.data.map(({ [fromCheckedType]: val, ...option }) => ({
      [toCheckedType]: val,
      ...option,
    }))
    optionsPanel.setData(updatedOptionsData)
  }
}

const itemInputActions = new Map([
  [
    'attrs-multiple',
    editPanelItem => ({
      change: ({ target }) => {
        if (editPanelItem.field.controlId === 'select') {
          toggleOptionMultiSelect(target.checked, editPanelItem.field)
        }
      },
    }),
  ],
])

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
  constructor({ key, data, index, field, panel }) {
    this.itemValues = orderObjectsBy(Object.entries(data), CHECKED_TYPES, '0')
    this.field = field
    this.itemKey = key
    this.itemIndex = index
    this.panel = panel
    this.panelName = panel.name
    this.isDisabled = field.isDisabledProp(key, this.panelName)
    this.isHidden = this.isDisabled && field.config.panels[this.panelName].hideDisabled
    this.isLocked = field.isLockedProp(key, this.panelName)
    this.address = `${field.indexName}.${field.id}.${key}`
    this.itemSlug = slugifyAddress(key)

    const liClassList = [`field-${this.itemSlug}`, 'prop-wrap']
    if (this.isHidden) {
      liClassList.push('hidden-property')
    }

    this.dom = dom.create({
      tag: 'li',
      className: liClassList,
      children: { className: 'field-prop', children: [this.itemInputs, this.itemControls] },
    })
  }

  get itemInputs() {
    this.itemFieldGroups = []

    const inputs = {
      className: `${this.panelName}-prop-inputs prop-inputs f-input-group`,
      children: this.itemValues.map(([key, val]) => {
        if (this.panelName === 'conditions') {
          return this.generateConditionFields(key, val)
        }

        return this.itemInput(key, val)
      }),
    }

    return inputs
  }

  generateConditionFields = (conditionType, conditionVals) => {
    // console.log('conditionType', conditionType, conditionVals)
    const conditionFields = conditionVals.map((condition, i) => {
      const conditionField = new Condition({ conditionValues: condition, conditionType, index: i }, this)

      return conditionField.dom
    })

    return conditionFields
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
    const dataKey = panelDataKeyMap.get(this.panelName)?.({ itemKey: this.itemKey, key }) || this.itemKey
    const labelKey = dataKey.split('.').filter(Number.isNaN).join('.') || key
    const baseConfig = ITEM_INPUT_TYPE_MAP[valType]({ key, value })
    const name = `${this.field.shortId}-${slugifyAddress(dataKey).replace(/-\d+-(selected)/g, '-$1')}`
    const config = {
      label: this.panelName !== 'options' && (labelHelper(labelKey) || toTitleCase(labelKey)),
      labelAfter: false,
    }

    const attrs = {
      name: baseConfig.attrs.type === 'checkbox' ? `${name}[]` : name,
    }

    if (this.isDisabled) {
      attrs.disabled = true
    }

    if (this.isLocked) {
      attrs.locked = true
    }

    const itemInputAction = itemInputActions.get(this.itemSlug)?.(this)

    const action = mergeActions(INPUT_TYPE_ACTION[valType](dataKey, this.field), itemInputAction || {})

    const inputConfig = merge(ITEM_INPUT_TYPE_MAP[valType]({ key, value }), { action, attrs, config })
    if (CHECKED_TYPES.includes(key)) {
      return {
        className: 'f-addon',
        children: inputConfig,
      }
    }

    return inputConfig
  }
}
