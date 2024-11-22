import i18n from '@draggable/i18n'
import dom from '../../common/dom.js'
import { fetchDependencies } from '../../common/loaders.js'
import { uuid } from '../../common/utils/index.mjs'
import { CONTROL_GROUP_CLASSNAME } from '../../constants.js'
import { indexOfNode } from '../../common/helpers.mjs'
import controls from './index.js'

export default class Control {
  controlCache = new Set()

  /**
   * Constructs a new Control instance.
   *
   * @param {Object} [config={}] - The configuration object.
   * @param {Object} [config.events={}] - The events associated with the control. ex { click: () => {} }
   * @param {Object} [config.dependencies={}] - The dependencies required by the control. ex { js: 'https://example.com/script.js', css: 'https://example.com/style.css' }
   * @param {...Object} [controlData] - Additional configuration properties. ex { meta: {}, config: { label: 'Control Name' } }
   */
  constructor({ events = {}, dependencies = {}, controlAction, ...controlData }) {
    this.events = events
    this.controlData = controlData
    this.controlAction = controlAction
    this.dependencies = dependencies
    this.id = controlData.id || uuid()
  }

  get controlId() {
    return this.controlData.meta?.id
  }

  get dom() {
    const { meta, config } = this.controlData
    const controlLabel = this.i18n(config.label) || config.label

    const button = {
      tag: 'button',
      attrs: {
        type: 'button',
      },
      content: [
        { tag: 'span', className: 'control-icon', children: dom.icon(meta.icon) },
        { tag: 'span', className: 'control-label', content: controlLabel },
      ],
      action: {
        // this is used for keyboard navigation. when tabbing through controls it
        // will auto navigated between the groups
        focus: ({ target }) => {
          const group = target.closest(`.${CONTROL_GROUP_CLASSNAME}`)
          return group && controls.panels.nav.refresh(indexOfNode(group))
        },
        click: ({ target }) => {
          const controlId = target.closest('.field-control')?.id
          if (controlId) {
            controls.addElement(controlId)
          }
        },
      },
    }

    return dom.create({
      tag: 'li',
      id: this.id,
      className: ['field-control', `${meta.group}-control`, `${meta.id}-control`],
      content: button,
      meta: meta,
      action: this.controlAction,
    })
  }

  promise() {
    return fetchDependencies(this.dependencies)
  }

  /**
   * Retrieve a translated string
   * By default looks for translations defined against the class (for plugin controls)
   * Expects {locale1: {type: label}, locale2: {type: label}}, or {default: label}, or {local1: label, local2: label2}
   * @param {String} lookup string to retrieve the label / translated string for
   * @param {Object|Number|String} args - string or key/val pairs for string lookups with variables
   * @return {String} the translated label
   */
  i18n(lookup, args) {
    const locale = i18n.locale
    const controlTranslations = this.definition?.i18n
    const localeTranslations = controlTranslations?.[locale] || {}

    return (localeTranslations[lookup]?.() ?? localeTranslations[lookup]) || i18n.get(lookup, args)
  }
}
