import { describe, expect, it } from 'vitest'
import createWindowManager from '../window-manager/createWindowManager.js'
import createCompositor from './createCompositor.js'

const createSystems = (options = {}) => {
  let sequence = 0
  const createId = (kind) => `${kind}:${++sequence}`
  const windowManager = createWindowManager({ createId })
  const compositor = createCompositor({
    windowManager,
    createId,
    applicationRegistry: { Example: () => null },
    surfaceComponentRegistry: { DefaultSurface: ({ children }) => children },
    defaultSurfaceComponentName: 'DefaultSurface',
    ...options,
  })
  return { windowManager, compositor }
}

const addWindow = (windowManager, input) =>
  windowManager.window.add({ window: windowManager.window.create(input) })

const addApplication = (compositor, input = {}) =>
  compositor.application.add({
    application: compositor.application.create({
      applicationName: 'Example',
      ...input,
    }),
  })

const addSurface = (compositor, input) =>
  compositor.surface.add({ surface: compositor.surface.create(input) })

describe('createCompositor', () => {
  it('owns independently identified surfaces with resolved relationships', () => {
    const { windowManager, compositor } = createSystems()
    const window = addWindow(windowManager)
    const application = addApplication(compositor, { props: { title: 'Example' } })
    const surface = addSurface(compositor, {
      windowId: window.windowId,
      applicationId: application.applicationId,
    })

    expect(surface).toEqual({
      surfaceId: expect.stringMatching(/^surface:/),
      windowId: window.windowId,
      window,
      applicationId: application.applicationId,
      application,
      surfaceComponentName: 'DefaultSurface',
      workspaceId: 'default',
      zIndex: 1,
      hidden: false,
      selectedChildSurfaceId: null,
      props: {},
    })
    expect(surface.surfaceId).not.toBe(window.windowId)
    expect(compositor.surface.read({ surfaceId: surface.surfaceId })).toBe(surface)
  })

  it('refreshes materialized surface links when related records change', () => {
    const { windowManager, compositor } = createSystems()
    const parentWindow = addWindow(windowManager)
    const childWindow = addWindow(windowManager, {
      parentWindowId: parentWindow.windowId,
    })
    const parentApplication = addApplication(compositor)
    const childApplication = addApplication(compositor)
    const parentSurface = addSurface(compositor, {
      windowId: parentWindow.windowId,
      applicationId: parentApplication.applicationId,
    })
    const childSurface = addSurface(compositor, {
      windowId: childWindow.windowId,
      applicationId: childApplication.applicationId,
    })

    expect(
      compositor.surface.readChildren({ surfaceId: parentSurface.surfaceId }),
    ).toEqual([childSurface])

    const updatedApplication = compositor.application.update({
      applicationId: childApplication.applicationId,
      props: { title: 'Updated' },
    })
    const updatedSurface = compositor.surface.read({ surfaceId: childSurface.surfaceId })
    expect(updatedSurface).not.toBe(childSurface)
    expect(updatedSurface.application).toBe(updatedApplication)

    const updatedWindow = windowManager.window.move({
      windowId: childWindow.windowId,
      parentWindowId: null,
    })
    expect(compositor.surface.read({ surfaceId: childSurface.surfaceId }).window).toBe(
      updatedWindow,
    )
    expect(
      compositor.surface.readChildren({ surfaceId: parentSurface.surfaceId }),
    ).toEqual([])
  })

  it('preserves unrelated surface references', () => {
    const { windowManager, compositor } = createSystems()
    const firstWindow = addWindow(windowManager)
    const secondWindow = addWindow(windowManager)
    const firstApplication = addApplication(compositor)
    const secondApplication = addApplication(compositor)
    const firstSurface = addSurface(compositor, {
      windowId: firstWindow.windowId,
      applicationId: firstApplication.applicationId,
    })
    const secondSurface = addSurface(compositor, {
      windowId: secondWindow.windowId,
      applicationId: secondApplication.applicationId,
    })

    compositor.surface.update({ surfaceId: firstSurface.surfaceId, hidden: true })
    expect(compositor.surface.read({ surfaceId: secondSurface.surfaceId })).toBe(
      secondSurface,
    )

    expect(compositor.surface.raise({ surfaceId: firstSurface.surfaceId })).toMatchObject({
      hidden: true,
      zIndex: 3,
    })
    compositor.surface.remove({ surfaceId: firstSurface.surfaceId })
    expect(compositor.surface.read({ surfaceId: firstSurface.surfaceId })).toBeUndefined()
    expect(compositor.application.read({
      applicationId: firstApplication.applicationId,
    })).toBe(firstApplication)
    expect(compositor.surface.read({ surfaceId: secondSurface.surfaceId })).toBe(
      secondSurface,
    )
  })

  it('stores immediate-child selection on the parent surface', () => {
    const { windowManager, compositor } = createSystems()
    const parentWindow = addWindow(windowManager)
    const childWindow = addWindow(windowManager, {
      parentWindowId: parentWindow.windowId,
    })
    const unrelatedWindow = addWindow(windowManager)
    const parentSurface = addSurface(compositor, {
      windowId: parentWindow.windowId,
      applicationId: addApplication(compositor).applicationId,
    })
    const childSurface = addSurface(compositor, {
      windowId: childWindow.windowId,
      applicationId: addApplication(compositor).applicationId,
    })
    const unrelatedSurface = addSurface(compositor, {
      windowId: unrelatedWindow.windowId,
      applicationId: addApplication(compositor).applicationId,
    })

    const selected = compositor.surface.selectChild({
      surfaceId: parentSurface.surfaceId,
      childSurfaceId: childSurface.surfaceId,
    })

    expect(selected.selectedChildSurfaceId).toBe(childSurface.surfaceId)
    expect(compositor.surface.readSelectedChild({
      surfaceId: parentSurface.surfaceId,
    })).toBe(childSurface)
    expect(() => compositor.surface.selectChild({
      surfaceId: parentSurface.surfaceId,
      childSurfaceId: unrelatedSurface.surfaceId,
    })).toThrow(/not an immediate child/)

    compositor.surface.remove({ surfaceId: childSurface.surfaceId })
    expect(compositor.surface.read({
      surfaceId: parentSurface.surfaceId,
    }).selectedChildSurfaceId).toBeNull()
  })

  it('supplies stable surface controls with configurable policy', () => {
    const configured = []
    const { windowManager, compositor } = createSystems({
      configureSurfaceControls({ controls, surfaceId }) {
        configured.push({ controls, surfaceId })
        return {
          inspect: () => surfaceId,
        }
      },
    })
    const window = addWindow(windowManager)
    const application = addApplication(compositor)
    const surface = addSurface(compositor, {
      windowId: window.windowId,
      applicationId: application.applicationId,
    })
    const controls = compositor.surface.readControls({
      surfaceId: surface.surfaceId,
    })

    expect(
      compositor.surface.readControls({ surfaceId: surface.surfaceId }),
    ).toBe(controls)
    expect(configured).toHaveLength(1)
    expect(controls.inspect()).toBe(surface.surfaceId)
    expect(controls.hide()).toMatchObject({ hidden: true })
    expect(controls.show()).toMatchObject({ hidden: false, zIndex: 2 })
    expect(controls.move({ position: { x: 20, y: 30 } })).toMatchObject({
      position: { x: 20, y: 30 },
    })
    expect(controls.selectChild).toBeTypeOf('function')
    expect(controls.focus()).toMatchObject({ zIndex: 3 })

    expect(controls.close()).toEqual({
      surfaceId: surface.surfaceId,
      removedWindowIds: [window.windowId],
      removedSurfaceIds: [],
      removedApplicationIds: [application.applicationId],
    })
    expect(compositor.surface.read({ surfaceId: surface.surfaceId })).toBeUndefined()
    expect(
      compositor.application.read({ applicationId: application.applicationId }),
    ).toBeUndefined()
  })

  it('reconciles removed windows and cleans unreferenced applications', () => {
    const { windowManager, compositor } = createSystems()
    const window = addWindow(windowManager)
    const application = addApplication(compositor)
    const surface = addSurface(compositor, {
      windowId: window.windowId,
      applicationId: application.applicationId,
    })

    windowManager.window.remove({ windowId: window.windowId })
    expect(compositor.surface.read({ surfaceId: surface.surfaceId })).toBeUndefined()
    expect(compositor.cleanup()).toEqual({
      removedSurfaceIds: [],
      removedApplicationIds: [application.applicationId],
    })
  })
})
