import { suite, test } from 'node:test'
import { EditPanelItem } from './edit-panel-item.mjs'

// Mock dependencies
const mockField = {
  indexName: 'mockIndex',
  id: 'mockId',
  remove: () => {},
  resizePanelWrap: () => {},
  isDisabledProp: () => false,
  isLockedProp: () => false,
  shortId: 'mockShortId',
  config: { panels: { mockPanel: { hideDisabled: true } } },
}

const mockPanel = {
  name: 'mockPanel',
  editPanels: new Map(),
}

suite('EditPanelItem snapshots', () => {
  test('should match attribute item snapshot', t => {
    const item = new EditPanelItem({ key: 'attrs.type', data: { type: 'checkbox' }, field: mockField, panel: mockPanel })
    t.assert.snapshot(item)
  })
  test('should match option snapshot', t => {
    const itemData = { label: 'Checkbox 1', value: 'checkbox-1', checked: false }
    const item = new EditPanelItem({ key: 'options[0]', data: itemData, index: 0, field: mockField, panel: mockPanel })
    t.assert.snapshot(item)
  })

  test('EditPanelItem constructor', t => {
    const itemData = { key1: 'value1' }
    const editPanelItem = new EditPanelItem({
      key: 'key1',
      data: itemData,
      index: 0,
      field: mockField,
      panel: mockPanel,
    })

    t.assert.equal(editPanelItem.itemKey, 'key1')
    t.assert.equal(editPanelItem.field, mockField)
    t.assert.equal(editPanelItem.panelName, 'mockPanel')
  })

  test('itemInputs getter', t => {
    const itemData = { key1: 'value1' }
    const editPanelItem = new EditPanelItem({
      key: 'key1',
      data: itemData,
      index: 0,
      field: mockField,
      panel: mockPanel,
    })

    const inputs = editPanelItem.itemInputs
    t.assert.deepEqual(inputs.className, 'mockPanel-prop-inputs prop-inputs f-input-group')
  })

  test('generateConditionFields method', t => {
    const itemData = { conditions: [{ type: 'eq', value: '1' }] }
    const editPanelItem = new EditPanelItem({
      key: 'conditions',
      data: itemData,
      index: 0,
      field: mockField,
      panel: mockPanel,
    })

    const conditionFields = editPanelItem.generateConditionFields('eq', [{ type: 'eq', value: '1' }])
    t.assert.equal(conditionFields.length, 1)
  })

  test('itemControls getter with isLocked', t => {
    const itemData = { key1: 'value1' }
    mockField.isLockedProp = () => true
    const editPanelItem = new EditPanelItem({
      key: 'key1',
      data: itemData,
      index: 0,
      field: mockField,
      panel: mockPanel,
    })

    const controls = editPanelItem.itemControls
    t.assert.equal(controls.content.length, 0)
  })

  test('itemInput method with checkbox type', t => {
    const itemData = { key1: 'value1' }
    const editPanelItem = new EditPanelItem({
      key: 'key1',
      data: itemData,
      index: 0,
      field: mockField,
      panel: mockPanel,
    })

    const inputConfig = editPanelItem.itemInput('checked', true)
    t.assert.equal(inputConfig.children.attrs.name, 'mockShortId-key1[]')
  })
})
