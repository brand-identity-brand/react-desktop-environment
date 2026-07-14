import { describe, expect, it, vi } from 'vitest'
import createWindowManager from './createWindowManager.js'

const createTestManager = () => {
  let sequence = 0
  return createWindowManager({ createId: () => `window:${++sequence}` })
}

const addWindow = (manager, input) =>
  manager.window.add({ window: manager.window.create(input) })

describe('createWindowManager', () => {
  it('fails immediately without identity generation', () => {
    vi.stubGlobal('crypto', undefined)
    try {
      expect(() => createWindowManager()).toThrow(/requires crypto\.randomUUID/)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('creates records separately from adding them to the window table', () => {
    const manager = createTestManager()
    const parent = manager.window.create()
    expect(manager.getSnapshot()).toEqual({ windows: {} })

    manager.window.add({ window: parent })
    const child = addWindow(manager, { parentWindowId: parent.windowId })

    expect(manager.getSnapshot()).toEqual({
      windows: {
        [parent.windowId]: { windowId: parent.windowId, parentWindowId: null },
        [child.windowId]: {
          windowId: child.windowId,
          parentWindowId: parent.windowId,
        },
      },
    })
    expect(manager.window.readChildren({ windowId: parent.windowId })).toEqual([child])
  })

  it('moves windows and rejects cycles', () => {
    const manager = createTestManager()
    const parent = addWindow(manager)
    const child = addWindow(manager, { parentWindowId: parent.windowId })
    expect(() =>
      manager.window.move({
        windowId: parent.windowId,
        parentWindowId: child.windowId,
      }),
    ).toThrow(/cycle/)
    manager.window.move({ windowId: child.windowId, parentWindowId: null })
    expect(manager.window.read({ windowId: child.windowId }).parentWindowId).toBeNull()
  })

  it('removes an entire window tree', () => {
    const manager = createTestManager()
    const parent = addWindow(manager)
    addWindow(manager, { parentWindowId: parent.windowId })
    expect(manager.window.remove({ windowId: parent.windowId })).toHaveLength(2)
    expect(manager.getSnapshot()).toEqual({ windows: {} })
  })

  it('preserves unchanged records and cached child-list references', () => {
    const manager = createTestManager()
    const first = addWindow(manager)
    const roots = manager.window.readChildren()
    addWindow(manager, { parentWindowId: first.windowId })
    expect(manager.window.read({ windowId: first.windowId })).toBe(first)
    expect(manager.window.readChildren()).toBe(roots)
  })
})
