import { describe, it, before, beforeEach, mock } from 'node:test'
import Field from './field.js'
import { Controls } from '../controls/index.js'

const fieldConfig = {
  tag: 'input',
  attrs: {
    required: false,
    type: 'text',
    className: '',
  },
  config: {
    label: 'Text Input',
    controlId: 'text-input',
  },
  id: '1c48584a',
}

describe('Field', () => {
  let field

  before(() => {
    mock.method(Controls.prototype, 'get', () => fieldConfig)
  })

  beforeEach(() => {
    field = new Field(fieldConfig)
    mock.method(field, 'onRender', () => identity => identity)
  })

  it('should have data property matching snapshot', t => {
    t.assert.snapshot(field.data)
  })
})
