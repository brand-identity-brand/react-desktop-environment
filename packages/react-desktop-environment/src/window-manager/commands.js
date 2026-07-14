export const WindowManagerCommandType = Object.freeze({
  launchApplication: 'application.launch',
  closeApplication: 'application.close',
  openSurface: 'surface.open',
  moveSurface: 'surface.move',
  closeSurface: 'surface.close',
})

const createCommand = (type, input) =>
  Object.freeze({
    type,
    input: Object.freeze({ ...input }),
  })

export const createLaunchApplicationCommand = (input) =>
  createCommand(WindowManagerCommandType.launchApplication, input)

export const createCloseApplicationCommand = (applicationId) =>
  createCommand(WindowManagerCommandType.closeApplication, { applicationId })

export const createOpenSurfaceCommand = (input) =>
  createCommand(WindowManagerCommandType.openSurface, input)

export const createMoveSurfaceCommand = (surfaceId, parentSurfaceId = null) =>
  createCommand(WindowManagerCommandType.moveSurface, {
    surfaceId,
    parentSurfaceId,
  })

export const createCloseSurfaceCommand = (surfaceId) =>
  createCommand(WindowManagerCommandType.closeSurface, { surfaceId })
