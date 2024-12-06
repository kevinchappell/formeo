const { snapshot } = require('node:test')
const { basename, join, dirname } = require('node:path')
const { JSDOM } = require('jsdom')
const { ResizeObserver } = require('./__mocks__/ResizeObserver')

const { window } = new JSDOM('<!DOCTYPE html><p>Hello World</p>', { pretendToBeVisual: true })

window.ResizeObserver = ResizeObserver
global.window = window
global.document = window.document
global.navigator = window.navigator

// jsdom does not provide this method
window.Element.prototype.animate = () => ({
  finished: Promise.resolve(),
  addEventListener: () => {},
  removeEventListener: () => {},
})

snapshot.setResolveSnapshotPath(testFile => join(dirname(testFile), '__snapshots__', `${basename(testFile)}.snapshot`))

// for debugging
// process.on('beforeExit', () => console.log('Before exit event triggered'))
// process.on('exit', () => console.log('Exit event triggered'))
// process.on('uncaughtException', err => console.error('Unhandled exception:', err))
// process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason))
