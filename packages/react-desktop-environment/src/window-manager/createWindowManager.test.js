import { describe, expect, it, vi } from 'vitest'
import { createWindowManager } from './createWindowManager.js'
import { selectChildSurfaces } from './selectors.js'

const createTestManager = () => {
  let sequence = 0
  return createWindowManager({ createId: () => `surface:${++sequence}` })
}

describe('createWindowManager', () => {
  it('fails immediately without identity generation', () => {
    vi.stubGlobal('crypto', undefined)
    try {
      expect(() => createWindowManager()).toThrow(/requires crypto\.randomUUID/)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('owns only surface identity and parent relationships', () => {
    const manager = createTestManager()
    const parentId = manager.commands.openSurface()
    const childId = manager.commands.openSurface({ parentSurfaceId: parentId })

    expect(manager.getSnapshot()).toEqual({
      surfaces: {
        [parentId]: { id: parentId, parentId: null },
        [childId]: { id: childId, parentId },
      },
    })
    expect(selectChildSurfaces(parentId)(manager.getSnapshot())).toEqual([
      manager.getSnapshot().surfaces[childId],
    ])
  })

  it('moves surfaces and rejects cycles', () => {
    const manager = createTestManager()
    const parentId = manager.commands.openSurface()
    const childId = manager.commands.openSurface({ parentSurfaceId: parentId })
    expect(() => manager.commands.moveSurface(parentId, childId)).toThrow(/cycle/)
    manager.commands.moveSurface(childId, null)
    expect(manager.getSnapshot().surfaces[childId].parentId).toBeNull()
  })

  it('closes an entire surface tree', () => {
    const manager = createTestManager()
    const parentId = manager.commands.openSurface()
    manager.commands.openSurface({ parentSurfaceId: parentId })
    expect(manager.commands.closeSurface(parentId)).toHaveLength(2)
    expect(manager.getSnapshot()).toEqual({ surfaces: {} })
  })

  it('preserves unchanged surface references', () => {
    const manager = createTestManager()
    const firstId = manager.commands.openSurface()
    const first = manager.getSnapshot().surfaces[firstId]
    manager.commands.openSurface()
    expect(manager.getSnapshot().surfaces[firstId]).toBe(first)
  })
})
