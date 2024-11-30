import i18n from '@draggable/i18n'
import { generateOptionConfig } from './shared.js'
import Control from '../control.js'
import { merge } from '../../../common/utils/index.mjs'

class SelectControl extends Control {
  constructor(controlConfig = {}) {
    const selectConfig = {
      tag: 'select',
      config: {
        label: i18n.get('controls.form.select'),
      },
      attrs: {
        required: false,
        className: '',
      },
      meta: {
        group: 'common',
        icon: 'select',
        id: 'select',
      },
      options: generateOptionConfig({ type: 'option', isMultiple: controlConfig.attrs?.multiple }),
    }

    const mergedConfig = merge(selectConfig, controlConfig)

    super(mergedConfig)
  }
}

export default SelectControl
