import { generateOptionConfig } from './shared.js'
import i18n from '@draggable/i18n'
import Control from '../control.js'

class RadioGroupControl extends Control {
  constructor() {
    const radioGroup = {
      tag: 'input',
      attrs: {
        type: 'radio',
        required: false,
      },
      config: {
        label: i18n.get('controls.form.radio-group'),
        disabledAttrs: ['type'],
      },
      meta: {
        group: 'common',
        icon: 'radio-group',
        id: 'radio',
      },
      options: generateOptionConfig({ type: 'radio' }),
    }
    super(radioGroup)
  }
}

export default RadioGroupControl
