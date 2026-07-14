import { WindowManagerCommandType } from './commands.js'
import {
  collectSurfaceTree,
  prepareWindowManagerSnapshot,
  requireParentSurface,
  requireSurface,
} from './snapshot.js'

const createTransition = ({ type, command, previousSnapshot, surfaces, result }) => {
  const snapshot = prepareWindowManagerSnapshot({ surfaces })
  return Object.freeze({
    result,
    snapshot,
    event: Object.freeze({
      type,
      input: command.input,
      previousSnapshot,
      snapshot,
      result,
    }),
  })
}

const openSurface = (snapshot, command) => {
  const { surfaceId } = command.input
  if (!surfaceId) throw new Error('surfaceId is required')
  if (snapshot.surfaces[surfaceId]) {
    throw new Error(`Duplicate surface: ${surfaceId}`)
  }
  const parentId = command.input.parentSurfaceId ?? null
  requireParentSurface(snapshot, parentId)
  const surface = Object.freeze({ id: surfaceId, parentId })

  return createTransition({
    type: 'surface.opened',
    command,
    previousSnapshot: snapshot,
    surfaces: { ...snapshot.surfaces, [surfaceId]: surface },
    result: surfaceId,
  })
}

const moveSurface = (snapshot, command) => {
  const surface = requireSurface(snapshot, command.input.surfaceId)
  const parentId = command.input.parentSurfaceId ?? null
  requireParentSurface(snapshot, parentId)
  if (parentId !== null && collectSurfaceTree(snapshot, surface.id).includes(parentId)) {
    throw new Error(`Moving ${surface.id} would create a surface cycle`)
  }
  const movedSurface = Object.freeze({ ...surface, parentId })

  return createTransition({
    type: 'surface.moved',
    command,
    previousSnapshot: snapshot,
    surfaces: { ...snapshot.surfaces, [surface.id]: movedSurface },
    result: movedSurface,
  })
}

const closeSurface = (snapshot, command) => {
  requireSurface(snapshot, command.input.surfaceId)
  const removedSurfaceIds = collectSurfaceTree(snapshot, command.input.surfaceId)
  const removed = new Set(removedSurfaceIds)
  const surfaces = Object.fromEntries(
    Object.entries(snapshot.surfaces).filter(([id]) => !removed.has(id)),
  )

  return createTransition({
    type: 'surface.closed',
    command,
    previousSnapshot: snapshot,
    surfaces,
    result: Object.freeze(removedSurfaceIds),
  })
}

const transitions = Object.freeze({
  [WindowManagerCommandType.openSurface]: openSurface,
  [WindowManagerCommandType.moveSurface]: moveSurface,
  [WindowManagerCommandType.closeSurface]: closeSurface,
})

export const reduceWindowManager = (snapshot, command) => {
  const transition = transitions[command?.type]
  if (!transition) {
    throw new Error(`Unknown window-manager command: ${command?.type ?? 'missing type'}`)
  }
  return transition(snapshot, command)
}
