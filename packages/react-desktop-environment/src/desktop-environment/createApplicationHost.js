export const createDesktopApplicationHost = ({
  windowManager,
  desktopEnvironment,
  applicationId,
  surfaceId,
}) =>
  Object.freeze({
    applicationId,
    surfaceId,
    launchChild: (input) =>
      windowManager.commands.launchApplication({
        ...input,
        parentSurfaceId: surfaceId,
      }),
    openOwnSurface: (input = {}) =>
      windowManager.commands.openSurface({ ...input, applicationId }),
    closeSelfSurface: () => windowManager.commands.closeSurface(surfaceId),
    closeSelfApplication: () =>
      windowManager.commands.closeApplication(applicationId),
    focusSelf: () => desktopEnvironment.commands.focusWindow(surfaceId),
    setSelfVisibility: (visibility) =>
      desktopEnvironment.commands.setWindowVisibility(surfaceId, visibility),
  })
