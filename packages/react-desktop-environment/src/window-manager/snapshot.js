export const EMPTY_WINDOW_MANAGER_SNAPSHOT = Object.freeze({
  surfaces: Object.freeze({}),
})

const freezeRecord = (record) =>
  Object.isFrozen(record) ? record : Object.freeze({ ...record })

const freezeSurfaces = (surfaces = {}) =>
  Object.isFrozen(surfaces)
    ? surfaces
    : Object.freeze(
        Object.fromEntries(
          Object.entries(surfaces).map(([id, surface]) => [
            id,
            freezeRecord(surface),
          ]),
        ),
      )

const validateSurface = (snapshot) => ([surfaceId, surface]) => {
  if (!surface.id || surface.id !== surfaceId) {
    throw new Error(`Invalid surface record: ${surface.id ?? 'missing id'}`)
  }
  if (surface.parentId !== null && !snapshot.surfaces[surface.parentId]) {
    throw new Error(`Surface ${surfaceId} refers to an unknown parent`)
  }
}

const validateSurfaceAncestors = (snapshot, surfaceId) => {
  const visitedIds = new Set([surfaceId])
  let parentId = snapshot.surfaces[surfaceId].parentId

  while (parentId !== null) {
    if (visitedIds.has(parentId)) {
      throw new Error(`Surface cycle detected at ${parentId}`)
    }
    visitedIds.add(parentId)
    parentId = snapshot.surfaces[parentId].parentId
  }
}

export const prepareWindowManagerSnapshot = (
  snapshot = EMPTY_WINDOW_MANAGER_SNAPSHOT,
) => {
  const prepared = Object.freeze({ surfaces: freezeSurfaces(snapshot.surfaces) })
  Object.entries(prepared.surfaces).forEach(validateSurface(prepared))
  Object.keys(prepared.surfaces).forEach((surfaceId) =>
    validateSurfaceAncestors(prepared, surfaceId),
  )
  return prepared
}

export const requireSurface = (snapshot, surfaceId) => {
  const surface = snapshot.surfaces[surfaceId]
  if (!surface) throw new Error(`Unknown surface: ${surfaceId}`)
  return surface
}

export const requireParentSurface = (snapshot, parentId) =>
  parentId === null ? null : requireSurface(snapshot, parentId)

export const collectSurfaceTree = (snapshot, rootId) => {
  const collectedIds = new Set([rootId])
  let childFound = true

  while (childFound) {
    childFound = false
    for (const surface of Object.values(snapshot.surfaces)) {
      if (
        surface.parentId !== null &&
        collectedIds.has(surface.parentId) &&
        !collectedIds.has(surface.id)
      ) {
        collectedIds.add(surface.id)
        childFound = true
      }
    }
  }

  return [...collectedIds]
}
