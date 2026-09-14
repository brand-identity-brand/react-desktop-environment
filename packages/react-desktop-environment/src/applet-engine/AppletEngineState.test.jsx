/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest'
import * as compositor from '../compositor/index.js'
import * as ui from '../ui/index.js'
import * as windowManager from '../window-manager/index.js'
import AppletEngine from './AppletEngine.jsx'
import { DEFAULT_APPLET_THEME } from './AppletTheme.jsx'

const desktopEnvironment = Object.freeze({ compositor, ui, windowManager })

function RootApplet() {}
RootApplet.meta = Object.freeze({ applicationName: 'root' })
function ChildApplet() {}
ChildApplet.meta = Object.freeze({ applicationName: 'child' })
ChildApplet.applets = Object.freeze({})
RootApplet.applets = Object.freeze({ child: ChildApplet })

function idFactory(prefix) {
  let sequence = 0
  return (kind) => `${kind}:${prefix}-${++sequence}`
}

function createEngine(options = {}) {
  return AppletEngine.create({
    applet: RootApplet,
    desktopEnvironment,
    options: {
      createId: idFactory('test'),
      ...options,
    },
  })
}

function capture(engine) {
  const handle = engine.checkpoint.capture()
  try {
    return handle.snapshot
  } finally {
    engine.checkpoint.release(handle)
  }
}

describe('AppletEngine Surface state checkpoint', () => {
  it('restores an occurrence root after movement into another theme root', () => {
    function Origin() {}
    Origin.meta = Object.freeze({
      applicationName: 'origin',
      theme: Object.freeze({ ...DEFAULT_APPLET_THEME, backgroundColor: 'red' }),
    })
    function Destination() {}
    Destination.meta = Object.freeze({
      applicationName: 'destination',
      theme: Object.freeze({ ...DEFAULT_APPLET_THEME, backgroundColor: 'blue' }),
    })
    function Root() {}
    Root.meta = Object.freeze({ applicationName: 'root' })
    Root.applets = Object.freeze({
      child: ChildApplet,
      origin: Origin,
      destination: Destination,
    })
    const create = (options = {}) => AppletEngine.create({
      applet: Root,
      desktopEnvironment,
      options,
    })
    const source = create()
    let restored
    try {
      const open = (applicationName, ownerSurfaceId) => {
        const application = source.runtime.createApplicationInstance({ applicationName })
        return source.runtime.createReferenceSurface({
          applicationId: application.applicationId,
          ownerSurfaceId,
        })
      }
      const origin = open('root/origin', source.rootSurfaceId)
      const destination = open('root/destination', source.rootSurfaceId)
      const child = open('root/child', origin.surfaceId)
      source.compositor.surface.readControls({ surfaceId: child.surfaceId })
        .reparent(destination.surfaceId)
      const initialState = capture(source)
      expect(initialState.find(({ surfaceId }) => surfaceId === child.surfaceId).props.themeRoot)
        .toBe('root/origin')

      restored = create({ initialState })
      const occurrence = restored.compositor.surface.read({ surfaceId: child.surfaceId })
      expect(occurrence.window.parentWindowId).toBe(destination.windowId)
      expect(occurrence.props.themeRoot).toBe('root/origin')
      expect(restored.runtime.themeFor(occurrence)).toBe(Origin.meta.theme)
      expect(capture(restored)).toEqual(initialState)
    } finally {
      restored?.compositor.destroy()
      source.compositor.destroy()
    }
  })

  it('ends a permanent Application state when its last Surface closes', () => {
    const engine = createEngine()
    const application = engine.runtime.childApplication(
      engine.applicationInstances.root, 'child',
    )
    const open = () => engine.runtime.createReferenceSurface({
      applicationId: application.applicationId,
      ownerSurfaceId: engine.rootSurfaceId,
    })
    const first = open()
    const state = { applicationId: application.applicationId, stateName: 'title' }
    engine.appletState.write({ ...state, value: 'ended' })

    engine.compositor.surface.readControls({ surfaceId: first.surfaceId }).close()

    expect(engine.appletState.snapshot(application.applicationId)).toEqual({})
    expect(capture(engine).some(({ application: saved }) => (
      saved.applicationId === application.applicationId
    ))).toBe(false)
    open()
    expect(engine.appletState.ensure({ ...state, initialValue: 'fresh' })).toBe('fresh')
  })

  it('ends a dynamic child state while its parent remains reachable', () => {
    const engine = createEngine()
    const parent = engine.runtime.createApplicationInstance({ applicationName: 'root' })
    const parentSurface = engine.runtime.createReferenceSurface({
      applicationId: parent.applicationId, ownerSurfaceId: engine.rootSurfaceId,
    })
    const child = engine.runtime.childApplication(parent, 'child')
    const childSurface = engine.runtime.createReferenceSurface({
      applicationId: child.applicationId, ownerSurfaceId: parentSurface.surfaceId,
    })
    for (const application of [parent, child]) {
      engine.appletState.write({
        applicationId: application.applicationId, stateName: 'title', value: 'saved',
      })
    }

    engine.compositor.surface.readControls({ surfaceId: childSurface.surfaceId }).close()

    expect(engine.appletState.snapshot(child.applicationId)).toEqual({})
    expect(engine.appletState.snapshot(parent.applicationId)).toEqual({ title: 'saved' })
    expect(engine.runtime.childApplication(parent, 'child').applicationId)
      .toBe(child.applicationId)
  })

  it('keeps state through reparenting and until the last Surface closes', () => {
    const engine = createEngine()
    const application = engine.runtime.childApplication(engine.applicationInstances.root, 'child')
    const first = engine.runtime.createReferenceSurface({
      applicationId: application.applicationId, ownerSurfaceId: engine.rootSurfaceId,
    })
    const second = engine.runtime.createReferenceSurface({
      applicationId: application.applicationId, ownerSurfaceId: engine.rootSurfaceId,
    })
    engine.appletState.write({
      applicationId: application.applicationId, stateName: 'title', value: 'saved',
    })
    engine.compositor.surface.readControls({ surfaceId: first.surfaceId })
      .reparent(second.surfaceId)
    expect(engine.appletState.snapshot(application.applicationId)).toEqual({ title: 'saved' })
    engine.compositor.surface.readControls({ surfaceId: first.surfaceId }).close()
    expect(engine.appletState.snapshot(application.applicationId)).toEqual({ title: 'saved' })
  })

  it('captures the complete Root state as one Surface array', () => {
    const engine = createEngine()
    engine.appletState.write({
      applicationId: engine.rootApplicationId,
      stateName: 'selection',
      value: 'saved',
    })

    const state = capture(engine)
    expect(Array.isArray(state)).toBe(true)
    expect(state).toHaveLength(1)
    expect(state[0]).toMatchObject({
      surfaceId: engine.rootSurfaceId,
      application: {
        applicationId: engine.rootApplicationId,
        applicationName: 'root',
        permanent: true,
        root: true,
      },
      appletState: { selection: 'saved' },
      window: {
        parentWindowId: null,
        windowId: engine.rootWindowId,
      },
    })
    expect(state).not.toHaveProperty('runtime')
    expect(state).not.toHaveProperty('appletState')
    expect(engine.runtime.setApplicationInput).toBeUndefined()
    expect(engine.runtime.checkpoint).toBeUndefined()
    expect(engine.rootAppletCheckpoint).toBeUndefined()
    expect(engine.appletState.getSnapshot).toBeUndefined()
  })

  it('orders multiple Surfaces of the Root Application consistently through save and adoption', () => {
    const source = createEngine()
    let restored
    try {
      source.runtime.createReferenceSurface({
        applicationId: source.rootApplicationId,
        ownerSurfaceId: source.rootSurfaceId,
      })
      const submitted = source.checkpoint.capture()
      source.checkpoint.markClean(submitted)
      expect(source.checkpoint.isDirty()).toBe(false)
      restored = createEngine({ initialState: submitted.snapshot, cleanState: submitted.snapshot })
      expect(restored.checkpoint.isDirty()).toBe(false)
      expect(capture(restored)).toEqual(submitted.snapshot)
      source.checkpoint.release(submitted)
    } finally {
      restored?.compositor.destroy()
      source.compositor.destroy()
    }
  })

  it('restores recognized named state and lets owners default missing state', () => {
    const source = createEngine()
    source.appletState.write({
      applicationId: source.rootApplicationId,
      stateName: 'selection',
      value: 'saved',
    })
    const initialState = capture(source)
    const restored = createEngine({ initialState })

    expect(restored.appletState.ensure({
      applicationId: restored.rootApplicationId,
      initialValue: 'default',
      stateName: 'selection',
    })).toBe('saved')
    expect(restored.appletState.ensure({
      applicationId: restored.rootApplicationId,
      initialValue: 'default',
      stateName: 'newChoice',
    })).toBe('default')
    expect(capture(restored)[0].appletState).toEqual({
      newChoice: 'default',
      selection: 'saved',
    })
  })

  it('treats null and empty Surface state as the same absence', () => {
    const fromNull = createEngine({ initialState: null })
    const fromEmpty = createEngine({ initialState: [] })
    expect(capture(fromEmpty)).toEqual(capture(fromNull))

    const saved = capture(createEngine())
    const nullBaseline = createEngine({
      cleanState: null,
      initialState: saved,
    })
    const emptyBaseline = createEngine({
      cleanState: [],
      initialState: saved,
    })
    expect(emptyBaseline.checkpoint.isDirty())
      .toBe(nullBaseline.checkpoint.isDirty())
  })

  it('ignores obsolete entries without losing the recognized Root entry', () => {
    const source = createEngine()
    const initialState = [
      ...capture(source),
      {
        surfaceId: 'surface:obsolete',
        application: {
          applicationId: 'application:obsolete',
          applicationName: 'obsolete',
        },
        appletState: { unsafe: true },
        window: {
          parentWindowId: null,
          windowId: 'window:obsolete',
        },
      },
    ]
    const restored = createEngine({ initialState })
    expect(capture(restored).some(({ application }) => (
      application.applicationName === 'obsolete'
    ))).toBe(false)
    expect(restored.rootSurfaceId).toBe(source.rootSurfaceId)
  })

  it('does not checkpoint live Application props', () => {
    const engine = createEngine()
    const onActivate = vi.fn()
    const application = engine.runtime.createApplicationInstance({
      applicationName: 'root',
      props: { onActivate },
    })
    engine.runtime.createReferenceSurface({
      applicationId: application.applicationId,
      ownerSurfaceId: engine.rootSurfaceId,
      workspaceId: 'root',
    })

    const entry = capture(engine).find(({ application: saved }) => (
      saved.applicationId === application.applicationId
    ))
    expect(entry.application).not.toHaveProperty('props')
    expect(entry.appletState).toEqual({})
  })

  it('compares dirtiness against the exact Surface array baseline', () => {
    const source = createEngine()
    const initialState = capture(source)
    const engine = createEngine({ cleanState: initialState, initialState })
    expect(engine.checkpoint.isDirty()).toBe(false)

    const root = engine.compositor.surface.read({
      surfaceId: engine.rootSurfaceId,
    })
    engine.compositor.surface.update({
      surfaceId: root.surfaceId,
      zIndex: root.zIndex + 1,
    })
    expect(engine.checkpoint.isDirty()).toBe(true)
    engine.compositor.surface.update({
      surfaceId: root.surfaceId,
      zIndex: root.zIndex,
    })
    expect(engine.checkpoint.isDirty()).toBe(false)
  })
})


describe('owner-declared lifetime supply', () => {
  const declare = (engine, stateName, initialValue = 'default', adopt) => engine.appletState.ensure({
    applicationId: engine.rootApplicationId, initialValue, stateName, adopt,
  })
  const set = (engine, stateName, value, supply) => engine.appletState.write({
    applicationId: engine.rootApplicationId, stateName, value, supply,
  })
  const suppliedChild = (engine) => engine.runtime.createReferenceSurface({
    applicationId: engine.runtime.childApplication(engine.applicationInstances.root, 'child').applicationId,
    ownerSurfaceId: engine.rootSurfaceId,
    supply: { applicationId: engine.rootApplicationId },
  })

  it('keeps later occurrence, selection, geometry and state supply separate from ordinary edits', () => {
    const engine = createEngine()
    try {
      expect(engine.checkpoint.isDirty()).toBe(false)
      declare(engine, 'choice')
      set(engine, 'choice', 'edited')
      const child = suppliedChild(engine)
      engine.runtime.selectChild({
        surfaceId: engine.rootSurfaceId, childSurfaceId: child.surfaceId,
        supply: { surfaceId: engine.rootSurfaceId },
      })
      engine.compositor.surface.readControls({ surfaceId: child.surfaceId }).resize({
        size: { width: 400, height: 300 },
      }, { supply: { surfaceId: child.surfaceId } })
      declare(engine, 'later', { id: 'operation-1' })
      expect(engine.checkpoint.isDirty()).toBe(true)
      set(engine, 'choice', 'default')
      expect(engine.checkpoint.isDirty()).toBe(false)
      set(engine, 'later', { id: 'completed' }, { applicationId: engine.rootApplicationId })
      expect(engine.checkpoint.isDirty()).toBe(false)
      expect(JSON.stringify(capture(engine))).not.toContain('supply')
    } finally { engine.compositor.destroy() }
  })

  it('adopts independently saved structures and named values without keeping obsolete material', () => {
    const source = createEngine()
    declare(source, 'choice', 'global')
    const saved = capture(source).map((entry) => ({
      ...entry, obsoleteSurfaceField: true,
      window: { ...entry.window, obsoleteWindowField: true },
      selectedChildSurfaceId: 'unavailable',
      appletState: { choice: 'global', invalid: 'obsolete', removed: true },
    }))
    const adopt = (value) => typeof value === 'number' ? value : undefined
    for (const localChoice of ['global', 'local']) {
      const local = saved.map((entry) => ({ ...entry, appletState: { ...entry.appletState, choice: localChoice } }))
      const engine = createEngine({ initialState: local, cleanState: saved })
      try {
        declare(engine, 'choice')
        declare(engine, 'invalid', 7, adopt)
        expect(capture(engine)[0].appletState).toEqual({ choice: localChoice, invalid: 7 })
        expect(engine.checkpoint.isDirty()).toBe(localChoice !== 'global')
        set(engine, 'choice', 'global')
        expect(engine.checkpoint.isDirty()).toBe(false)
      } finally { engine.compositor.destroy() }
    }
    source.compositor.destroy()
  })

  it('retains a clean-only occurrence independently of the chosen local checkpoint', () => {
    const source = createEngine()
    suppliedChild(source)
    const global = capture(source)
    const local = global.filter((entry) => entry.application.root)
    const engine = createEngine({ initialState: local, cleanState: global })
    try {
      declare(engine, 'late')
      expect(engine.checkpoint.isDirty()).toBe(true)
      const submitted = engine.checkpoint.capture()
      engine.checkpoint.markClean(submitted)
      expect(engine.checkpoint.isDirty()).toBe(false)
      engine.checkpoint.release(submitted)
    } finally {
      source.compositor.destroy()
      engine.compositor.destroy()
    }
  })

  it('distinguishes a supplied obsolete global checkpoint from an absent global save', () => {
    const obsolete = [{
      surfaceId: 'old-surface', application: { applicationId: 'old-app', applicationName: 'obsolete' },
      window: { windowId: 'old-window', parentWindowId: null }, appletState: {},
    }]
    const adopted = createEngine({ initialState: obsolete, cleanState: obsolete })
    const localOnly = createEngine({ initialState: obsolete, cleanState: null })
    try {
      declare(adopted, 'late')
      declare(localOnly, 'late')
      expect(adopted.checkpoint.isDirty()).toBe(false)
      expect(localOnly.checkpoint.isDirty()).toBe(true)
    } finally {
      adopted.compositor.destroy()
      localOnly.compositor.destroy()
    }
  })

  it('keeps local-only recovery unsaved through supply and marks only the submitted capture', () => {
    const source = createEngine()
    const engine = createEngine({ initialState: capture(source), cleanState: null })
    try {
      declare(engine, 'request', 'pending')
      suppliedChild(engine)
      expect(engine.checkpoint.isDirty()).toBe(true)
      const submitted = engine.checkpoint.capture()
      set(engine, 'request', 'completed', { applicationId: engine.rootApplicationId })
      declare(engine, 'late')
      engine.checkpoint.markClean(submitted)
      expect(engine.checkpoint.isDirty()).toBe(true)
      set(engine, 'request', 'pending')
      expect(engine.checkpoint.isDirty()).toBe(true)
      const current = engine.checkpoint.capture()
      engine.checkpoint.markClean(current)
      expect(engine.checkpoint.isDirty()).toBe(false)
      engine.checkpoint.release(submitted)
      engine.checkpoint.release(current)
    } finally {
      source.compositor.destroy()
      engine.compositor.destroy()
    }
  })

  it('does not absorb supply or ordinary edits that arrive after a submitted save', () => {
    const engine = createEngine()
    try {
      declare(engine, 'ordinary')
      declare(engine, 'request', 'pending')
      const submitted = engine.checkpoint.capture()
      set(engine, 'ordinary', 'edited')
      set(engine, 'request', 'completed', { applicationId: engine.rootApplicationId })
      engine.checkpoint.markClean(submitted)
      set(engine, 'ordinary', 'default')
      expect(engine.checkpoint.isDirty()).toBe(true)
      set(engine, 'request', 'retained', { applicationId: engine.rootApplicationId })
      expect(engine.checkpoint.isDirty()).toBe(false)
      engine.checkpoint.release(submitted)
    } finally { engine.compositor.destroy() }
  })

  it('keeps an occurrence supplied after a capture outside that successful save', () => {
    const engine = createEngine()
    try {
      const submitted = engine.checkpoint.capture()
      const child = suppliedChild(engine)
      engine.checkpoint.markClean(submitted)
      engine.appletState.ensure({
        applicationId: child.applicationId, stateName: 'later', initialValue: 'default',
      })
      expect(engine.checkpoint.isDirty()).toBe(true)
      engine.compositor.surface.readControls({ surfaceId: child.surfaceId }).close()
      expect(engine.checkpoint.isDirty()).toBe(false)
      engine.checkpoint.release(submitted)
    } finally { engine.compositor.destroy() }
  })

  it('ends geometry and selection supply eligibility after ordinary replacement', () => {
    const engine = createEngine()
    try {
      const first = suppliedChild(engine)
      const second = suppliedChild(engine)
      const selection = { surfaceId: engine.rootSurfaceId }
      engine.runtime.selectChild({ ...selection, childSurfaceId: first.surfaceId, supply: selection })
      engine.runtime.selectChild({ ...selection, childSurfaceId: second.surfaceId })
      engine.runtime.selectChild({ ...selection, childSurfaceId: first.surfaceId, supply: selection })
      expect(engine.compositor.surface.read(selection).selectedChildSurfaceId).toBe(second.surfaceId)
      expect(engine.runtime.selectionSupply(selection)).toBeUndefined()
      const controls = engine.compositor.surface.readControls({ surfaceId: first.surfaceId })
      controls.resize({ size: { width: 400, height: 300 } }, { supply: { surfaceId: first.surfaceId } })
      controls.resize({ size: { width: 500, height: 300 } })
      controls.resize({ size: { width: 600, height: 300 } }, { supply: { surfaceId: first.surfaceId } })
      expect(engine.compositor.surface.read({ surfaceId: first.surfaceId }).size.width).toBe(500)
      expect(engine.checkpoint.isDirty()).toBe(true)
    } finally { engine.compositor.destroy() }
  })

  it('retains the creating owner supply eligibility for geometry supplied with an occurrence', () => {
    const engine = createEngine()
    try {
      const supply = { surfaceId: engine.rootSurfaceId }
      const child = engine.runtime.createReferenceSurface({
        applicationId: engine.runtime.childApplication(engine.applicationInstances.root, 'child').applicationId,
        ownerSurfaceId: engine.rootSurfaceId,
        position: { x: 10, y: 20 },
        size: { width: 400, height: 300 },
        supply,
      })
      const controls = engine.compositor.surface.readControls({ surfaceId: child.surfaceId })
      controls.resize({ position: { x: 70, y: 80 } })
      controls.resize({
        position: { x: 10, y: 20 },
        size: { width: 500, height: 300 },
      }, { supply })
      expect(engine.compositor.surface.read({ surfaceId: child.surfaceId })).toMatchObject({
        position: { x: 70, y: 80 },
        size: { width: 500, height: 300 },
      })
      expect(engine.checkpoint.isDirty()).toBe(true)
      controls.resize({ position: { x: 10, y: 20 } })
      expect(engine.checkpoint.isDirty()).toBe(false)
    } finally { engine.compositor.destroy() }
  })

  it('adopts supplied selection independently of an ordinarily moved child placement', () => {
    const engine = createEngine()
    try {
      const open = (ownerSurfaceId) => {
        const application = engine.runtime.createApplicationInstance({ applicationName: 'root/child' })
        return engine.runtime.createReferenceSurface({ applicationId: application.applicationId, ownerSurfaceId })
      }
      const first = open(engine.rootSurfaceId)
      const second = open(engine.rootSurfaceId)
      const child = open(first.surfaceId)
      const initial = engine.checkpoint.capture()
      engine.checkpoint.markClean(initial)
      const controls = engine.compositor.surface.readControls({ surfaceId: child.surfaceId })
      controls.reparent(second.surfaceId)
      engine.runtime.selectChild({
        childSurfaceId: child.surfaceId,
        surfaceId: second.surfaceId,
        supply: { surfaceId: second.surfaceId },
      })
      expect(capture(engine).find((entry) => entry.surfaceId === second.surfaceId).selectedChildSurfaceId)
        .toBe(child.surfaceId)
      expect(engine.checkpoint.isDirty()).toBe(true)

      controls.reparent(first.surfaceId)
      engine.runtime.selectChild({ childSurfaceId: null, surfaceId: second.surfaceId })
      expect(capture(engine)).toEqual(initial.snapshot)
      expect(engine.checkpoint.isDirty()).toBe(false)
      engine.checkpoint.release(initial)
    } finally { engine.compositor.destroy() }
  })
})
