import React, { useEffect, useState } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as compositor from '../compositor/index.js'
import * as windowManager from '../window-manager/index.js'
import {
  AppletEngine,
  AppletEnvironment,
  AppletThemeProvider,
  createAppletEngine,
  DEFAULT_APPLET_THEME,
  useAppletTheme,
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

  it('uses composition material for constructor and binder without splitting contexts', async () => {
    const applet = tree()
    const tracking = trackedEnvironment()
    applet.desktopEnvironment = tracking.environment
    let observedEngine
    let observedTheme
    const deckModels = []
    const theme = { ...DEFAULT_APPLET_THEME, backgroundColor: 'navy' }
    applet.meta.theme = theme
    const composition = {
      Provider: ({ children }) => <section data-runtime-provider="">{children}</section>,
      Boundary: ({ children }) => <main data-composition-boundary="">{children}</main>,
      ThemeProvider: ({ children, ...props }) => <AppletThemeProvider {...props}>{children}</AppletThemeProvider>,
      DeckSurface: (model) => { deckModels.push(model); return null },
      rootDefaults: { Record: Object.freeze({}) },
    }
    const Binding = createAppletEngine(applet, { composition })
    const engine = Binding.create({ applet, desktopEnvironment: tracking.environment })
    engines.push(engine)
    function Probe() {
      observedEngine = AppletEngine.use()
      observedTheme = useAppletTheme()
      return <Binding><output>{Binding.use().rootApplicationId}</output></Binding>
    }
    const destroy = tracking.destroy
    const mounted = render(<Binding engine={engine}><Probe /></Binding>)
    expect(observedEngine).toBe(engine)
    expect(observedTheme).toEqual(theme)
    expect(engine.rootApplet.Record).toBe(composition.rootDefaults.Record)
    expect(mounted.container.querySelector('[data-runtime-provider]')).not.toBeNull()
    expect(deckModels[0]).toMatchObject({ addable: false, menuOpen: false, unmountable: false })
    expect(deckModels[0].composition.childSurfaces).toHaveLength(1)
    expect(typeof deckModels[0].departChild).toBe('function')
    mounted.unmount()
    await act(async () => {})
    expect(destroy).not.toHaveBeenCalled()
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
    const Inner = createAppletEngine(innerApplet, { composition: {
      Provider({ children }) {
        return <section data-composition-owner={AppletEngine.use().rootApplicationId}>{children}</section>
      },
    } })
    const Outer = createAppletEngine(outerApplet)
    const injected = Inner.create({ applet: innerApplet, desktopEnvironment: innerTracking.environment, scheme: 'day' })
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
      <Inner engine={injected} scheme="night"><Probe /></Inner>
    </Outer>)
    expect(observed.engine).toBe(injected)
    expect(observed.optionalEngine).toBe(injected)
    expect(observed.application.applicationId).toBe(injected.rootApplicationId)
    expect(observed.ownership).toBe(false)
    expect(observed.theme).toBe(injected.runtime.themeFor(injected.compositor.surface.read({ surfaceId: injected.rootSurfaceId })))
    expect(observed.theme).toMatchObject({ backgroundColor: 'blue', selectedScheme: 'night' })
    expect(injected.appletState.read({ applicationId: injected.rootApplicationId, stateName: 'draft' })).toBe('inner draft')
    expect(outer.appletState.read({ applicationId: outer.rootApplicationId, stateName: 'draft' })).toBeUndefined()
    expect(view.container.querySelector('[data-inner-draft]').closest('[data-composition-owner]').dataset.compositionOwner)
      .toBe(injected.rootApplicationId)
    view.unmount()
    await act(async () => {})
    expect(outerTracking.destroy).toHaveBeenCalledOnce()
    expect(innerTracking.destroy).not.toHaveBeenCalled()
    expect(injected.runtime.getScheme()).toBe('night')
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
        <Binding engine={engine} scheme="nested-does-not-select"><Probe /></Binding>
      </Binding.Application>
    </Binding>)
    expect(observed).toBe(child)
    expect(engine.runtime.getScheme()).toBeUndefined()
    view.unmount()
  })

  it('updates material resolved by a nested engine consumer without replacing its engine', () => {
    const applet = tree()
    applet.meta.theme = {
      ...DEFAULT_APPLET_THEME,
      reconcile: (identity, scheme) => ({ ...identity, canvasColor: scheme }),
    }
    const Binding = createAppletEngine(applet)
    let engine
    let observedTheme
    function Probe() { observedTheme = useAppletTheme(); return null }
    function OccurrenceOwner() {
      engine = Binding.use()
      const root = engine.compositor.surface.read({ surfaceId: engine.rootSurfaceId })
      return <AppletThemeProvider theme={engine.runtime.themeFor(root)}><Probe /></AppletThemeProvider>
    }
    const view = render(<Binding scheme="day"><Binding><OccurrenceOwner /></Binding></Binding>)
    const originalEngine = engine
    expect(observedTheme.canvasColor).toBe('day')
    act(() => engine.runtime.setScheme('night'))
    expect(engine).toBe(originalEngine)
    expect(observedTheme.canvasColor).toBe('night')
    expect(observedTheme).toBe(engine.runtime.themeFor(engine.compositor.surface.read({ surfaceId: engine.rootSurfaceId })))
    view.unmount()
  })

  it.each([false, true])('publishes live scheme material through binder and composition without replacing the runtime (injected=%s)', async (injected) => {
    const applet = tree()
    const tracking = trackedEnvironment()
    applet.desktopEnvironment = tracking.environment
    const reconcile = vi.fn((identity, scheme) => ({ ...identity, canvasColor: scheme }))
    applet.meta.theme = { ...DEFAULT_APPLET_THEME, reconcile }
    const suppliedThemes = []
    const composition = {
      ThemeProvider({ children, theme, themeRoot }) {
        suppliedThemes.push(theme)
        return <AppletThemeProvider theme={theme} themeRoot={themeRoot}>{children}</AppletThemeProvider>
      },
    }
    const Binding = createAppletEngine(applet, { composition })
    const external = injected ? Binding.create({ applet, desktopEnvironment: tracking.environment, scheme: 'day' }) : undefined
    if (external) engines.push(external)
    let engine
    let observedTheme
    function Probe() {
      engine = Binding.use()
      observedTheme = useAppletTheme()
      return <Binding scheme="nested-does-not-select"><output>{observedTheme.canvasColor}</output></Binding>
    }
    const renderBinding = (scheme) => <Binding engine={external} scheme={scheme}><Probe /></Binding>
    const view = render(renderBinding('day'))
    const originalEngine = engine
    const rootSurface = engine.compositor.surface.read({ surfaceId: engine.rootSurfaceId })
    const initialTheme = engine.runtime.themeFor(rootSurface)
    expect(observedTheme).toBe(initialTheme)
    expect(suppliedThemes.every((theme) => theme === initialTheme)).toBe(true)
    expect(reconcile).toHaveBeenCalledOnce()
    fireEvent.change(view.getByRole('textbox', { name: 'note' }), { target: { value: 'retained' } })
    const snapshot = engine.checkpoint.getSnapshot()
    view.rerender(renderBinding('night'))
    expect(engine).toBe(originalEngine)
    expect(observedTheme).toBe(engine.runtime.themeFor(rootSurface))
    expect(observedTheme.canvasColor).toBe('night')
    expect(engine.runtime.getScheme()).toBe('night')
    expect(view.getByRole('textbox', { name: 'note' }).value).toBe('retained')
    expect(engine.checkpoint.getSnapshot()).toBe(snapshot)
    expect(reconcile).toHaveBeenCalledTimes(2)
    view.rerender(renderBinding('night'))
    expect(reconcile).toHaveBeenCalledTimes(2)
    act(() => engine.runtime.setScheme('day'))
    expect(observedTheme).toBe(initialTheme)
    expect(reconcile).toHaveBeenCalledTimes(2)
    view.unmount()
    await act(async () => {})
    expect(tracking.destroy).toHaveBeenCalledTimes(injected ? 0 : 1)
    if (!injected) expect(() => engine.runtime.themeFor(rootSurface)).toThrow('destroyed')
    else expect(engine.runtime.themeFor(rootSurface)).toBe(initialTheme)
  })

  it('rejects non-boolean admission at the recipe boundary', () => {
    expect(() => AppletEngine.create({ applet: tree({ addable: 'yes' }), desktopEnvironment: environment }))
      .toThrow('addable must be a boolean')
  })

  it('keeps raw injected root references visible outside a definition composition boundary', () => {
    const applet = tree()
    const composition = { Boundary: () => null }
    const engine = AppletEngine.create({ applet, desktopEnvironment: environment, composition })
    engines.push(engine)
    const view = render(
      <AppletEnvironment desktopEnvironment={environment}>
        <AppletEngine applet={applet} engine={engine} />
      </AppletEnvironment>,
    )
    expect(view.getByRole('textbox', { name: 'note' }).value).toBe('draft')
    view.unmount()
    const Binding = createAppletEngine(applet, { composition })
    const bound = render(<Binding engine={engine} />)
    expect(bound.queryByRole('textbox', { name: 'note' })).toBeNull()
  })
})
