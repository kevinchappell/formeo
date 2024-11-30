import i18n from '@draggable/i18n'
import Control from '../control.js'
import { merge } from '../../../common/utils/index.mjs'

const buttonTypes = ['button', 'submit', 'reset'].map(buttonType => ({
  label: buttonType,
  value: buttonType,
}))
buttonTypes[0].selected = true

class ButtonControl extends Control {
  constructor(controlConfig = {}) {
    const buttonConfig = {
      tag: 'button',
      attrs: {
        className: [
          { label: 'grouped', value: 'f-btn-group' },
          { label: 'ungrouped', value: 'f-field-group' },
        ],
      },
      config: {
        label: i18n.get('controls.form.button'),
        hideLabel: true,
      },
      meta: {
        group: 'common',
        icon: 'button',
        id: 'button',
      },
      options: [
        {
          label: i18n.get('button'),
          type: buttonTypes,
          className: [
            {
              label: 'default',
              value: '',
              selected: true,
            },
            {
              label: 'primary',
              value: 'primary',
            },
            {
              label: 'danger',
              value: 'error',
            },
            {
              label: 'success',
              value: 'success',
            },
            {
              label: 'warning',
              value: 'warning',
            },
          ],
        },
      ],
    }

    const mergedConfig = merge(buttonConfig, controlConfig)

    super(mergedConfig)
  }
}

export default ButtonControl
