import pkg from '../../../package.json' with { type: 'json' }
import { uuid } from './common/utils/index.mjs'
import { objectFromStringArray } from './common/utils/object.mjs'

const isProd = import.meta.env?.PROD

const name = pkg.name
export const version = pkg.version
export const PACKAGE_NAME = name
export const formeoSpriteId = 'formeo-sprite'

export const POLYFILLS = [
  { name: 'cssPreload', src: '//cdnjs.cloudflare.com/ajax/libs/loadCSS/2.0.1/cssrelpreload.min.js' },
  { name: 'mutationObserver', src: '//cdn.jsdelivr.net/npm/mutationobserver-shim/dist/mutationobserver.min.js' },
  { name: 'fetch', src: 'https://unpkg.com/unfetch/polyfill' },
]
export const SVG_SPRITE_URL = isProd
  ? `https://cdn.jsdelivr.net/npm/formeo@${version}/dist/${formeoSpriteId}.svg`
  : `assets/img/${formeoSpriteId}.svg`
export const FALLBACK_SVG_SPRITE_URL = `https://draggable.github.io/formeo/assets/img/${formeoSpriteId}.svg`
export const CSS_URL = `https://cdn.jsdelivr.net/npm/formeo@${version}/dist/formeo.min.css`
export const FALLBACK_CSS_URL = 'https://draggable.github.io/formeo/assets/css/formeo.min.css'

export const CONTROL_GROUP_CLASSNAME = 'control-group'
export const STAGE_CLASSNAME = `${PACKAGE_NAME}-stage`
export const ROW_CLASSNAME = `${PACKAGE_NAME}-row`
export const COLUMN_CLASSNAME = `${PACKAGE_NAME}-column`
export const FIELD_CLASSNAME = `${PACKAGE_NAME}-field`

export const CUSTOM_COLUMN_OPTION_CLASSNAME = 'custom-column-widths'
export const COLUMN_PRESET_CLASSNAME = 'column-preset'
export const COLUMN_RESIZE_CLASSNAME = 'resizing-columns'

export const CHILD_CLASSNAME_MAP = new Map([
  [STAGE_CLASSNAME, ROW_CLASSNAME],
  [ROW_CLASSNAME, COLUMN_CLASSNAME],
  [COLUMN_CLASSNAME, FIELD_CLASSNAME],
])

export const INTERNAL_COMPONENT_TYPES = ['stage', 'row', 'column', 'field']
export const INTERNAL_COMPONENT_INDEX_TYPES = INTERNAL_COMPONENT_TYPES.map(type => `${type}s`)
export const INTERNAL_COMPONENT_INDEX_TYPE_MAP = new Map(
  INTERNAL_COMPONENT_INDEX_TYPES.map((type, index) => [type, INTERNAL_COMPONENT_TYPES[index]]),
)
export const COMPONENT_TYPES = ['external', ...INTERNAL_COMPONENT_TYPES]
export const COMPONENT_INDEX_TYPES = ['external', ...INTERNAL_COMPONENT_INDEX_TYPES]
export const COMPONENT_INDEX_TYPE_MAP = new Map(
  COMPONENT_INDEX_TYPES.map((type, index) => [type, COMPONENT_TYPES[index]]),
)

export const COMPONENT_TYPE_MAP = COMPONENT_TYPES.reduce((acc, type) => {
  acc[type] = type
  return acc
}, {})

export const COMPONENT_TYPE_CONFIGS = [
  { name: 'controls', className: CONTROL_GROUP_CLASSNAME },
  { name: 'stage', className: STAGE_CLASSNAME },
  { name: 'row', className: ROW_CLASSNAME },
  { name: 'column', className: COLUMN_CLASSNAME },
  { name: 'field', className: FIELD_CLASSNAME },
]

export const COMPONENT_TYPE_CLASSNAMES = {
  controls: CONTROL_GROUP_CLASSNAME,
  stage: STAGE_CLASSNAME,
  row: ROW_CLASSNAME,
  column: COLUMN_CLASSNAME,
  field: FIELD_CLASSNAME,
}

export const COMPONENT_TYPE_CLASSNAMES_LOOKUP = Object.entries(COMPONENT_TYPE_CLASSNAMES).reduce(
  (acc, [type, className]) => {
    acc[className] = type
    return acc
  },
  {},
)

export const COMPONENT_TYPE_CLASSNAMES_ARRAY = Object.values(COMPONENT_TYPE_CLASSNAMES)
export const COMPONENT_TYPE_CLASSNAMES_REGEXP = new RegExp(`${COMPONENT_TYPE_CLASSNAMES_ARRAY.join('|')}`, 'g')

const { childTypeMapVals, childTypeIndexMapVals } = COMPONENT_TYPE_CONFIGS.reduce(
  (acc, { name }, index, arr) => {
    const { name: childName } = arr[index + 1] || {}
    if (childName) {
      acc.childTypeMapVals.push([name, childName])
      acc.childTypeIndexMapVals.push([`${name}s`, `${childName}s`])
    }

    return acc
  },
  { childTypeMapVals: [], childTypeIndexMapVals: [] },
)

const parentTypeMap = childTypeMapVals
  .slice()
  .map(typeMap => typeMap.slice().reverse())
  .reverse()

export const CHILD_TYPE_MAP = new Map(childTypeMapVals)
export const CHILD_TYPE_INDEX_MAP = new Map(childTypeIndexMapVals)

export const PARENT_TYPE_MAP = new Map(parentTypeMap.slice())

export const TYPE_CHILD_CLASSNAME_MAP = new Map([
  ['stage', ROW_CLASSNAME],
  ['row', COLUMN_CLASSNAME],
  ['column', FIELD_CLASSNAME],
])

const columnTemplates = [
  [{ value: '100.0', label: '100%' }],
  [
    { value: '50.0,50.0', label: '50 | 50' },
    { value: '33.3,66.6', label: '33 | 66' },
    { value: '66.6,33.3', label: '66 | 33' },
  ],
  [
    { value: '33.3,33.3,33.3', label: '33 | 33 | 33' },
    { value: '25.0,25.0,50.0', label: '25 | 25 | 50' },
    { value: '50.0,25.0,25.0', label: '50 | 25 | 25' },
    { value: '25.0,50.0,25.0', label: '25 | 50 | 25' },
  ],
  [{ value: '25.0,25.0,25.0,25.0', label: '25 | 25 | 25 | 25' }],
  [{ value: '20.0,20.0,20.0,20.0,20.0', label: '20 | 20 | 20 | 20 | 20' }],
  [{ value: '16.66,16.66,16.66,16.66,16.66,16.66', label: '16.66 | 16.66 | 16.66 | 16.66 | 16.66 | 16.66' }],
]

export const COLUMN_TEMPLATES = new Map(
  columnTemplates.reduce((acc, cur, idx) => {
    acc.push([idx, cur])
    return acc
  }, []),
)

export const SESSION_FORMDATA_KEY = `${name}-formData`
export const SESSION_LOCALE_KEY = `${name}-locale`

export const ANIMATION_SPEED_BASE = 333
export const ANIMATION_SPEED_FAST = Math.round(ANIMATION_SPEED_BASE / 2)
export const ANIMATION_SPEED_SLOW = Math.round(ANIMATION_SPEED_BASE * 2)
export const ANIMATION_SPEED_SUPER_FAST = Math.round(ANIMATION_SPEED_BASE / 5)

//  Event constants
export const EVENT_FORMEO_SAVED = 'formeoSaved'
export const EVENT_FORMEO_UPDATED = 'formeoUpdated'
export const EVENT_FORMEO_UPDATED_STAGE = 'formeoUpdatedStage'
export const EVENT_FORMEO_UPDATED_ROW = 'formeoUpdatedRow'
export const EVENT_FORMEO_UPDATED_COLUMN = 'formeoUpdatedColumn'
export const EVENT_FORMEO_UPDATED_FIELD = 'formeoUpdatedField'
export const EVENT_FORMEO_CLEARED = 'formeoCleared'
export const EVENT_FORMEO_ON_RENDER = 'formeoOnRender'
export const EVENT_FORMEO_CONDITION_UPDATED = 'formeoConditionUpdated'
export const COMPARISON_OPERATORS = {
  equals: '==',
  notEquals: '!=',
  contains: '⊃',
  notContains: '!⊃',
}
export const LOGICAL_OPERATORS = {
  and: '&&',
  or: '||',
}

const visiblityConfigs = ['isVisible', 'isNotVisible']

export const ASSIGNMENT_OPERATORS = {
  equals: '=',
}

export const CONDITION_INPUT_ORDER = [
  'source',
  'sourceProperty',
  'comparison',
  'target',
  'targetProperty',
  'assignment',
  'value',
]

// @todo remove
export const FIELD_CHECKBOX_PROPERTY_MAP = {
  ...visiblityConfigs,
}

export const FIELD_INPUT_PROPERTY_MAP = objectFromStringArray(['isChecked', 'value', ...visiblityConfigs])

export const OPERATORS = {
  comparison: COMPARISON_OPERATORS,
  assignment: ASSIGNMENT_OPERATORS,
  logical: LOGICAL_OPERATORS,
  property: FIELD_INPUT_PROPERTY_MAP,
}

export const CONDITION_TEMPLATE = () => ({
  if: [
    {
      source: '',
      sourceProperty: '',
      comparison: '',
      target: '',
      targetProperty: '',
    },
  ],
  then: [
    {
      target: '',
      targetProperty: '',
      assignment: '',
      value: '',
    },
  ],
})

export const UUID_REGEXP = /(\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)/gi

export const bsColRegExp = /\bcol-\w+-\d+/g

export const iconPrefix = 'f-i-'

export const DEFAULT_FORMDATA = () => ({
  id: uuid(),
  stages: { [uuid()]: {} },
  rows: {},
  columns: {},
  fields: {},
})
