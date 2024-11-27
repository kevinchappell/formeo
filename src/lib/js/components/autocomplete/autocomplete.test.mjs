import { test, suite, mock } from 'node:test'
import { componentOptions, labelCount } from './autocomplete.mjs'
import components from '../index.js'

const mockFlatList = {
  'test.id': {
    get: key => key,
  },
}

mock.method(components, 'flatList', () => mockFlatList)

suite('Autolinker', () => {
  suite('componentOptions utility', () => {
    test('should generate an array of dom options', ({ assert }) => {
      const options = componentOptions('test.id')
      assert.snapshot(options)
    })
  })

  suite('labelCount utility', () => {
    const labels = ['Text', 'Text', 'Text', 'TextArea']

    test('should return number of duplicates of "Text" in an array', ({ assert }) => {
      const count = labelCount(labels, 'Text')
      assert.strictEqual(count, '(3)')
    })

    test('should return number of duplicates of "TextArea" in an array', ({ assert }) => {
      const count = labelCount(labels, 'TextArea')
      assert.strictEqual(count, '')
    })

    test('should return number of duplicates of "Select" in an array', ({ assert }) => {
      const count = labelCount(labels, 'Select')
      assert.strictEqual(count, '')
    })
  })
})
