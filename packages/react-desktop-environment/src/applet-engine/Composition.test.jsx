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
  engines.splice(0).forEach((engine) => engine.compositor.destroy())
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
