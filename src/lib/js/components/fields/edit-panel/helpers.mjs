import i18n from '@draggable/i18n'
import { toTitleCase } from '../../../common/utils/string.mjs'
import Autocomplete from '../../autocomplete.mjs'
import dom from '../../../common/dom'

function inputConfigBase({ key, value, type = 'text', checked }) {
  const config = {
    tag: 'input',
    attrs: {
      type,
      value,
      placeholder: i18n.get(`${key}.placeholder`) || toTitleCase(key),
    },
    className: key.replace(/\./g, '-'),
    config: {},
  }

  if (checked) {
    config.attrs.checked = true
  }

  return config
}

export function labelHelper(key) {
  const labelText = i18n.get(key)
  if (labelText) {
    return labelText
  }
  const splitKey = key.split('.')
  return i18n.get(splitKey[splitKey.length - 1])
}

export const ITEM_INPUT_TYPE_MAP = {
  autocomplete: (...args) => new Autocomplete(...args),
  string: ({ key, value }) => inputConfigBase({ key, value }),
  boolean: ({ key, value }) => {
    const type = key === 'selected' ? 'radio' : 'checkbox'
    return inputConfigBase({ key, value, type, checked: !!value })
  },
  number: ({ key, value }) => inputConfigBase({ key, value, type: 'number' }),
  array: ({ key, value }) => {
    return {
      tag: 'select',
      attrs: {
        placeholder: labelHelper(`placeholder.${key}`),
      },
      className: key.replace(/\./g, '-'),
      options: value,
    }
  },
  object: valObj => {
    return Object.entries(valObj).map(([key, value]) => {
      return ITEM_INPUT_TYPE_MAP[dom.childType(value)]({ key, value })
    })
  },
}

export const INPUT_TYPE_ACTION = {
  boolean: (dataKey, field) => ({
    click: ({ target: { checked } }) => {
      if (field.data?.attrs?.type === 'radio') {
        field.set(
          'options',
          field.data.options.map(option => ({ ...option, selected: false })),
        )
      }
      field.set(dataKey, checked)
    },
  }),
  string: (dataKey, field) => ({
    input: ({ target: { value } }) => {
      field.set(dataKey, value)
    },
  }),
  number: (dataKey, field) => ({
    input: ({ target: { value } }) => {
      field.set(dataKey, Number(value))
    },
  }),
  array: (dataKey, field) => ({
    change: ({ target: { value } }) => {
      field.set(dataKey, value)
    },
  }),
  object: () => ({}),
}
