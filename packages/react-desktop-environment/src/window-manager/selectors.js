export const selectSurface = (surfaceId) => (snapshot) =>
  snapshot.surfaces[surfaceId]

export const selectSurfaces = (snapshot) => Object.values(snapshot.surfaces)

export const selectChildSurfaces = (parentId = null) => (snapshot) =>
  Object.values(snapshot.surfaces).filter(
    (surface) => surface.parentId === parentId,
  )
