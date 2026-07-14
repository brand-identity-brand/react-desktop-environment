import {
  WindowManagerCommandType,
  createCloseSurfaceCommand,
  createMoveSurfaceCommand,
  createOpenSurfaceCommand,
} from './commands.js'
import { prepareWindowManagerSnapshot } from './snapshot.js'
import { reduceWindowManager } from './transitions.js'

const resolveCreateId = (createId) => {
  if (createId !== undefined) {
    if (typeof createId !== 'function') throw new TypeError('createId must be a function')
    return createId
  }
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('createWindowManager requires crypto.randomUUID or an explicit createId')
  }
  return () => `surface:${globalThis.crypto.randomUUID()}`
}

export const createWindowManager = (options = {}) => {
  let snapshot = prepareWindowManagerSnapshot(options.initialSnapshot)
  const listeners = new Set()
  const eventListeners = new Set()
  const createId = resolveCreateId(options.createId)

  const getSnapshot = () => snapshot
  const dispatch = (command) => {
    const preparedCommand =
      command?.type === WindowManagerCommandType.openSurface
        ? createOpenSurfaceCommand({
            ...command.input,
            surfaceId: command.input.surfaceId ?? createId('surface'),
          })
        : command
    const transition = reduceWindowManager(snapshot, preparedCommand)
    snapshot = transition.snapshot
    listeners.forEach((listener) => listener())
    eventListeners.forEach((listener) => listener(transition.event))
    return transition.result
  }

  const commands = Object.freeze({
    openSurface: (input = {}) => dispatch(createOpenSurfaceCommand(input)),
    moveSurface: (surfaceId, parentSurfaceId = null) =>
      dispatch(createMoveSurfaceCommand(surfaceId, parentSurfaceId)),
    closeSurface: (surfaceId) => dispatch(createCloseSurfaceCommand(surfaceId)),
  })

  return Object.freeze({
    getSnapshot,
    dispatch,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscribeEvents(listener) {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },
    commands,
  })
}
