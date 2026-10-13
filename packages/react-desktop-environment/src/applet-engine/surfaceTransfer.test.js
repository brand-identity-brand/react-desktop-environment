import { afterEach, describe, expect, it } from 'vitest'
import * as compositor from '../compositor/index.js'
import * as windowManager from '../window-manager/index.js'
import * as ui from '../ui/index.js'
import AppletEngine from './AppletEngine.jsx'

const engines = new Set()
afterEach(() => {
  for (const engine of engines) engine.destroy()
  engines.clear()
})

function fixture() {
  function Card() { return null }
  Card.meta = { applicationName: 'card' }
  Card.applets = {}
  function Root() { return null }
  Root.meta = { applicationName: 'root' }
  Root.applets = { card: Card }
  const engine = AppletEngine.create({
    applet: Root,
    desktopEnvironment: { compositor, windowManager, ui },
  })
  engines.add(engine)
  const deckApplicationId = engine.runtime.applicationForNode('deck').applicationId
  const create = (applicationName, ownerSurfaceId, surfaceProps) => {
    const application = engine.runtime.createApplicationInstance({ applicationName })
    return engine.runtime.createReferenceSurface({
      applicationId: application.applicationId, ownerSurfaceId, surfaceProps,
    })
  }
  const deck = (resident = false) => create('deck', engine.rootSurfaceId, resident
    ? { recipe: { name: 'cards', residents: [{ applet: 'root/card' }] } }
    : {})
  const card = (ownerSurfaceId) => create('root/card', ownerSurfaceId)
  const read = (surfaceId) => engine.compositor.surface.read({ surfaceId })
  const children = (surfaceId) => engine.compositor.surface.readChildren({ surfaceId })
  const peel = (surfaceId) => engine.runtime.beginPeel({
    surfaceId, ownerSurfaceId: engine.rootSurfaceId, deckApplicationId,
  })
  return { engine, deckApplicationId, deck, card, read, children, peel }
}

describe('Applet occurrence transfer', () => {
  it.each([
    { edited: false, emptySelection: false },
    { edited: true, emptySelection: false },
    { edited: false, emptySelection: true },
  ])('cancels only its own checkpoint changes with unrelated edits=$edited and empty selection=$emptySelection', ({ edited, emptySelection }) => {
    const { engine, deck, card, peel } = fixture()
    const source = deck()
    const selected = card(source.surfaceId)
    card(source.surfaceId)
    engine.runtime.selectChild({
      surfaceId: source.surfaceId, childSurfaceId: emptySelection ? null : selected.surfaceId,
    })
    const state = { applicationId: engine.rootApplicationId, stateName: 'unrelated' }
    engine.appletState.ensure({ ...state, initialValue: 'original' })
    const clean = engine.checkpoint.capture()
    engine.checkpoint.markClean(clean)
    engine.checkpoint.release(clean)
    const original = engine.checkpoint.getSnapshot()

    const transfer = peel(selected.surfaceId)
    if (edited) engine.appletState.write({ ...state, value: 'edited' })
    transfer.cancel()
    const expected = original.map((entry) => edited && entry.surfaceId === engine.rootSurfaceId
      ? { ...entry, appletState: { ...entry.appletState, unrelated: 'edited' } } : entry)
    expect(engine.checkpoint.getSnapshot()).toEqual(expected)
    expect(engine.checkpoint.isDirty()).toBe(edited)
  })

  it('rejects a cyclic merge before changing any occurrence and permits merging into an ancestor', () => {
    const { engine, deck, card } = fixture()
    const source = deck()
    card(source.surfaceId)
    const nested = deck()
    engine.compositor.surface.readControls({ surfaceId: nested.surfaceId }).reparent(source.surfaceId)
    const target = deck()
    engine.compositor.surface.readControls({ surfaceId: target.surfaceId }).reparent(nested.surfaceId)
    const original = engine.checkpoint.getSnapshot()

    expect(engine.runtime.mergeDeck({ surfaceId: source.surfaceId, targetSurfaceId: target.surfaceId })).toBe(false)
    expect(engine.checkpoint.getSnapshot()).toEqual(original)
    expect(engine.runtime.mergeDeck({ surfaceId: target.surfaceId, targetSurfaceId: source.surfaceId })).toBe(true)
  })

  it('restores a parentless anchor without replacing its occurrence', () => {
    const { engine, peel, read } = fixture()
    const application = engine.runtime.applicationForNode('root/card')
    const anchor = engine.runtime.ensureAnchorSurface({
      applicationId: application.applicationId, key: 'standalone', workspaceId: 'standalone',
    })
    const transfer = peel(anchor.surfaceId)
    transfer.cancel()
    expect(read(anchor.surfaceId)).toEqual(anchor)
    expect(read(transfer.frameSurfaceId)).toBeUndefined()
  })

  it('holds a selected resident slot and cancels into the same occurrence and placement', () => {
    const { engine, deck, children, read, peel } = fixture()
    const source = deck(true)
    const resident = children(source.surfaceId)[0]
    const geometry = { position: { x: 24, y: 57 }, size: { width: 310, height: 450 } }
    engine.compositor.surface.update({ surfaceId: resident.surfaceId, ...geometry })
    engine.runtime.selectChild({ surfaceId: source.surfaceId, childSurfaceId: resident.surfaceId })
    const captured = read(resident.surfaceId)

    const transfer = peel(resident.surfaceId)
    expect(children(source.surfaceId)).toEqual([])
    expect(engine.runtime.readSelectedChild({ surfaceId: source.surfaceId })?.surfaceId).toBe(resident.surfaceId)
    expect(transfer.cancel()).toBe(true)
    expect(read(resident.surfaceId)).toMatchObject({
      applicationId: captured.applicationId, windowId: captured.windowId, props: captured.props, ...geometry,
    })
    expect(children(source.surfaceId).map(({ surfaceId }) => surfaceId)).toEqual([resident.surfaceId])
    expect(read(transfer.frameSurfaceId)).toBeUndefined()
    expect(engine.runtime.readSelectedChild({ surfaceId: source.surfaceId })?.surfaceId).toBe(resident.surfaceId)
  })

  it('retains a peeled resident and selects a fresh occurrence in its vacated slot', () => {
    const { engine, deck, children, read, peel } = fixture()
    const source = deck(true)
    const resident = children(source.surfaceId)[0]
    const transfer = peel(resident.surfaceId)
    const geometry = { position: { x: 54, y: 87 }, size: { width: 280, height: 360 } }

    expect(transfer.retain({ geometry })).toBe(true)
    const replacement = children(source.surfaceId)[0]
    expect(replacement.surfaceId).not.toBe(resident.surfaceId)
    expect(replacement.applicationId).not.toBe(resident.applicationId)
    expect(engine.runtime.readSelectedChild({ surfaceId: source.surfaceId })?.surfaceId).toBe(replacement.surfaceId)
    expect(read(resident.surfaceId).applicationId).toBe(resident.applicationId)
    expect(read(resident.surfaceId).props.resident).toBeUndefined()
    expect(read(transfer.frameSurfaceId)).toMatchObject(geometry)
    expect(engine.checkpoint.getSnapshot().some(({ surfaceId }) => surfaceId === transfer.frameSurfaceId)).toBe(true)
    expect(transfer.cancel()).toBe(false)
  })

  it('keeps new occurrences provisional until completion and disposes a cancelled branch', () => {
    const { engine, deckApplicationId, read } = fixture()
    const options = {
      applicationId: engine.runtime.applicationForNode('root/card').applicationId,
      ownerSurfaceId: engine.rootSurfaceId, deckApplicationId,
    }
    const cancelled = engine.runtime.beginPeel(options)
    const applicationId = read(cancelled.movingSurfaceId).applicationId
    expect(engine.checkpoint.getSnapshot().some(({ surfaceId }) => surfaceId === cancelled.movingSurfaceId)).toBe(false)
    cancelled.cancel()
    expect(engine.compositor.application.read({ applicationId })).toBeUndefined()
    expect(read(cancelled.frameSurfaceId)).toBeUndefined()

    const retained = engine.runtime.beginPeel(options)
    retained.retain()
    expect(engine.checkpoint.getSnapshot().some(({ surfaceId }) => surfaceId === retained.movingSurfaceId)).toBe(true)
  })

  it('cancels a fullscreen peel without changing its retained floating geometry', () => {
    const { engine, card, read } = fixture()
    const original = card(engine.rootSurfaceId)
    const controls = engine.compositor.surface.readControls({ surfaceId: original.surfaceId })
    const floating = { position: { x: 11, y: 12 }, size: { width: 300, height: 260 } }
    engine.compositor.surface.update({ surfaceId: original.surfaceId, ...floating })
    controls.fullscreen({ position: { x: 0, y: 0 }, size: { width: 1000, height: 800 } })
    const captured = read(original.surfaceId)

    const transfer = engine.runtime.beginPeel({ surfaceId: original.surfaceId, ownerSurfaceId: engine.rootSurfaceId })
    expect(read(original.surfaceId).fullscreen).toBe(false)
    transfer.cancel()
    expect(read(original.surfaceId)).toEqual(captured)
    controls.exitFullscreen()
    expect(read(original.surfaceId)).toMatchObject(floating)
  })

  it('removes an empty source anchor without changing the accepting Deck selection', () => {
    const { engine, deck, card, read } = fixture()
    const source = deck()
    const target = deck()
    const selected = card(target.surfaceId)
    engine.runtime.selectChild({ surfaceId: target.surfaceId, childSurfaceId: selected.surfaceId })

    expect(engine.runtime.mergeDeck({ surfaceId: source.surfaceId, targetSurfaceId: target.surfaceId })).toBe(true)
    expect(read(source.surfaceId)).toBeUndefined()
    expect(engine.runtime.readSelectedChild({ surfaceId: target.surfaceId })?.surfaceId).toBe(selected.surfaceId)
  })

  it('makes the retained source selection ordinary even when its identity does not change', () => {
    const { engine, deck, card, peel } = fixture()
    const source = deck()
    const selected = card(source.surfaceId)
    const moving = card(source.surfaceId)
    const fallback = card(source.surfaceId)
    const owner = { surfaceId: source.surfaceId }
    engine.runtime.selectChild({ ...owner, childSurfaceId: selected.surfaceId, supply: owner })

    const transfer = peel(moving.surfaceId)
    engine.runtime.selectChild({ ...owner, childSurfaceId: fallback.surfaceId, supply: owner })
    expect(engine.runtime.readSelectedChild(owner)?.surfaceId).toBe(selected.surfaceId)
    transfer.cancel()
  })

  it('releases the held source and provisional frame when the moving occurrence ends', async () => {
    const { engine, deck, card, peel, read } = fixture()
    const source = deck()
    const moving = card(source.surfaceId)
    const transfer = peel(moving.surfaceId)

    engine.compositor.surface.readControls({ surfaceId: moving.surfaceId }).close()
    await Promise.resolve()
    await Promise.resolve()
    expect(read(transfer.frameSurfaceId)).toBeUndefined()
    expect(read(source.surfaceId)).toBeUndefined()
    expect(transfer.retain()).toBe(false)
  })

  it.each([false, true])('merges a Deck with resident recipe %s without replacing its members', (resident) => {
    const { engine, deck, card, children, read } = fixture()
    const source = deck(resident)
    if (!resident) card(source.surfaceId)
    const selected = card(source.surfaceId)
    const target = deck()
    const existing = card(target.surfaceId)
    engine.runtime.selectChild({ surfaceId: source.surfaceId, childSurfaceId: selected.surfaceId })
    const members = children(source.surfaceId)

    expect(engine.runtime.mergeDeck({ surfaceId: source.surfaceId, targetSurfaceId: source.surfaceId })).toBe(false)
    expect(engine.runtime.mergeDeck({ surfaceId: source.surfaceId, targetSurfaceId: target.surfaceId })).toBe(true)
    expect(read(source.surfaceId)).toBeUndefined()
    expect(children(target.surfaceId).map(({ surfaceId }) => surfaceId).sort())
      .toEqual([existing, ...members].map(({ surfaceId }) => surfaceId).sort())
    expect(engine.runtime.readSelectedChild({ surfaceId: target.surfaceId })?.surfaceId).toBe(selected.surfaceId)
    for (const member of members) {
      expect(read(member.surfaceId).applicationId).toBe(member.applicationId)
      expect(read(member.surfaceId).props.resident).toBeUndefined()
    }
  })
})
