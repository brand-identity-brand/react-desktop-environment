import { AppletPresentation, AppletThemeProvider, DEFAULT_APPLET_THEME, useAppletTheme } from '../ui/applet/index.js'
import React, { useEffect, useState } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as compositor from '../compositor/index.js'
import * as windowManager from '../window-manager/index.js'
import {
  AppletEngine,
  AppletEnvironment,
  createAppletEngine,
} from './index.js'

const environment = { compositor, windowManager, ui: { Window: ({ children }) => children } }
function trackedEnvironment() {
  const destroy = vi.fn()
  return {
    destroy,
    environment: {
      ...environment,
      compositor: {
        ...compositor,
        createCompositor(options) {
          const instance = compositor.createCompositor(options)
          return { ...instance, destroy() { destroy(); instance.destroy() } }
        },
      },
    },
  }
}
const engines = []
afterEach(() => {
  cleanup()
  engines.splice(0).forEach((engine) => engine.destroy())
})

function tree({ addable = false } = {}) {
  function Note() {
    const [draft, setDraft] = AppletEngine.useState('draft', 'draft')
    return <input aria-label="note" value={draft} onChange={(event) => setDraft(event.target.value)} />
  }
  Note.meta = { applicationName: 'note' }
  Note.applets = {}
  function Notebook() { return null }
  Notebook.meta = { applicationName: 'notebook' }
  Notebook.applets = { note: Note }
  Notebook.recipes = [Object.freeze({ name: 'notes', addable, residents: [{ applet: 'note' }] })]
  Notebook.desktopEnvironment = environment
  return Notebook
}

describe('independent Applet composition', () => {
  it('renders the registered Applet with supplied records and inherited state without creating another occurrence', () => {
    let received
    let inheritedEngine
    function Note(props) {
      received = props
      inheritedEngine = AppletEngine.use()
      const [draft, setDraft] = AppletEngine.useState('draft', 'draft')
      return <input aria-label="bound draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
    }
    Note.meta = { applicationName: 'note' }
    Note.applets = {}
    Note.desktopEnvironment = environment
    function Notebook() { return null }
    Notebook.meta = { applicationName: 'notebook' }
    Notebook.applets = { note: Note }
    const engine = AppletEngine.create({ applet: Notebook, desktopEnvironment: environment })
    engines.push(engine)
    const application = engine.runtime.createApplicationInstance({ applicationName: 'notebook/note' })
    const surface = engine.runtime.createReferenceSurface({ applicationId: application.applicationId, ownerSurfaceId: engine.rootSurfaceId })
    const initialSurfaces = Object.keys(engine.compositor.getSnapshot().surfaces)
    const view = render(<AppletEnvironment desktopEnvironment={environment}>
      <AppletEngine applet={Notebook} engine={engine}><AppletPresentation /></AppletEngine>
    </AppletEnvironment>)
    expect(received.application).toBe(application)
    expect(received.surface).toBe(surface)
    expect(inheritedEngine).toBe(engine)
    expect(received.window).toBe(surface.window)
    expect(received.controls).toBe(engine.compositor.surface.readControls({ surfaceId: surface.surfaceId }))
    fireEvent.change(view.getByRole('textbox', { name: 'bound draft' }), { target: { value: 'edited' } })
    expect(engine.appletState.read({ applicationId: application.applicationId, stateName: 'draft' })).toBe('edited')
    expect(Object.keys(engine.compositor.getSnapshot().surfaces)).toEqual(initialSurfaces)
  })

  it.each([false, true])('attaches the Applet directly and disposes only its owned runtime (injected=%s)', async (injected) => {
    const tracking = trackedEnvironment()
    let received
    let ownsEngine
    function Note(props) {
      received = Binding.useWhichApplet(props)
      ownsEngine = Binding.useOwnership()
      const { surface } = received
      return surface ? <output>{surface.surfaceId}</output> : null
    }
    Note.meta = { applicationName: 'note' }
    Note.applets = {}
    Note.desktopEnvironment = tracking.environment
    const Binding = createAppletEngine(Note)
    function Notebook() { return null }
    Notebook.meta = { applicationName: 'notebook' }
    Notebook.applets = { note: Note }
    const engine = injected ? AppletEngine.create({ applet: Notebook, desktopEnvironment: tracking.environment }) : undefined
    if (engine) engines.push(engine)
    const application = engine?.runtime.createApplicationInstance({ applicationName: 'notebook/note' })
    const view = render(<Binding engine={engine}><Note application={application} /></Binding>)
    const runtime = received.engine
    if (injected) {
      expect(runtime).toBe(engine)
      expect(received.application).toBe(application)
    }
    expect(ownsEngine).toBe(!injected)
    expect(received.surface.applicationId).toBe(received.application.applicationId)
    expect(view.getByRole('status').textContent).toBe(received.surface.surfaceId)
    view.unmount()
    await act(async () => {})
    expect(tracking.destroy).toHaveBeenCalledTimes(injected ? 0 : 1)
  })

  it('resets a directly owned runtime once and replaces its descendants even when record IDs repeat', async () => {
    const tracking = trackedEnvironment()
    let occurrence
    let releaseReset
    let sequence = 0
    const beforeResetRootApplet = vi.fn(() => new Promise((resolve) => { releaseReset = resolve }))
    const observeEngine = vi.fn()
    const createId = (kind) => `${kind}:${sequence++}`
    const options = { beforeResetRootApplet, createId }
    function Note(props) {
      occurrence = Binding.useWhichApplet(props)
      return <Draft />
    }
    Note.meta = { applicationName: 'note' }
    Note.applets = {}
    Note.desktopEnvironment = tracking.environment
    const Binding = createAppletEngine(Note)
    function Draft() {
      const [value, setValue] = Binding.useState('draft', 'draft')
      const [local, setLocal] = useState('initial')
      return <input aria-label="reset draft" data-local={local} value={value} onChange={(event) => {
        setValue(event.target.value)
        setLocal('edited')
      }} />
    }
    const view = render(<Binding options={options}><Note /></Binding>)
    const previousEngine = occurrence.engine
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'edited' } })
    view.rerender(<Binding options={options} onEngine={observeEngine}><Note /></Binding>)
    expect(observeEngine).toHaveBeenCalledExactlyOnceWith(previousEngine)
    view.rerender(<Binding options={options}><Note /></Binding>)
    expect(view.getByRole('textbox').value).toBe('edited')
    expect(view.getByRole('textbox').dataset.local).toBe('edited')
    const first = previousEngine.checkpoint.reset()
    const second = previousEngine.checkpoint.reset()
    expect(first).toBe(second)
    expect(beforeResetRootApplet).toHaveBeenCalledOnce()
    await act(async () => { sequence = 0; releaseReset(); await first })
    expect(occurrence.engine).not.toBe(previousEngine)
    expect(view.getByRole('textbox').value).toBe('draft')
    expect(view.getByRole('textbox').dataset.local).toBe('initial')
    expect(occurrence.engine.rootSurfaceId).toBe(previousEngine.rootSurfaceId)
    expect(tracking.destroy).toHaveBeenCalledOnce()
    expect(await previousEngine.checkpoint.reset()).toBe(false)
  })

  it('supplies independent resident admission and retains residents with ordinary members', () => {
    const applet = tree({ addable: true })
    const engine = AppletEngine.create({ applet, desktopEnvironment: environment })
    engines.push(engine)
    const [deck] = engine.compositor.surface.readChildren({ surfaceId: engine.rootSurfaceId })
    const [resident] = engine.compositor.surface.readChildren({ surfaceId: deck.surfaceId })
    const ordinary = engine.runtime.createApplicationInstance({ applicationName: 'notebook/note' })
    const added = engine.runtime.createReferenceSurface({
      applicationId: ordinary.applicationId,
      ownerSurfaceId: deck.surfaceId,
    })
    expect(deck.props.addable).toBe(true)
    expect(deck.props.unmountable).toBe(false)
    expect(added.props.resident).toBeUndefined()
    expect(engine.compositor.surface.readChildren({ surfaceId: deck.surfaceId }))
      .toHaveLength(2)
    expect(engine.compositor.surface.read({ surfaceId: resident.surfaceId })).toBeDefined()
    engine.runtime.selectChild({ surfaceId: deck.surfaceId, childSurfaceId: added.surfaceId })
    const snapshot = engine.checkpoint.getSnapshot()
    const restored = AppletEngine.create({ applet, desktopEnvironment: environment, options: { initialState: snapshot } })
    engines.push(restored)
    expect(restored.compositor.surface.read({ surfaceId: deck.surfaceId }))
      .toMatchObject({ selectedChildSurfaceId: added.surfaceId, props: { addable: true } })
    expect(restored.compositor.surface.read({ surfaceId: resident.surfaceId })).toBeDefined()
  })

  it('keeps owned engine and occurrence state while visual material withdraws', async () => {
    const applet = tree()
    const tracking = trackedEnvironment()
    applet.desktopEnvironment = tracking.environment
    let engine
    let setExposed
    let visualMounts = 0
    function Visual() {
      const [value, setValue] = AppletEngine.useState('draft', 'value')
      useEffect(() => { visualMounts += 1; return () => { visualMounts -= 1 } }, [])
      return <input aria-label="visual draft" value={value} onChange={(event) => setValue(event.target.value)} />
    }
    function RetainedOwner() {
      const [exposed, changeExposed] = useState(true)
      setExposed = changeExposed
      return exposed ? <Visual /> : null
    }
    const Binding = createAppletEngine(applet)
    const mounted = render(<Binding onEngine={(value) => { engine = value }}><RetainedOwner /></Binding>)
    const identity = engine.rootApplicationId
    fireEvent.change(mounted.getByRole('textbox', { name: 'visual draft' }), { target: { value: 'retained' } })
    act(() => setExposed(false))
    expect(visualMounts).toBe(0)
    expect(engine.rootApplicationId).toBe(identity)
    act(() => setExposed(true))
    expect(mounted.getByRole('textbox', { name: 'visual draft' }).value).toBe('retained')
    const destroy = tracking.destroy
    mounted.unmount()
    await act(async () => {})
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('hosts a distinct injected engine inside another runtime with its own canonical contexts', async () => {
    const outerApplet = tree()
    const innerApplet = tree()
    const outerTracking = trackedEnvironment()
    const innerTracking = trackedEnvironment()
    outerApplet.desktopEnvironment = outerTracking.environment
    innerApplet.desktopEnvironment = innerTracking.environment
    outerApplet.meta.theme = { ...DEFAULT_APPLET_THEME, backgroundColor: 'red' }
    innerApplet.meta.theme = {
      ...DEFAULT_APPLET_THEME,
      backgroundColor: 'blue',
      reconcile: (identity, scheme) => ({ ...identity, selectedScheme: scheme }),
    }
    const Inner = createAppletEngine(innerApplet)
    const Outer = createAppletEngine(outerApplet)
    const injected = Inner.create({ applet: innerApplet, desktopEnvironment: innerTracking.environment })
    engines.push(injected)
    let outer
    let observed
    function Probe() {
      const [draft] = Inner.useState('inner draft', 'draft')
      observed = {
        application: Inner.useApplication(),
        engine: Inner.use(),
        optionalEngine: Inner.useOptional(),
        ownership: Inner.useOwnership(),
        theme: useAppletTheme(),
      }
      return <output data-inner-draft="">{draft}</output>
    }
    const view = render(<Outer onEngine={(value) => { outer = value }}>
      <Inner engine={injected}><Probe /></Inner>
    </Outer>)
    expect(observed.engine).toBe(injected)
    expect(observed.optionalEngine).toBe(injected)
    expect(observed.application.applicationId).toBe(injected.rootApplicationId)
    expect(observed.ownership).toBe(false)
    expect(injected.appletState.read({ applicationId: injected.rootApplicationId, stateName: 'draft' })).toBe('inner draft')
    expect(outer.appletState.read({ applicationId: outer.rootApplicationId, stateName: 'draft' })).toBeUndefined()
    view.unmount()
    await act(async () => {})
    expect(outerTracking.destroy).toHaveBeenCalledOnce()
    expect(innerTracking.destroy).not.toHaveBeenCalled()
  })

  it('keeps the inherited Application context when a nested binding injects the same engine', () => {
    const applet = tree()
    const Binding = createAppletEngine(applet)
    const engine = Binding.create({ applet, desktopEnvironment: environment })
    engines.push(engine)
    const child = engine.runtime.childApplication(engine.compositor.application.read({ applicationId: engine.rootApplicationId }), 'note')
    let observed
    function Probe() { observed = Binding.useApplication(); return null }
    const view = render(<Binding engine={engine}>
      <Binding.Application application={child}>
        <Binding engine={engine}><Probe /></Binding>
      </Binding.Application>
    </Binding>)
    expect(observed).toBe(child)
    view.unmount()
  })

  it('rejects non-boolean admission at the recipe boundary', () => {
    expect(() => AppletEngine.create({ applet: tree({ addable: 'yes' }), desktopEnvironment: environment }))
      .toThrow('addable must be a boolean')
  })


})
