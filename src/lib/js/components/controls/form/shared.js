import i18n from '@draggable/i18n'
import { toTitleCase } from '../../../common/utils/string.mjs'

export const generateOptionConfig = ({ type, isMultiple = false, count = 3 }) =>
  Array.from({ length: count }, (v, k) => k + 1).map(i => {
    const selectedKey = type === 'checkbox' || isMultiple ? 'checked' : 'selected'
    return {
      label: i18n.get('labelCount', {
        label: toTitleCase(type),
        count: i,
      }),
      value: `${type}-${i}`,
      [selectedKey]: !i,
    }
  })
