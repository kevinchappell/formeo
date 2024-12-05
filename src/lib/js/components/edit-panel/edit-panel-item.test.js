import { test, suite } from 'node:test'

import EditPanelItem from './edit-panel-item.mjs'

const mockField = {
  data: {
    attrs: {},
  },
  isDisabledProp: () => null,
  isLockedProp: () => null,
}

suite('EditPanelItem snapshots', () => {
  test('should match attribute item snapshot', t => {
    const item = new EditPanelItem({ key: 'attrs.type', data: { type: 'checkbox' }, field: mockField })
    t.assert.snapshot(item)
  })
  test('should match option snapshot', t => {
    const itemData = { label: 'Checkbox 1', value: 'checkbox-1', checked: false }
    const item = new EditPanelItem({ key: 'options.0', data: itemData, index: 0, field: mockField })
    t.assert.snapshot(item)
  })
})
