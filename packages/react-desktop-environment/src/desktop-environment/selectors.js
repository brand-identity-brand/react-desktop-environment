export const selectDesktopWindow = (surfaceId) => (snapshot) =>
  snapshot.windows[surfaceId]

export const selectDesktopWindows = (snapshot) =>
  Object.values(snapshot.windows)

export const selectWorkspaceWindows = (workspaceId) => (snapshot) =>
  Object.values(snapshot.windows)
    .filter((window) => window.workspaceId === workspaceId)
    .sort((left, right) => left.order - right.order)
