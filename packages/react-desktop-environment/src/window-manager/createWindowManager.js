import {
  WindowManagerCommandType,
  createCloseApplicationCommand,
  createCloseSurfaceCommand,
  createLaunchApplicationCommand,
  createMoveSurfaceCommand,
  createOpenSurfaceCommand,
} from './commands.js'
import { prepareWindowManagerSnapshot } from './snapshot.js'
import { reduceWindowManager } from './transitions.js'

let fallbackSequence = 0

const defaultCreateId = (kind) => {
  const randomId = globalThis.crypto?.randomUUID?.()
  if (randomId) return `${kind}:${randomId}`

  fallbackSequence += 1
  return `${kind}:${fallbackSequence}`
}

export const createWindowManager = (options = {}) => {
  let snapshot = prepareWindowManagerSnapshot(options.initialSnapshot)
  const snapshotListeners = new Set()
  const eventListeners = new Set()
  const createId = options.createId ?? defaultCreateId

  const getSnapshot = () => snapshot

  const prepareCommand = (command) => {
    if (command?.type === WindowManagerCommandType.launchApplication) {
      return createLaunchApplicationCommand({
        ...command.input,
        applicationId: command.input.applicationId ?? createId('application'),
        surfaceId: command.input.surfaceId ?? createId('surface'),
      })
    }

    if (command?.type === WindowManagerCommandType.openSurface) {
      return createOpenSurfaceCommand({
        ...command.input,
        surfaceId: command.input.surfaceId ?? createId('surface'),
      })
    }

    return command
  }

  const dispatch = (command) => {
    const previousSnapshot = snapshot
    const transition = reduceWindowManager(
      previousSnapshot,
      prepareCommand(command),
    )
    snapshot = transition.snapshot
    snapshotListeners.forEach((listener) => listener())
    eventListeners.forEach((listener) => listener(transition.event))
    return transition.result
  }

  const commands = Object.freeze({
    launchApplication: (input) =>
      dispatch(createLaunchApplicationCommand(input)),
    closeApplication: (applicationId) =>
      dispatch(createCloseApplicationCommand(applicationId)),
    openSurface: (input) => dispatch(createOpenSurfaceCommand(input)),
    moveSurface: (surfaceId, parentSurfaceId = null) =>
      dispatch(createMoveSurfaceCommand(surfaceId, parentSurfaceId)),
    closeSurface: (surfaceId) => dispatch(createCloseSurfaceCommand(surfaceId)),
  })

  return Object.freeze({
    getSnapshot,
    dispatch,
    subscribe(listener) {
      snapshotListeners.add(listener)
      return () => snapshotListeners.delete(listener)
    },
    subscribeEvents(listener) {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },
    commands,
  })
}
