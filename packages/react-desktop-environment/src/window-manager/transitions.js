import { WindowManagerCommandType } from './commands.js'
import {
  addApplication,
  addSurface,
  collectSurfaceTree,
  prepareWindowManagerSnapshot,
  removeApplications,
  removeSurfaces,
  replaceSurface,
  requireApplication,
  requireParentSurface,
  requireSurface,
} from './snapshot.js'

const WindowManagerEventType = Object.freeze({
  applicationLaunched: 'application.launched',
  applicationClosed: 'application.closed',
  surfaceOpened: 'surface.opened',
  surfaceMoved: 'surface.moved',
  surfaceClosed: 'surface.closed',
})

const freezeEventValue = (value) => {
  if (Array.isArray(value)) return Object.freeze([...value])
  if (value && typeof value === 'object') return Object.freeze({ ...value })
  return value
}

const createTransition = ({
  type,
  command,
  previousSnapshot,
  nextSnapshot,
  result,
  affected = {},
}) => {
  const snapshot = prepareWindowManagerSnapshot(nextSnapshot)
  const event = Object.freeze({
    type,
    input: command.input,
    ...Object.fromEntries(
      Object.entries(affected).map(([name, value]) => [
        name,
        freezeEventValue(value),
      ]),
    ),
    previousSnapshot,
    snapshot,
  })

  return Object.freeze({
    event,
    result: freezeEventValue(result),
    snapshot,
  })
}

const requireValue = (value, name) => {
  if (!value) throw new Error(`${name} is required`)
  return value
}

const requireAvailableId = (records, id, kind) => {
  if (records[id]) throw new Error(`Duplicate ${kind}: ${id}`)
  return id
}

const createApplication = (applicationId, input) => ({
  id: applicationId,
  typeId: input.typeId,
  ...(input.payload === undefined ? {} : { payload: input.payload }),
})

const createSurface = (surfaceId, applicationId, parentId) => ({
  id: surfaceId,
  applicationId,
  parentId,
})

const launchApplication = (snapshot, command) => {
  const typeId = requireValue(command.input.typeId, 'Application typeId')
  const applicationId = requireAvailableId(
    snapshot.applications,
    requireValue(command.input.applicationId, 'applicationId'),
    'application',
  )
  const surfaceId = requireAvailableId(
    snapshot.surfaces,
    requireValue(command.input.surfaceId, 'surfaceId'),
    'surface',
  )
  const parentId = command.input.parentSurfaceId ?? null
  requireParentSurface(snapshot, parentId)

  const application = createApplication(applicationId, {
    ...command.input,
    typeId,
  })
  const surface = createSurface(surfaceId, application.id, parentId)
  const applicationAdded = addApplication(snapshot, application)
  const surfaceAdded = addSurface(applicationAdded, surface)

  return createTransition({
    type: WindowManagerEventType.applicationLaunched,
    command,
    previousSnapshot: snapshot,
    nextSnapshot: surfaceAdded,
    result: { applicationId, surfaceId },
    affected: { application, surface },
  })
}

const closeApplication = (snapshot, command) => {
  const application = requireApplication(
    snapshot,
    command.input.applicationId,
  )
  const applicationSurfaceIds = Object.values(snapshot.surfaces)
    .filter((surface) => surface.applicationId === application.id)
    .map((surface) => surface.id)
  const removedSurfaceIds = [
    ...new Set(
      applicationSurfaceIds.flatMap((surfaceId) =>
        collectSurfaceTree(snapshot, surfaceId),
      ),
    ),
  ]
  const applicationRemoved = removeApplications(snapshot, [application.id])
  const surfacesRemoved = removeSurfaces(
    applicationRemoved,
    removedSurfaceIds,
  )

  return createTransition({
    type: WindowManagerEventType.applicationClosed,
    command,
    previousSnapshot: snapshot,
    nextSnapshot: surfacesRemoved,
    affected: { application, removedSurfaceIds },
  })
}

const openSurface = (snapshot, command) => {
  const application = requireApplication(
    snapshot,
    requireValue(command.input.applicationId, 'applicationId'),
  )
  const surfaceId = requireAvailableId(
    snapshot.surfaces,
    requireValue(command.input.surfaceId, 'surfaceId'),
    'surface',
  )
  const parentId = command.input.parentSurfaceId ?? null
  requireParentSurface(snapshot, parentId)
  const surface = createSurface(surfaceId, application.id, parentId)
  const surfaceAdded = addSurface(snapshot, surface)

  return createTransition({
    type: WindowManagerEventType.surfaceOpened,
    command,
    previousSnapshot: snapshot,
    nextSnapshot: surfaceAdded,
    result: surfaceId,
    affected: { application, surface },
  })
}

const moveSurface = (snapshot, command) => {
  const surface = requireSurface(snapshot, command.input.surfaceId)
  const application = requireApplication(snapshot, surface.applicationId)
  const parentId = command.input.parentSurfaceId ?? null
  requireParentSurface(snapshot, parentId)

  if (parentId !== null && collectSurfaceTree(snapshot, surface.id).includes(parentId)) {
    throw new Error(`Moving ${surface.id} would create a surface cycle`)
  }

  const movedSurface = { ...surface, parentId }
  const surfaceReplaced = replaceSurface(snapshot, movedSurface)

  return createTransition({
    type: WindowManagerEventType.surfaceMoved,
    command,
    previousSnapshot: snapshot,
    nextSnapshot: surfaceReplaced,
    affected: { application, surface: movedSurface },
  })
}

const closeSurface = (snapshot, command) => {
  const surface = requireSurface(snapshot, command.input.surfaceId)
  const application = requireApplication(snapshot, surface.applicationId)
  const removedSurfaceIds = collectSurfaceTree(snapshot, surface.id)
  const surfacesRemoved = removeSurfaces(snapshot, removedSurfaceIds)

  return createTransition({
    type: WindowManagerEventType.surfaceClosed,
    command,
    previousSnapshot: snapshot,
    nextSnapshot: surfacesRemoved,
    affected: { application, surface, removedSurfaceIds },
  })
}

const transitionByType = Object.freeze({
  [WindowManagerCommandType.launchApplication]: launchApplication,
  [WindowManagerCommandType.closeApplication]: closeApplication,
  [WindowManagerCommandType.openSurface]: openSurface,
  [WindowManagerCommandType.moveSurface]: moveSurface,
  [WindowManagerCommandType.closeSurface]: closeSurface,
})

export const reduceWindowManager = (snapshot, command) => {
  const transition = transitionByType[command?.type]
  if (!transition) {
    throw new Error(
      `Unknown window-manager command: ${command?.type ?? 'missing type'}`,
    )
  }
  return transition(snapshot, command)
}
