import { generateOptionConfig } from './shared.js'
import i18n from '@draggable/i18n'
import Control from '../control.js'

class CheckboxGroupControl extends Control {
  constructor() {
    const checkboxGroup = {
      tag: 'input',
      attrs: {
        type: 'checkbox',
        required: false,
      },
      config: {
        label: i18n.get('controls.form.checkbox-group'),
        disabledAttrs: ['type'],
      },
      meta: {
        group: 'common',
        icon: 'checkbox',
        id: 'checkbox',
      },
      options: generateOptionConfig({ type: 'checkbox', count: 1 }),
    }
    super(checkboxGroup)
  }
}

export default CheckboxGroupControl
