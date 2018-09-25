import identity from 'lodash/identity'
import i18n from 'mi18n'
import { SESSION_FORMDATA_KEY } from '../constants'
import { sessionStorage } from './utils'

// Actions are the callbacks for things like adding
// new attributes, options, field removal confirmations etc.
// Every Action below can be overridden via module options

// Default options
const defaultActions = {
  add: {
    attr: evt => {
      const attr = window.prompt(evt.message.attr)
      if (attr && evt.isDisabled(attr)) {
        window.alert(i18n.get('attributeNotPermitted', attr || ''))
        return actions.add.attrs(evt)
      }
      let val
      if (attr) {
        val = String(window.prompt(evt.message.value, ''))
        evt.addAction(attr, val)
      }
    },
    option: evt => {
      evt.addAction()
    },
    condition: evt => {
      evt.addAction(evt)
    },
  },
  click: {
    btn: evt => {
      evt.action()
    },
  },
  save: identity,
}

/**
 * Events class is used to register actions and throttle their callbacks
 */
const actions = {
  init: function(options) {
    this.opts = Object.assign({}, defaultActions, options)
    return this
  },
  add: {
    attrs: evt => {
      return actions.opts.add.attr(evt)
    },
    options: evt => {
      return actions.opts.add.option(evt)
    },
    conditions: evt => {
      const conditionsTemplate = {
        if: [
          {
            source: '',
            comparison: '',
            target: '',
          },
        ],
        then: [
          {
            target: '',
            assignment: '',
            value: '',
          },
        ],
      }
      evt.template = conditionsTemplate
      // @todo add logging
      return actions.opts.add.condition(evt)
    },
  },
  click: {
    btn: evt => {
      return actions.opts.click.btn(evt)
    },
  },
  save: formData => {
    if (actions.opts.sessionStorage) {
      sessionStorage.set(SESSION_FORMDATA_KEY, formData)
    }

    return actions.opts.save(formData)
  },
}

export default actions
