import { describe, expect, it } from 'vitest'
import { createWindowManager } from '../window-manager/createWindowManager.js'
import { createDesktopEnvironment } from './createDesktopEnvironment.js'

const createManagers = () => {
  let sequence = 0
  const windowManager = createWindowManager({
    createId: (kind) => `${kind}:${++sequence}`,
  })
  const desktopEnvironment = createDesktopEnvironment({
    windowManager,
    createWindowState: ({ application }) => ({
      workspaceId: 'desktop',
      title: application.payload?.title,
    }),
  })
  return { windowManager, desktopEnvironment }
}

describe('createDesktopEnvironment', () => {
  it('creates and removes desktop records by reconciling manager surfaces', () => {
    const { windowManager, desktopEnvironment } = createManagers()
    const { surfaceId } = windowManager.commands.launchApplication({
      typeId: 'example',
      payload: { title: 'Example' },
    })

    expect(desktopEnvironment.getSnapshot().windows[surfaceId]).toEqual({
      surfaceId,
      workspaceId: 'desktop',
      title: 'Example',
      order: 0,
      visibility: 'visible',
    })

    windowManager.commands.closeSurface(surfaceId)
    expect(desktopEnvironment.getSnapshot().windows[surfaceId]).toBeUndefined()
  })

  it('keeps presentation changes out of manager records', () => {
    const { windowManager, desktopEnvironment } = createManagers()
    const { surfaceId } = windowManager.commands.launchApplication({
      typeId: 'example',
    })

    desktopEnvironment.commands.setWindowVisibility(surfaceId, 'hidden')
    desktopEnvironment.commands.updateWindow(surfaceId, {
      position: { x: 20, y: 30 },
    })

    expect(desktopEnvironment.getSnapshot().windows[surfaceId]).toMatchObject({
      visibility: 'hidden',
      position: { x: 20, y: 30 },
    })
    expect(windowManager.getSnapshot().surfaces[surfaceId]).toEqual({
      id: surfaceId,
      applicationId: 'application:1',
      parentId: null,
    })
  })
})
