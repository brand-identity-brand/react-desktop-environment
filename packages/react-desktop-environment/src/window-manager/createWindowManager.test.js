import { describe, expect, it, vi } from 'vitest'
import { createLaunchApplicationCommand } from './commands.js'
import { createWindowManager } from './createWindowManager.js'
import { selectChildSurfaces } from './selectors.js'

const createTestManager = () => {
  let sequence = 0
  return createWindowManager({
    createId: (kind) => `${kind}:${++sequence}`,
  })
}

const launchExample = (manager, overrides = {}) =>
  manager.commands.launchApplication({ typeId: 'example', ...overrides })

describe('createWindowManager', () => {
  it('fails immediately when no valid identity generator exists', () => {
    vi.stubGlobal('crypto', undefined)

    try {
      expect(() => createWindowManager()).toThrow(
        /requires crypto\.randomUUID or an explicit createId/,
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('dispatches named command values', () => {
    const manager = createTestManager()
    const result = manager.dispatch(
      createLaunchApplicationCommand({ typeId: 'example' }),
    )

    expect(result).toEqual({
      applicationId: 'application:1',
      surfaceId: 'surface:2',
    })
  })

  it('creates an application and first surface atomically', () => {
    const manager = createTestManager()
    const onEvent = vi.fn()
    manager.subscribeEvents(onEvent)

    const result = launchExample(manager, { payload: { title: 'Example' } })
    const snapshot = manager.getSnapshot()

    expect(snapshot.applications[result.applicationId]).toEqual({
      id: result.applicationId,
      typeId: 'example',
      payload: { title: 'Example' },
    })
    expect(snapshot.surfaces[result.surfaceId]).toEqual({
      id: result.surfaceId,
      applicationId: result.applicationId,
      parentId: null,
    })
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'application.launched',
        previousSnapshot: expect.any(Object),
        snapshot,
      }),
    )
  })

  it('finds children because each child claims its parent', () => {
    const manager = createTestManager()
    const { surfaceId: parentSurfaceId } = launchExample(manager)
    const { surfaceId: childSurfaceId } = launchExample(manager, {
      parentSurfaceId,
    })

    expect(selectChildSurfaces(parentSurfaceId)(manager.getSnapshot())).toEqual([
      expect.objectContaining({ id: childSurfaceId, parentId: parentSurfaceId }),
    ])
  })

  it('allows several surfaces to present one application', () => {
    const manager = createTestManager()
    const { applicationId, surfaceId: firstSurfaceId } = launchExample(manager)
    const secondSurfaceId = manager.commands.openSurface({ applicationId })

    expect(manager.getSnapshot().surfaces[firstSurfaceId].applicationId).toBe(
      applicationId,
    )
    expect(manager.getSnapshot().surfaces[secondSurfaceId].applicationId).toBe(
      applicationId,
    )
  })

  it('moves only the parent relationship and rejects cycles', () => {
    const manager = createTestManager()
    const { surfaceId: parentSurfaceId } = launchExample(manager)
    const { surfaceId: childSurfaceId } = launchExample(manager, {
      parentSurfaceId,
    })

    expect(() =>
      manager.commands.moveSurface(parentSurfaceId, childSurfaceId),
    ).toThrow(/surface cycle/)

    manager.commands.moveSurface(childSurfaceId, null)
    expect(manager.getSnapshot().surfaces[childSurfaceId].parentId).toBeNull()
  })

  it('closes a surface tree without closing its applications', () => {
    const manager = createTestManager()
    const { applicationId, surfaceId: parentSurfaceId } = launchExample(manager)
    launchExample(manager, { parentSurfaceId })

    manager.commands.closeSurface(parentSurfaceId)

    expect(manager.getSnapshot().surfaces).toEqual({})
    expect(manager.getSnapshot().applications[applicationId]).toBeDefined()
  })

  it('closes an application and every surface tree rooted in its surfaces', () => {
    const manager = createTestManager()
    const { applicationId } = launchExample(manager)
    manager.commands.openSurface({ applicationId })

    manager.commands.closeApplication(applicationId)
    expect(manager.getSnapshot()).toEqual({ applications: {}, surfaces: {} })
  })

  it('prevents direct mutation of relationship records', () => {
    const manager = createTestManager()
    const { surfaceId } = launchExample(manager)

    expect(() => {
      manager.getSnapshot().surfaces[surfaceId].parentId = 'surface:other'
    }).toThrow()
    expect(manager.getSnapshot().surfaces[surfaceId].parentId).toBeNull()
  })
})
