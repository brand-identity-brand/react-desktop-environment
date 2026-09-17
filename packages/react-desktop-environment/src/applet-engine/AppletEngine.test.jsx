/* @vitest-environment jsdom */

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as compositor from '../compositor/index.js'
import * as ui from '../ui/index.js'
import * as windowManager from '../window-manager/index.js'
import AppletEngine from './AppletEngine.jsx'
import AppletEnvironment from './AppletEnvironment.jsx'
import {
  DEFAULT_APPLET_THEME,
  useAppletTheme,
  useAppletThemeRoot,
} from './AppletTheme.jsx'
const Record = Object.freeze({})
function Tab() { return null }

const desktopEnvironment = Object.freeze({ compositor, ui, windowManager })

function defineApplet(applicationName, applets = {}, metadata = {}) {
  function Applet() { return null }
  Applet.meta = Object.freeze({ applicationName, ...metadata })
  Applet.applets = Object.freeze(applets)
  return Applet
}

describe('AppletEngine definitions', () => {
  it('collects immutable recursive nodes from local Applet identities', () => {
    const ChildApplet = defineApplet('child')
    const RootApplet = defineApplet('root', { child: ChildApplet })

    const registry = AppletEngine.collectApplicationRegistry(RootApplet)

    expect(Object.keys(registry)).toEqual(['root', 'root/child', 'deck'])
    expect(registry.root).toMatchObject({
      Applet: RootApplet,
      applicationName: 'root',
      localName: 'root',
      parentApplicationName: null,
      path: 'root',
    })
    expect(registry.root.children).toEqual({ child: 'root/child' })
    expect(registry['root/child']).toMatchObject({
      Applet: ChildApplet,
      applicationName: 'root/child',
      localName: 'child',
      parentApplicationName: 'root',
      path: 'root/child',
    })
    expect(Object.isFrozen(registry)).toBe(true)
    expect(Object.isFrozen(registry.root)).toBe(true)
    expect(Object.isFrozen(registry.root.children)).toBe(true)
  })

  it('rejects a legacy top-level applicationName', () => {
    function LegacyApplet() {}
    LegacyApplet.applicationName = 'legacy'

    expect(() => AppletEngine.collectApplicationRegistry(LegacyApplet))
      .toThrow('The root Applet requires meta.applicationName')
  })

  it('adapts a standalone root without mutating its component', () => {
    const RootApplet = Object.freeze(function RootApplet() {})

    expect(RootApplet).not.toHaveProperty('Tab')
    expect(RootApplet).not.toHaveProperty('Record')
    const resolved = AppletEngine.resolveRootApplet(undefined, RootApplet, { Record, Tab })
    expect(resolved).not.toBe(RootApplet)
    expect(resolved.Tab).toBe(Tab)
    expect(resolved.Record).toBe(Record)
    expect(RootApplet).not.toHaveProperty('Tab')
    expect(RootApplet).not.toHaveProperty('Record')
  })

  it('preserves a supplied RootApplet and its component implementations', () => {
    const CustomRecord = {}
    function CustomTab() {}
    function RootApplet() {}
    RootApplet.Record = CustomRecord
    RootApplet.Tab = CustomTab

    expect(AppletEngine.resolveRootApplet(RootApplet)).toBe(RootApplet)
    expect(RootApplet.Record).toBe(CustomRecord)
    expect(RootApplet.Tab).toBe(CustomTab)
  })

  it.each([
    ['bad/name', 'lowercase kebab-case'],
    ['BadName', 'lowercase kebab-case'],
    ['two words', 'lowercase kebab-case'],
  ])('rejects an invalid application segment %s', (applicationName, message) => {
    const RootApplet = defineApplet(applicationName)
    expect(() => AppletEngine.collectApplicationRegistry(RootApplet))
      .toThrow(message)
  })

  it('rejects invalid child registry keys', () => {
    const ChildApplet = defineApplet('actual-name')
    const RootApplet = defineApplet('root', { expectedName: ChildApplet })

    expect(() => AppletEngine.collectApplicationRegistry(RootApplet))
      .toThrow('lowercase kebab-case')
  })

  it('rejects child registry keys that disagree with child metadata', () => {
    const ChildApplet = defineApplet('actual-name')
    const RootApplet = defineApplet('root', { expected: ChildApplet })

    expect(() => AppletEngine.collectApplicationRegistry(RootApplet))
      .toThrow(
        'Applet registry key expected does not match meta.applicationName actual-name',
      )
  })

  it('rejects non-record child registries and non-Applet children', () => {
    const RootApplet = defineApplet('root')
    RootApplet.applets = new Map()
    expect(() => AppletEngine.collectApplicationRegistry(RootApplet))
      .toThrow('Applet root applets must be a plain object')

    RootApplet.applets = { child: null }
    expect(() => AppletEngine.collectApplicationRegistry(RootApplet))
      .toThrow('Invalid Applet definition: root/child')
  })

  it('rejects recursive component cycles', () => {
    const RootApplet = defineApplet('root')
    RootApplet.applets = { root: RootApplet }

    expect(() => AppletEngine.collectApplicationRegistry(RootApplet))
      .toThrow('Cyclic Applet definition: root/root')
  })

  it('resolves one reused component through each explicit parent node', () => {
    const SharedApplet = defineApplet('shared')
    const LeftApplet = defineApplet('left', { shared: SharedApplet })
    const RightApplet = defineApplet('right', { shared: SharedApplet })
    const RootApplet = defineApplet('root', {
      constructor: defineApplet('constructor'),
      left: LeftApplet,
      right: RightApplet,
    })
    const engine = AppletEngine.create({
      applet: RootApplet,
      desktopEnvironment,
    })

    try {
      const rootApplication = engine.compositor.application.read({
        applicationId: engine.rootApplicationId,
      })
      const leftApplication = engine.runtime.childApplication(
        rootApplication,
        'left',
      )
      const rightApplication = engine.runtime.childApplication(
        rootApplication,
        'right',
      )
      const leftShared = engine.runtime.childApplication(
        leftApplication,
        'shared',
      )
      const rightShared = engine.runtime.childApplication(
        rightApplication,
        'shared',
      )

      expect(leftShared.applicationName).toBe('root/left/shared')
      expect(rightShared.applicationName).toBe('root/right/shared')
      expect(leftShared.applicationId).not.toBe(rightShared.applicationId)
      expect(engine.runtime.resolveApplicationNode(leftShared)).toMatchObject({
        Applet: SharedApplet,
        localName: 'shared',
        parentApplicationName: 'root/left',
      })
      expect(engine.runtime.resolveApplicationNode(rightShared)).toMatchObject({
        Applet: SharedApplet,
        localName: 'shared',
        parentApplicationName: 'root/right',
      })
      expect(engine.runtime.childApplication(
        rootApplication,
        'constructor',
      ).applicationName).toBe('root/constructor')
    } finally {
      engine.compositor.destroy?.()
    }
  })

  it('does not publish a global local-name lookup', () => {
    const RootApplet = defineApplet('root')
    const engine = AppletEngine.create({
      applet: RootApplet,
      desktopEnvironment,
    })

    try {
      expect(engine.runtime).not.toHaveProperty('applicationForLocalName')
    } finally {
      engine.compositor.destroy?.()
    }
  })

  it('rejects the legacy applicationRegistry overlay', () => {
    const RootApplet = defineApplet('root')

    expect(() => AppletEngine.create({
      applet: RootApplet,
      desktopEnvironment,
      options: { applicationRegistry: {} },
    })).toThrow(
      'options.applicationRegistry is not supported; register children through Applet.applets',
    )
  })

  it('requires a callable root-reset extension', () => {
    const RootApplet = defineApplet('root')

    expect(() => AppletEngine.create({
      applet: RootApplet,
      desktopEnvironment,
      options: { beforeResetRootApplet: true },
    })).toThrow('options.beforeResetRootApplet must be a function')
  })
})

const residenceEngines = []
afterEach(() => {
  cleanup()
  residenceEngines.splice(0).forEach((engine) => engine.destroy())
})

function themeFixture() {
  const Shared = defineApplet('shared')
  const Own = defineApplet('own', {}, {
    theme: Object.freeze({ ...DEFAULT_APPLET_THEME, backgroundColor: 'purple' }),
  })
  const Left = defineApplet('left', { shared: Shared, own: Own }, {
    theme: Object.freeze({ ...DEFAULT_APPLET_THEME, backgroundColor: 'red' }),
  })
  Left.recipes = Object.freeze([Object.freeze({
    name: 'tools',
    residents: [{ applet: 'shared' }, { applet: 'own' }],
  })])
  const Right = defineApplet('right', { shared: Shared }, {
    theme: Object.freeze({ ...DEFAULT_APPLET_THEME, backgroundColor: 'blue' }),
  })
  const Root = defineApplet('root', { left: Left, right: Right }, {
    theme: Object.freeze({ ...DEFAULT_APPLET_THEME, backgroundColor: 'gray' }),
  })
  const engine = AppletEngine.create({ applet: Root, desktopEnvironment })
  residenceEngines.push(engine)
  const anchor = (name) => engine.runtime.ensureAnchorSurface({
    applicationId: engine.runtime.applicationForNode(`root/${name}`).applicationId,
    key: name,
    workspaceId: name,
  })
  const left = anchor('left')
  const right = anchor('right')
  const open = (applicationName, ownerSurfaceId, options = {}) => {
    const application = engine.runtime.createApplicationInstance({ applicationName })
    return engine.runtime.createReferenceSurface({
      applicationId: application.applicationId,
      ownerSurfaceId,
      ...options,
    })
  }
  return { engine, left, right, open, Left, Own, Right, Root }
}

describe('AppletEngine occurrence themes', () => {
  it('caches consumer reconciliation by runtime, registered root and scheme', () => {
    const reconcile = vi.fn((identity, scheme) => ({ ...identity, canvasColor: scheme === 'night' ? 'black' : 'white' }))
    const theme = { ...DEFAULT_APPLET_THEME, backgroundColor: 'red', reconcile }
    const Left = defineApplet('left', {}, { theme })
    const Right = defineApplet('right', {}, { theme })
    const Root = defineApplet('root', { left: Left, right: Right })
    const create = () => AppletEngine.create({ applet: Root, desktopEnvironment, scheme: 'day', composition: { defaultTheme: theme } })
    const engine = create()
    const independent = create()
    residenceEngines.push(engine, independent)
    const occurrence = (themeRoot) => ({ props: { themeRoot } })
    const left = occurrence('root/left')
    const right = occurrence('root/right')
    const first = engine.runtime.themeFor(left)
    expect(engine.runtime.getScheme()).toBe('day')
    expect(engine.runtime.themeFor(occurrence('root/left'))).toBe(first)
    const second = engine.runtime.themeFor(right)
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(independent.runtime.themeFor(left)).not.toBe(first)
    expect(reconcile).toHaveBeenCalledTimes(3)
    const notify = vi.fn()
    const unsubscribe = engine.runtime.subscribeTheme(notify)
    engine.runtime.setScheme('day')
    expect(notify).not.toHaveBeenCalled()
    expect(reconcile).toHaveBeenCalledTimes(3)
    engine.runtime.setScheme('night')
    expect(notify).toHaveBeenCalledOnce()
    expect(engine.runtime.themeFor(left).canvasColor).toBe('black')
    expect(engine.runtime.themeFor(left)).not.toBe(first)
    expect(independent.runtime.themeFor(left).canvasColor).toBe('white')
    engine.runtime.setScheme('day')
    expect(engine.runtime.themeFor(left)).toBe(first)
    expect(reconcile).toHaveBeenCalledTimes(4)
    const fallback = engine.runtime.themeFor(occurrence(null))
    expect(engine.runtime.themeFor(occurrence('missing'))).toBe(fallback)
    expect(fallback.canvasColor).toBe('white')
    expect(fallback).not.toBe(first)
    expect(engine.runtime.themeFor(null)).toBe(fallback)
    unsubscribe()
    engine.runtime.setScheme('night')
    expect(notify).toHaveBeenCalledTimes(2)
    engine.destroy()
    engine.destroy()
    expect(() => engine.runtime.themeFor(left)).toThrow('destroyed')
    expect(() => engine.runtime.setScheme('day')).toThrow('destroyed')
    expect(() => engine.runtime.subscribeTheme(notify)).toThrow('destroyed')
  })

  it('validates scheme and theme declarations at the runtime boundary', () => {
    const Root = defineApplet('root')
    expect(() => AppletEngine.create({ applet: Root, desktopEnvironment, scheme: '' })).toThrow('scheme')
    const Invalid = defineApplet('invalid', {}, { theme: { backgroundColor: 'red' } })
    expect(() => AppletEngine.create({ applet: Invalid, desktopEnvironment })).toThrow('missing')
    const engine = AppletEngine.create({ applet: Root, desktopEnvironment })
    residenceEngines.push(engine)
    expect(() => engine.runtime.setScheme(2)).toThrow('scheme')
    expect(engine.runtime.getScheme()).toBeUndefined()
    expect(() => engine.runtime.subscribeTheme(null)).toThrow('listener')
  })

  it('provides the root occurrence theme and registry name through root composition', () => {
    const { engine } = themeFixture()
    function Probe() {
      const theme = useAppletTheme()
      const themeRoot = useAppletThemeRoot()
      return <output data-background={theme.backgroundColor} data-theme-root={themeRoot} />
    }
    const { container } = render(
      <AppletEnvironment desktopEnvironment={desktopEnvironment}>
        <AppletEngine engine={engine}>
          <Probe />
        </AppletEngine>
      </AppletEnvironment>,
    )
    expect(container.querySelector('output').dataset).toMatchObject({
      background: 'gray',
      themeRoot: 'root',
    })
  })

  it('computes static roots through each exact registered path', () => {
    const { engine } = themeFixture()
    expect(engine.applicationRegistry.root.themeRoot).toBe('root')
    expect(engine.applicationRegistry['root/left/shared'].themeRoot).toBe('root/left')
    expect(engine.applicationRegistry['root/right/shared'].themeRoot).toBe('root/right')
    expect(engine.applicationRegistry['root/left/own'].themeRoot).toBe('root/left/own')
    expect(engine.applicationRegistry.deck.themeRoot).toBeNull()
  })

  it('records roots for root, anchor, resident Deck, and resident Applet occurrences', () => {
    const { engine, left, right } = themeFixture()
    const root = engine.compositor.surface.read({ surfaceId: engine.rootSurfaceId })
    const [deck] = engine.compositor.surface.readChildren({ surfaceId: left.surfaceId })
    const residents = engine.compositor.surface.readChildren({ surfaceId: deck.surfaceId })

    expect(root.props.themeRoot).toBe('root')
    expect(left.props.themeRoot).toBe('root/left')
    expect(right.props.themeRoot).toBe('root/right')
    expect(deck.props.themeRoot).toBe('root/left')
    expect(residents.map(({ props }) => props.themeRoot))
      .toEqual(['root/left', 'root/left/own'])
  })

  it('inherits the invoking occurrence root independently of its definition and placement', () => {
    const { engine, left, right, open, Left, Right } = themeFixture()
    const inherited = open('root/left/shared', right.surfaceId)
    const invoked = open('root/left/shared', right.surfaceId, { themeRoot: 'root/left' })
    engine.compositor.surface.readControls({ surfaceId: inherited.surfaceId })
      .reparent(left.surfaceId)
    const moved = engine.compositor.surface.read({ surfaceId: inherited.surfaceId })
    const next = open('root/right/shared', moved.surfaceId)

    expect(inherited.props.themeRoot).toBe('root/right')
    expect(engine.runtime.themeFor(inherited)).toEqual(Right.meta.theme)
    expect(moved.props.themeRoot).toBe('root/right')
    expect(invoked.props.themeRoot).toBe('root/left')
    expect(engine.runtime.themeFor(invoked)).toEqual(Left.meta.theme)
    expect(next.props.themeRoot).toBe('root/right')
    expect(engine.runtime.themeFor(next)).toEqual(Right.meta.theme)
  })

  it('uses a theme-declaring target root even when another root invokes it', () => {
    const { engine, right, open, Own } = themeFixture()
    const occurrence = open('root/left/own', right.surfaceId, { themeRoot: 'root/right' })
    expect(occurrence.props.themeRoot).toBe('root/left/own')
    expect(engine.runtime.themeFor(occurrence)).toEqual(Own.meta.theme)
  })

  it('resolves recorded roots and preserves explicit default and unknown roots', () => {
    const { engine, left, open, Left } = themeFixture()
    const surface = open('root/left/shared', left.surfaceId)
    const legacy = { ...surface, props: {} }
    const unknown = open('root/left/shared', left.surfaceId, { themeRoot: 'removed/workspace' })
    const defaulted = open('root/left/shared', left.surfaceId, { themeRoot: null })
    engine.compositor.surface.update({ surfaceId: surface.surfaceId, props: {} })
    const inheritedLegacy = open('root/right/shared', surface.surfaceId)

    expect(engine.runtime.themeFor(legacy)).toEqual(Left.meta.theme)
    expect(engine.runtime.themeFor(unknown)).toEqual(DEFAULT_APPLET_THEME)
    expect(engine.runtime.themeFor(defaulted)).toEqual(DEFAULT_APPLET_THEME)
    expect(open('root/right/shared', unknown.surfaceId).props.themeRoot)
      .toBe('removed/workspace')
    expect(open('root/right/shared', defaulted.surfaceId).props.themeRoot).toBeNull()
    expect(inheritedLegacy.props.themeRoot).toBe('root/left')
  })
})

function residenceFixture({ initialState, sourceRecipes } = {}) {
  const Child = defineApplet('child')
  const Other = defineApplet('other')
  const Workspace = defineApplet('workspace', { child: Child, other: Other })
  Workspace.recipes = sourceRecipes ?? Object.freeze([Object.freeze({
    name: 'tools',
    residents: [{ applet: 'child', state: { title: 'Fresh' } }, { applet: 'other' }],
  })])
  const Root = defineApplet('root', { workspace: Workspace })
  const engine = AppletEngine.create({
    applet: Root,
    desktopEnvironment,
    options: { initialState },
  })
  residenceEngines.push(engine)
  const workspace = engine.runtime.ensureAnchorSurface({
    applicationId: engine.applicationInstances['root/workspace'].applicationId,
    key: 'workspace',
    workspaceId: 'workspace',
  })
  const children = (surfaceId) => engine.compositor.surface.readChildren({ surfaceId })
  const deck = children(workspace.surfaceId)[0]
  return { children, deck, engine, Root, workspace }
}

describe('engine Deck recipes and residence', () => {
  it('rejects a root named deck as a duplicate engine definition', () => {
    expect(() => AppletEngine.collectApplicationRegistry(defineApplet('deck')))
      .toThrow('Duplicate Applet definition: deck')
  })

  it.each([
    [[{ name: 'tools', residents: [] }], 'frozen plain objects'],
    [[Object.freeze({ name: 'tools' })], 'either residents or settingsOf'],
    [[Object.freeze({ name: 'tools', residents: [], settingsOf: [] })], 'either residents or settingsOf'],
    [[Object.freeze({ name: 'tools', residents: [{ applet: 'missing' }] })], 'Unknown recipe Applet'],
    [[Object.freeze({ name: 'tools', residents: [{ applet: 'child' }, { applet: 'child' }] })], 'each resident once'],
  ])('validates recipe declaration %j', (recipes, message) => {
    expect(() => residenceFixture({ sourceRecipes: recipes })).toThrow(message)
  })

  it('indexes own recipes before ancestor recipes and expands exact Settings definitions', () => {
    const Settings = defineApplet('settings')
    const Child = defineApplet('child', { settings: Settings })
    Child.Settings = Settings
    const Workspace = defineApplet('workspace', { child: Child })
    Workspace.recipes = [Object.freeze({ name: 'own', residents: [{ applet: 'child' }] })]
    const Root = defineApplet('root', { workspace: Workspace })
    Root.recipes = [Object.freeze({
      name: 'contributions',
      workspace: 'workspace',
      settingsOf: ['workspace'],
    })]
    const registry = AppletEngine.collectApplicationRegistry(Root)
    expect(registry['root/workspace'].recipes).toEqual([
      { name: 'own', residents: [{ applet: 'root/workspace/child' }] },
      { name: 'contributions', residents: [{ applet: 'root/workspace/child/settings' }] },
    ])
    expect(Object.isFrozen(registry['root/workspace'].recipes[0].residents)).toBe(true)
    Root.recipes = [Object.freeze({ name: 'own', workspace: 'workspace', residents: [] })]
    expect(() => AppletEngine.collectApplicationRegistry(Root))
      .toThrow('Duplicate recipe own for Workspace root/workspace')
  })

  it('supplies the first Deck and residents with fresh identities and declared starting state', () => {
    const { children, deck, engine, workspace } = residenceFixture()
    const residents = children(deck.surfaceId)
    expect(deck).toMatchObject({
      fullscreen: true,
      application: { applicationName: 'deck' },
      props: {
        addable: false,
        unmountable: false,
        resident: { containerSurfaceId: workspace.surfaceId, key: 'tools' },
        order: 0,
      },
    })
    expect(residents.map((surface) => surface.application.applicationName))
      .toEqual(['root/workspace/child', 'root/workspace/other'])
    expect(engine.checkpoint.isDirty()).toBe(false)
    expect(residents[0].applicationId).not.toBe(engine.applicationInstances['root/workspace/child'].applicationId)
    expect(residents[0].props).toMatchObject({
      resident: { containerSurfaceId: deck.surfaceId, key: 'root/workspace/child' },
      order: 0,
    })
    expect(engine.appletState.ensure({
      applicationId: residents[0].applicationId,
      initialValue: 'Default',
      stateName: 'title',
    })).toBe('Fresh')
    expect(engine.checkpoint.isDirty()).toBe(false)
    expect(engine.compositor.surface.read({ surfaceId: deck.surfaceId }).selectedChildSurfaceId)
      .toBe(residents[0].surfaceId)
    expect(engine.checkpoint.getSnapshot().find(({ surfaceId }) => surfaceId === deck.surfaceId).props.recipe)
      .toEqual({ name: 'tools', residents: [
        { applet: 'root/workspace/child', state: { title: 'Fresh' } },
        { applet: 'root/workspace/other' },
      ] })
  })

  it('supplies residents for a Workspace reference and for a root Workspace', () => {
    const { engine, Root } = residenceFixture()
    const application = engine.runtime.createApplicationInstance({ applicationName: 'root/workspace' })
    const reference = engine.runtime.createReferenceSurface({
      applicationId: application.applicationId,
      ownerSurfaceId: engine.rootSurfaceId,
    })
    expect(engine.compositor.surface.readChildren({ surfaceId: reference.surfaceId })).toHaveLength(1)
    Root.recipes = [Object.freeze({ name: 'root-tools', residents: [{ applet: 'workspace/child' }] })]
    const rootEngine = AppletEngine.create({ applet: Root, desktopEnvironment })
    residenceEngines.push(rootEngine)
    const deck = rootEngine.compositor.surface.readChildren({ surfaceId: rootEngine.rootSurfaceId })[0]
    expect(rootEngine.compositor.surface.readChildren({ surfaceId: deck.surfaceId })).toHaveLength(1)
    expect(rootEngine.checkpoint.isDirty()).toBe(false)
  })

  it.each([false, true])('ends an ordinary Workspace and its supplied residents with intervening save %s', (saved) => {
    const { engine } = residenceFixture()
    const initialState = engine.checkpoint.getSnapshot()
    const application = engine.runtime.createApplicationInstance({ applicationName: 'root/workspace' })
    const workspace = engine.runtime.createReferenceSurface({
      applicationId: application.applicationId,
      ownerSurfaceId: engine.rootSurfaceId,
    })
    expect(engine.compositor.surface.readChildren({ surfaceId: workspace.surfaceId })).toHaveLength(1)
    expect(engine.checkpoint.isDirty()).toBe(true)
    if (saved) {
      const capture = engine.checkpoint.capture()
      engine.checkpoint.markClean(capture)
      engine.checkpoint.release(capture)
      expect(engine.checkpoint.isDirty()).toBe(false)
    }
    engine.compositor.surface.readControls({ surfaceId: workspace.surfaceId }).close()
    expect(engine.checkpoint.getSnapshot()).toEqual(initialState)
    expect(engine.checkpoint.isDirty()).toBe(saved)
  })

  it('supplies a fresh resident after close without retaining the ended state', () => {
    const { children, deck, engine } = residenceFixture()
    const previous = children(deck.surfaceId)[0]
    engine.appletState.ensure({ applicationId: engine.rootApplicationId, stateName: 'choice', initialValue: 'default' })
    engine.appletState.write({ applicationId: engine.rootApplicationId, stateName: 'choice', value: 'edited' })
    engine.appletState.write({ applicationId: previous.applicationId, stateName: 'title', value: 'Edited' })
    engine.compositor.surface.readControls({ surfaceId: previous.surfaceId }).close()
    const next = children(deck.surfaceId).find(({ props }) => props.resident.key === 'root/workspace/child')
    expect(next.surfaceId).not.toBe(previous.surfaceId)
    expect(next.windowId).not.toBe(previous.windowId)
    expect(next.applicationId).not.toBe(previous.applicationId)
    expect(engine.appletState.ensure({ applicationId: next.applicationId, stateName: 'title', initialValue: 'Default' }))
      .toBe('Fresh')
    expect(engine.compositor.application.read({ applicationId: previous.applicationId })).toBeUndefined()
    expect(engine.appletState.read({ applicationId: engine.rootApplicationId, stateName: 'choice' })).toBe('edited')
    expect(engine.checkpoint.isDirty()).toBe(true)
  })

  it('holds the resident record through a peel, restores cancellation, and supplies after completion', () => {
    const { children, deck, engine } = residenceFixture()
    const original = children(deck.surfaceId)[0]
    const floatingApplication = engine.runtime.createApplicationInstance({ applicationName: 'deck' })
    const floating = engine.runtime.createReferenceSurface({
      applicationId: floatingApplication.applicationId,
      ownerSurfaceId: engine.rootSurfaceId,
    })
    const control = engine.compositor.surface.readControls({ surfaceId: original.surfaceId })
    control.reparent(floating.surfaceId)
    expect(children(deck.surfaceId)).toHaveLength(1)
    expect(children(floating.surfaceId)[0].surfaceId).toBe(original.surfaceId)
    control.reparent(deck.surfaceId)
    expect(children(deck.surfaceId)).toHaveLength(2)
    control.reparent(floating.surfaceId)
    const moved = engine.compositor.surface.read({ surfaceId: original.surfaceId })
    const { resident: _resident, order: _order, ...props } = moved.props
    engine.compositor.surface.update({ surfaceId: original.surfaceId, props })
    expect(children(deck.surfaceId)).toHaveLength(2)
    expect(children(deck.surfaceId).some(({ surfaceId }) => surfaceId === original.surfaceId)).toBe(false)
    expect(children(floating.surfaceId)[0].surfaceId).toBe(original.surfaceId)
    control.close()
    expect(children(floating.surfaceId)).toHaveLength(0)
    expect(children(deck.surfaceId)).toHaveLength(2)
  })

  it('applies the saved recipe membership and order while retaining surviving state', () => {
    const { children, deck, engine } = residenceFixture()
    const [child, other] = children(deck.surfaceId)
    engine.appletState.write({ applicationId: other.applicationId, stateName: 'title', value: 'Retained' })
    engine.compositor.surface.update({
      surfaceId: deck.surfaceId,
      props: { ...deck.props, recipe: { name: 'tools', residents: [
        { applet: 'root/workspace/other', state: { title: 'Ignored for existing' } },
      ] } },
    })
    expect(children(deck.surfaceId).map(({ surfaceId }) => surfaceId)).toEqual([other.surfaceId])
    expect(children(deck.surfaceId)[0].props.order).toBe(0)
    expect(engine.compositor.surface.read({ surfaceId: child.surfaceId })).toBeUndefined()
    expect(engine.appletState.read({ applicationId: other.applicationId, stateName: 'title' })).toBe('Retained')
    const restored = residenceFixture({ initialState: engine.checkpoint.getSnapshot() })
    expect(restored.deck.surfaceId).toBe(deck.surfaceId)
    expect(restored.children(restored.deck.surfaceId).map(({ surfaceId }) => surfaceId)).toEqual([other.surfaceId])
    restored.engine.compositor.surface.readControls({ surfaceId: restored.deck.surfaceId }).close()
    const replacementDeck = restored.children(restored.workspace.surfaceId)[0]
    expect(replacementDeck.surfaceId).not.toBe(deck.surfaceId)
    expect(restored.children(replacementDeck.surfaceId).map(({ application }) => application.applicationName))
      .toEqual(['root/workspace/child', 'root/workspace/other'])
  })

  it('resupplies recipe order without absorbing unrelated ordinary Surface props', () => {
    const { children, deck, engine } = residenceFixture()
    const [first, second] = children(deck.surfaceId)
    engine.compositor.surface.update({
      surfaceId: first.surfaceId,
      props: { ...first.props, ordinaryChoice: 'edited' },
    })
    engine.compositor.surface.update({
      surfaceId: deck.surfaceId,
      props: {
        ...deck.props,
        recipe: { ...deck.props.recipe, residents: [...deck.props.recipe.residents].reverse() },
      },
    })
    expect(engine.compositor.surface.read({ surfaceId: first.surfaceId }).props)
      .toMatchObject({ order: 1, ordinaryChoice: 'edited' })
    expect(engine.compositor.surface.read({ surfaceId: second.surfaceId }).props.order).toBe(0)
    expect(engine.checkpoint.isDirty()).toBe(true)

    engine.compositor.surface.update({ surfaceId: deck.surfaceId, props: deck.props })
    expect(engine.compositor.surface.read({ surfaceId: first.surfaceId }).props)
      .toMatchObject({ order: 0, ordinaryChoice: 'edited' })
    expect(engine.compositor.surface.read({ surfaceId: second.surfaceId }).props.order).toBe(1)
    expect(engine.checkpoint.isDirty()).toBe(true)
    engine.compositor.surface.update({ surfaceId: first.surfaceId, props: first.props })
    expect(engine.checkpoint.isDirty()).toBe(false)
  })

  it('restores a workspace lacking resident Decks by supplying its default recipes', () => {
    const { deck, engine, workspace } = residenceFixture()
    const initialState = engine.checkpoint.getSnapshot().filter(({ surfaceId }) => (
      surfaceId === engine.rootSurfaceId || surfaceId === workspace.surfaceId
    ))
    const restored = residenceFixture({ initialState })
    expect(restored.workspace.surfaceId).toBe(workspace.surfaceId)
    expect(restored.deck.surfaceId).not.toBe(deck.surfaceId)
    expect(restored.children(restored.deck.surfaceId)).toHaveLength(2)
    expect(restored.engine.checkpoint.isDirty()).toBe(false)
  })

  it('restores a Deck with a missing resident by supplying just that occurrence', () => {
    const { children, deck, engine } = residenceFixture()
    const [missing, retained] = children(deck.surfaceId)
    const initialState = engine.checkpoint.getSnapshot().filter(({ surfaceId }) => (
      surfaceId !== missing.surfaceId
    ))
    const restored = residenceFixture({ initialState })
    const residents = restored.children(restored.deck.surfaceId)
    expect(restored.deck.surfaceId).toBe(deck.surfaceId)
    expect(residents.find(({ application }) => application.applicationName === 'root/workspace/other').surfaceId)
      .toBe(retained.surfaceId)
    expect(residents.find(({ application }) => application.applicationName === 'root/workspace/child').surfaceId)
      .not.toBe(missing.surfaceId)
    expect(restored.engine.checkpoint.isDirty()).toBe(false)
  })
})
