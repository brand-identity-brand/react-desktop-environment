import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { IDBFactory } from 'fake-indexeddb'
import * as desktop from 'react-desktop-environment'
import * as compositor from 'react-desktop-environment/compositor'
import * as windowManager from 'react-desktop-environment/window-manager'
import * as windowReact from 'react-desktop-environment/window-manager/react'
import * as ui from 'react-desktop-environment/ui'
import {
  AppletEngine,
  AppletStateStoreContext,
  createAppletEngine,
  createAppletStateStore,
  DEFAULT_APPLET_THEME,
  useAppletTheme,
} from 'react-desktop-environment/applet-engine'
import { createAppletPersistence, resolveInitialAppletCheckpoint } from 'react-desktop-environment/applet-persistence'
import { createIndexedDbAppletStore } from 'react-desktop-environment/applet-persistence/indexed-db'

const installed = fileURLToPath(import.meta.resolve('react-desktop-environment/applet-engine'))
assert.match(installed, /node_modules\/react-desktop-environment\/dist\/applet-engine\.js$/)
assert.equal(realpathSync(installed), installed)
assert.equal(typeof windowManager.createWindowManager, 'function')
assert.equal(typeof compositor.createCompositor, 'function')
assert.ok(Object.keys(desktop).length && Object.keys(windowReact).length && Object.keys(ui).length)
const dom = new JSDOM('<!doctype html><div id="root"></div>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const environment = { compositor, windowManager, ui: { Window: ({ children }) => children } }
const h = React.createElement
let currentEngine
let edit
let noteApplication
let observedTheme
function Note({ application }) {
  const [value, setValue] = AppletEngine.useState('original', 'text')
  noteApplication = application
  edit = setValue
  observedTheme = useAppletTheme()
  return h('output', null, value)
}
Note.meta = Object.freeze({ applicationName: 'note' })
Note.applets = Object.freeze({})
function Notebook() { return null }
Notebook.meta = Object.freeze({
  applicationName: 'notebook',
  theme: Object.freeze({ ...DEFAULT_APPLET_THEME, backgroundColor: 'navy' }),
})
Notebook.applets = Object.freeze({ note: Note })
Notebook.recipes = Object.freeze([Object.freeze({ name: 'notes', addable: true, residents: [{ applet: 'note' }] })])
Notebook.desktopEnvironment = environment
const BoundEngine = createAppletEngine(Notebook)
assert.equal(BoundEngine.Runtime, AppletEngine)
const root = createRoot(document.getElementById('root'))
await act(async () => {
  root.render(h(BoundEngine, { onEngine: (engine) => { currentEngine = engine } }))
})
assert.equal(document.querySelector('output').textContent, 'original')
assert.equal(observedTheme.backgroundColor, 'navy')
const originalEngine = currentEngine
const originalApplicationId = noteApplication.applicationId
const originalSurface = Object.values(currentEngine.compositor.getSnapshot().surfaces)
  .find(({ applicationId }) => applicationId === originalApplicationId)
const [deck] = currentEngine.compositor.surface.readChildren({ surfaceId: currentEngine.rootSurfaceId })
assert.equal(deck.props.addable, true)
await act(async () => { edit('retained') })
await act(async () => {
  currentEngine.compositor.surface.update({ surfaceId: originalSurface.surfaceId, hidden: true })
  currentEngine.compositor.surface.update({ surfaceId: originalSurface.surfaceId, hidden: false })
})
assert.equal(noteApplication.applicationId, originalApplicationId)
assert.equal(document.querySelector('output').textContent, 'retained')
const saved = currentEngine.checkpoint.capture()
assert.equal(saved.snapshot.find(({ surfaceId }) => surfaceId === originalSurface.surfaceId).appletState.text, 'retained')
currentEngine.checkpoint.release(saved)
await act(async () => { root.unmount() })
const restored = AppletEngine.create({ applet: Notebook, desktopEnvironment: environment, options: { initialState: saved.snapshot } })
assert.equal(restored.rootSurfaceId, originalEngine.rootSurfaceId)
assert.equal(restored.compositor.surface.read({ surfaceId: originalSurface.surfaceId }).applicationId, originalApplicationId)
const restoredRoot = createRoot(document.getElementById('root'))
await act(async () => { restoredRoot.render(h(BoundEngine, { engine: restored })) })
assert.equal(document.querySelector('output').textContent, 'retained')
assert.equal(restored.checkpoint.isDirty(), false)
const store = createIndexedDbAppletStore({ databaseName: 'independent-checkpoints', indexedDB: new IDBFactory() })
await store.write({ scopeId: 'scope:one', checkpoint: saved.snapshot })
const initial = await resolveInitialAppletCheckpoint({ scopeId: 'scope:one', localStore: store, globalCheckpoint: saved.snapshot })
assert.equal(JSON.stringify(initial.checkpoint), JSON.stringify(saved.snapshot))
const recovery = createAppletPersistence({ scopeId: 'scope:one', source: restored.checkpoint, store })
assert.equal((await recovery.flush()).ok, true)
assert.equal((await recovery.dispose({ flush: true })).ok, true)
const columnState = { applicationId: originalApplicationId, stateName: 'columns' }
restored.appletState.ensure({ ...columnState, initialValue: ['product'] })
restored.checkpoint.getSnapshot()
restored.appletState.ensure({
  ...columnState,
  initialValue: ['mixed'],
  adopt: (value) => value.every((column) => column === 'mixed') ? value : undefined,
  deferNotifications: true,
})
const adopted = restored.checkpoint.capture()
assert.equal(JSON.stringify(adopted.snapshot.find(({ application }) => application.applicationId === originalApplicationId).appletState.columns), JSON.stringify(['mixed']))
assert.equal(restored.checkpoint.isDirty(), false)
restored.checkpoint.release(adopted)
await act(async () => { restoredRoot.unmount() })
restored.compositor.destroy()

const selectionStore = createAppletStateStore({ applications: { note: noteApplication } })
function Selection({ catalogue }) {
  const [columns] = AppletEngine.useState(catalogue, 'selectedColumns', {
    adopt: (value) => value.every((column) => catalogue.includes(column)) ? value : undefined,
  })
  return h('output', null, columns.join(','))
}
const selection = (catalogue) => h(AppletStateStoreContext.Provider, { value: selectionStore },
  h(AppletEngine.Application, { application: noteApplication },
    h(Selection, { catalogue, key: catalogue.join(',') }),
  ),
)
const selectionRoot = createRoot(document.getElementById('root'))
const errors = []
const originalError = console.error
console.error = (...args) => errors.push(args)
try {
  await act(async () => { selectionRoot.render(selection(['product'])) })
  await act(async () => { selectionRoot.render(selection(['mixed'])) })
  assert.equal(document.querySelector('output').textContent, 'mixed')
  assert.equal(JSON.stringify(selectionStore.snapshot(noteApplication.applicationId)), JSON.stringify({ selectedColumns: ['mixed'] }))
  assert.deepEqual(errors, [])
} finally {
  await act(async () => { selectionRoot.unmount() })
  console.error = originalError
}
dom.window.close()
console.log('Packed ESM entries, independent Applet tree, shared React/context, identity, state, replacement adoption, checkpoint restoration, and explicit recovery passed.')
