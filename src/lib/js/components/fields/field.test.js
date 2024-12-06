import { describe, it, before, beforeEach, mock } from 'node:test'
import Field from './field.js'

const fieldConfig = { id: 'test-id', config: { controlId: 'text-input' } }

describe('Field', () => {
  let field

  before(() => {
    mock.method(Field.prototype, 'get', key => fieldConfig[key])
  })

  beforeEach(() => {
    field = new Field(fieldConfig)
    mock.method(field, 'onRender', () => identity => identity)
  })

  it('should have data property matching snapshot', t => {
    t.assert.snapshot(field.data)
  })
})
