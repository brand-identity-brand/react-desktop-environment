import { describe, expect, it } from 'vitest'
import { createWindowManager } from '../window-manager/createWindowManager.js'
import { createCompositor } from './createCompositor.js'

const createSystems = () => {
  let sequence = 0
  const createId = (kind) => `${kind}:${++sequence}`
  const windowManager = createWindowManager({ createId })
  const compositor = createCompositor({
    windowManager,
    createId,
    applicationRegistry: { Example: () => null },
  })
  return { windowManager, compositor }
}

describe('createCompositor', () => {
  it('owns applications and relates windows directly to them', () => {
    const { windowManager, compositor } = createSystems()
    const { applicationId, surfaceId } = compositor.application.run({
      registeredApplicationName: 'Example',
      payload: { documentId: 'document:1' },
    })

    expect(compositor.getSnapshot()).toEqual({
      applications: {
        [applicationId]: {
          registeredApplicationName: 'Example',
          payload: { documentId: 'document:1' },
        },
      },
      windows: {
        [surfaceId]: {
          applicationId,
          workspaceId: 'default',
          zIndex: 1,
          minimized: false,
        },
      },
    })
    expect(windowManager.getSnapshot()).toEqual({
      surfaces: { [surfaceId]: { id: surfaceId, parentId: null } },
    })
  })

  it('runs several window presentations for one application', () => {
    const { windowManager, compositor } = createSystems()
    const { applicationId, surfaceId: parentSurfaceId } =
      compositor.application.run({ registeredApplicationName: 'Example' })
    const childSurfaceId = compositor.window.run({
      applicationId,
      parentSurfaceId,
      workspaceId: 'second',
    })

    expect(compositor.getSnapshot().windows[childSurfaceId]).toMatchObject({
      applicationId,
      workspaceId: 'second',
      zIndex: 2,
    })
    expect(windowManager.getSnapshot().surfaces[childSurfaceId].parentId).toBe(
      parentSurfaceId,
    )
  })

  it('updates one owned record without recreating another', () => {
    const { compositor } = createSystems()
    const first = compositor.application.run({ registeredApplicationName: 'Example' })
    const second = compositor.application.run({ registeredApplicationName: 'Example' })
    const secondWindow = compositor.getSnapshot().windows[second.surfaceId]

    compositor.window.update(first.surfaceId, { minimized: true })

    expect(compositor.getSnapshot().windows[first.surfaceId].minimized).toBe(true)
    expect(compositor.getSnapshot().windows[second.surfaceId]).toBe(secondWindow)
  })

  it('stops owned records and can clean external orphans', () => {
    const { windowManager, compositor } = createSystems()
    const first = compositor.application.run({ registeredApplicationName: 'Example' })
    compositor.application.stop(first.applicationId)
    expect(compositor.getSnapshot()).toEqual({ applications: {}, windows: {} })

    const second = compositor.application.run({ registeredApplicationName: 'Example' })
    windowManager.commands.closeSurface(second.surfaceId)
    expect(compositor.getSnapshot().windows).toEqual({})
    expect(compositor.getSnapshot().applications[second.applicationId]).toBeDefined()
    expect(compositor.cleanup()).toEqual({
      removedWindowIds: [],
      removedApplicationIds: [second.applicationId],
    })
  })
})
