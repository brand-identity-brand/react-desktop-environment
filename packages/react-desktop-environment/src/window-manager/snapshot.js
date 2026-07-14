export const EMPTY_WINDOW_MANAGER_SNAPSHOT = Object.freeze({
  applications: Object.freeze({}),
  surfaces: Object.freeze({}),
})

const freezeRecord = (record) => Object.freeze({ ...record })

const freezeRecordCollection = (records = {}) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(records).map(([id, record]) => [id, freezeRecord(record)]),
    ),
  )

export const freezeWindowManagerSnapshot = (
  snapshot = EMPTY_WINDOW_MANAGER_SNAPSHOT,
) =>
  Object.freeze({
    applications: freezeRecordCollection(snapshot.applications),
    surfaces: freezeRecordCollection(snapshot.surfaces),
  })

const validateApplication = ([applicationId, application]) => {
  if (!application.id || application.id !== applicationId) {
    throw new Error(`Invalid application record: ${application.id ?? 'missing id'}`)
  }
  if (!application.typeId) {
    throw new Error(`Application ${applicationId} has no type`)
  }
}

const validateSurface = (snapshot) => ([surfaceId, surface]) => {
  if (!surface.id || surface.id !== surfaceId) {
    throw new Error(`Invalid surface record: ${surface.id ?? 'missing id'}`)
  }
  if (!snapshot.applications[surface.applicationId]) {
    throw new Error(`Surface ${surfaceId} refers to an unknown application`)
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

export const validateWindowManagerSnapshot = (snapshot) => {
  Object.entries(snapshot.applications).forEach(validateApplication)
  Object.entries(snapshot.surfaces).forEach(validateSurface(snapshot))
  Object.keys(snapshot.surfaces).forEach((surfaceId) =>
    validateSurfaceAncestors(snapshot, surfaceId),
  )
  return snapshot
}

export const prepareWindowManagerSnapshot = (snapshot) =>
  validateWindowManagerSnapshot(freezeWindowManagerSnapshot(snapshot))

export const requireApplication = (snapshot, applicationId) => {
  const application = snapshot.applications[applicationId]
  if (!application) throw new Error(`Unknown application: ${applicationId}`)
  return application
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

export const addApplication = (snapshot, application) => ({
  ...snapshot,
  applications: {
    ...snapshot.applications,
    [application.id]: application,
  },
})

export const addSurface = (snapshot, surface) => ({
  ...snapshot,
  surfaces: {
    ...snapshot.surfaces,
    [surface.id]: surface,
  },
})

export const replaceSurface = addSurface

const removeRecordIds = (records, removedIds) => {
  const removedIdSet = new Set(removedIds)
  return Object.fromEntries(
    Object.entries(records).filter(([id]) => !removedIdSet.has(id)),
  )
}

export const removeApplications = (snapshot, applicationIds) => ({
  ...snapshot,
  applications: removeRecordIds(snapshot.applications, applicationIds),
})

export const removeSurfaces = (snapshot, surfaceIds) => ({
  ...snapshot,
  surfaces: removeRecordIds(snapshot.surfaces, surfaceIds),
})
