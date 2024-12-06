import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { dom } from './dom.js'

// Mock browser globals
global.window = {
  Node: class {},
  HTMLElement: class {},
  Element: class {},
  requestAnimationFrame: callback => setTimeout(callback, 0),
  getComputedStyle: () => ({}),
}

global.document = {
  createElement: tag => ({
    tagName: tag,
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {},
      item: () => {},
    },
    setAttribute: () => {},
    getAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    querySelectorAll: () => [],
    dataset: {},
    style: {},
    parentElement: null,
  }),
  getElementById: () => null,
  body: {
    getBoundingClientRect: () => ({ top: 0 }),
  },
}

describe('DOM Class', async t => {
  await t.test('processElemArg', () => {
    // Test string input
    const stringResult = dom.processElemArg('div')
    assert.equal(stringResult.tag, 'div')

    // Test object with attrs.tag
    const objWithTag = dom.processElemArg({ attrs: { tag: 'span' } })
    assert.equal(objWithTag.tag, 'span')

    // Test object with tag array
    const objWithTagArray = dom.processElemArg({
      attrs: { tag: [{ value: 'h1', selected: true }, { value: 'h2' }] },
    })
    assert.equal(objWithTagArray.tag, 'h1')

    // Test default div
    const defaultResult = dom.processElemArg({})
    assert.equal(defaultResult.tag, 'div')
  })

  await t.test('getName', () => {
    const elemWithName = { attrs: { name: 'testName' } }
    assert.equal(dom.getName(elemWithName), 'testName')

    const elemWithLabel = {
      config: { label: 'Test Label' },
    }
    assert.match(dom.getName(elemWithLabel), /.*-test-label$/)

    const elemEmpty = {}
    assert.match(dom.getName(elemEmpty), /^[a-z0-9-]+$/)
  })

  await t.test('childType', () => {
    assert.equal(dom.childType([1, 2, 3]), 'array')
    assert.equal(dom.childType('string'), 'string')
    assert.equal(dom.childType(123), 'number')
    assert.equal(dom.childType(undefined), undefined)
    assert.equal(dom.childType({ dom: {} }), 'component')
  })

  await t.test('processAttrValue', () => {
    assert.equal(
      dom.processAttrValue(() => 'test'),
      'test',
    )
    assert.equal(dom.processAttrValue(true), '')
    assert.equal(dom.processAttrValue(false), false)
    assert.equal(dom.processAttrValue(['one', 'two']), 'one two')
    assert.equal(dom.processAttrValue([{ value: 'one', selected: true }, { value: 'two' }]), 'one')
  })

  await t.test('isInput', () => {
    assert.equal(dom.isInput('input'), true)
    assert.equal(dom.isInput('textarea'), true)
    assert.equal(dom.isInput('select'), true)
    assert.equal(dom.isInput('div'), false)
  })

  await t.test('labelAfter', () => {
    const checkboxElem = { attrs: { type: 'checkbox' } }
    assert.equal(dom.labelAfter(checkboxElem), true)

    const radioElem = { attrs: { type: 'radio' } }
    assert.equal(dom.labelAfter(radioElem), true)

    const textElem = { attrs: { type: 'text' } }
    assert.equal(dom.labelAfter(textElem), false)

    const explicitLabelAfter = { config: { labelAfter: true } }
    assert.equal(dom.labelAfter(explicitLabelAfter), true)
  })

  await t.test('isDOMElement', () => {
    class MockElement extends global.window.Element {}
    const elem = new MockElement()
    assert.equal(dom.isDOMElement(elem), true)
    assert.equal(dom.isDOMElement({}), false)
    assert.equal(dom.isDOMElement(null), false)
  })

  await t.test('isComponent', () => {
    assert.equal(dom.isComponent({ dom: {} }), true)
    assert.equal(dom.isComponent({}), false)
    assert.equal(dom.isComponent(null), false)
  })

  await t.test('create', async t => {
    await t.test('should return undefined for falsy input', () => {
      assert.equal(dom.create(), undefined)
      assert.equal(dom.create(null), undefined)
      assert.equal(dom.create(false), undefined)
    })

    await t.test('should return DOM element if passed as argument', () => {
      const mockElement = document.createElement('div')
      assert.equal(dom.create(mockElement), mockElement)
    })

    await t.test('should create basic element with tag', () => {
      const element = dom.create('div')
      assert.equal(element.tagName, 'DIV')
    })

    await t.test('should create element with attributes', () => {
      const config = {
        tag: 'input',
        attrs: {
          type: 'text',
          name: 'test-input',
          id: 'test-id',
          className: 'test-class',
        },
      }
      const element = dom.create(config)
      assert.equal(element.getAttribute('type'), 'text')
      assert.equal(element.getAttribute('name'), 'test-input')
      assert.equal(element.getAttribute('id'), 'test-id')
      assert.equal(element.getAttribute('className'), 'test-class')
    })

    await t.test('should create element with children', () => {
      const config = {
        tag: 'div',
        children: [
          { tag: 'span', children: 'Hello' },
          { tag: 'span', children: 'World' },
        ],
      }
      const element = dom.create(config)
      assert.equal(element.children.length, 2)
      assert.equal(element.children[0].tagName, 'SPAN')
      assert.equal(element.children[1].tagName, 'SPAN')
      assert.equal(element.textContent, 'HelloWorld')
    })

    await t.test('should create element with string content', () => {
      const config = {
        tag: 'div',
        content: 'Hello World',
      }
      const element = dom.create(config)
      assert.equal(element.innerHTML, 'Hello World')
    })

    await t.test('should create element with dataset attributes', () => {
      const config = {
        tag: 'div',
        dataset: {
          test: 'value',
          camelCase: 'works',
        },
      }
      const element = dom.create(config)
      assert.equal(element.dataset.test, 'value')
      assert.equal(element.dataset.camelCase, 'works')
    })

    await t.test('should handle function content', () => {
      const config = {
        tag: 'div',
        content: () => 'Dynamic Content',
      }
      const element = dom.create(config)
      assert.equal(element.innerHTML, 'Dynamic Content')
    })

    await t.test('should handle options for select elements', () => {
      const config = {
        tag: 'select',
        options: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2', selected: true },
        ],
      }
      const element = dom.create(config)
      assert.equal(element.tagName, 'SELECT')
      assert.equal(element.children.length, 2)
      assert.equal(element.children[1].selected, true)
    })
  })
})
