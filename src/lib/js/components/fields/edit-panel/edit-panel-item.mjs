import { orderObjectsBy } from '../../../common/helpers.mjs'
import dom from '../../../common/dom.js'
import animate from '../../../common/animation.js'

import { slugify, slugifyAddress, toTitleCase } from '../../../common/utils/string.mjs'
import { Condition } from './condition.mjs'
import { INPUT_TYPE_ACTION, ITEM_INPUT_TYPE_MAP, labelHelper } from './helpers.mjs'
import { set } from '../../../common/utils/object.mjs'

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
  constructor({ key, data, index, field, panelName }) {
    this.itemValues = orderObjectsBy(Object.entries(data), INPUT_ORDER, '0')
    this.field = field
    this.itemKey = key
    this.itemIndex = index
    this.panelName = panelName
    this.isDisabled = field.isDisabledProp(key, panelName)
    this.isHidden = this.isDisabled && field.config.panels[panelName].hideDisabled
    this.isLocked = field.isLockedProp(key, panelName)
    this.address = `${field.indexName}.${field.id}.${key}`
    const itemSlug = slugifyAddress(key)

    const liClassList = [`field-${itemSlug}`, 'prop-wrap']
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
    const dataKey = this.itemKey
    const labelKey = dataKey.split('.').filter(Number.isNaN).join('.') || key

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
        name: null,
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
