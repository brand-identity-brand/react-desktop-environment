const EMPTY_TABLE = Object.freeze({})
const EMPTY_SNAPSHOT = Object.freeze({
  applications: EMPTY_TABLE,
  surfaces: EMPTY_TABLE,
})

const resolveCreateId = (createId) => {
  if (createId !== undefined) {
    if (typeof createId !== 'function') throw new TypeError('createId must be a function')
    return createId
  }
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('createCompositor requires crypto.randomUUID or an explicit createId')
  }
  return (kind) => `${kind}:${globalThis.crypto.randomUUID()}`
}

const sameRecords = (previous, next) =>
  previous.length === next.length &&
  previous.every((record, index) => record === next[index])

export default function createCompositor(options = {}) {
  const { windowManager } = options
  if (!windowManager?.window || typeof windowManager.subscribe !== 'function') {
    throw new TypeError('createCompositor requires a window manager')
  }

  const applicationRegistry = Object.freeze({ ...(options.applicationRegistry ?? {}) })
  const surfaceComponentRegistry = Object.freeze({
    ...(options.surfaceComponentRegistry ?? {}),
  })
  const createId = resolveCreateId(options.createId)
  const defaultWorkspaceId = options.defaultWorkspaceId ?? 'default'
  const defaultSurfaceComponentName = options.defaultSurfaceComponentName
  const baseZIndex = options.baseZIndex ?? 1
  if (!Number.isFinite(baseZIndex)) throw new TypeError('baseZIndex must be finite')

  let snapshot = EMPTY_SNAPSHOT
  const listeners = new Set()
  const childCache = new Map()

  const notify = () => listeners.forEach((listener) => listener())
  const commit = ({ applications = snapshot.applications, surfaces = snapshot.surfaces }) => {
    snapshot = Object.freeze({
      applications: Object.freeze(applications),
      surfaces: Object.freeze(surfaces),
    })
    notify()
    return snapshot
  }
  const requireApplication = (applicationId) => {
    const record = snapshot.applications[applicationId]
    if (!record) throw new Error(`Unknown compositor application: ${applicationId}`)
    return record
  }
  const requireSurface = (surfaceId) => {
    const record = snapshot.surfaces[surfaceId]
    if (!record) throw new Error(`Unknown compositor surface: ${surfaceId}`)
    return record
  }
  const requireWindow = (windowId) => {
    const record = windowManager.window.read({ windowId })
    if (!record) throw new Error(`Unknown window-manager window: ${windowId}`)
    return record
  }
  const requireApplicationComponent = (applicationName) => {
    const Component = applicationRegistry[applicationName]
    if (!Component) throw new Error(`Unknown registered application: ${applicationName}`)
    return Component
  }
  const requireSurfaceComponent = (surfaceComponentName) => {
    const Component = surfaceComponentRegistry[surfaceComponentName]
    if (!Component) {
      throw new Error(`Unknown registered surface component: ${surfaceComponentName}`)
    }
    return Component
  }
  const validateSurfaceState = ({ surfaceId, zIndex, hidden, workspaceId }) => {
    if (!surfaceId) throw new Error('surfaceId is required')
    if (!workspaceId) throw new Error('surface workspaceId is required')
    if (!Number.isFinite(zIndex)) throw new TypeError('surface zIndex must be finite')
    if (typeof hidden !== 'boolean') throw new TypeError('surface hidden must be boolean')
  }
  const nextZIndex = () =>
    Math.max(
      baseZIndex - 1,
      ...Object.values(snapshot.surfaces).map(({ zIndex }) => zIndex),
    ) + 1

  const application = Object.freeze({
    create({ applicationId = createId('application'), applicationName, props = {} } = {}) {
      if (!applicationId) throw new Error('applicationId is required')
      requireApplicationComponent(applicationName)
      return Object.freeze({ applicationId, applicationName, props })
    },
    add({ application: record } = {}) {
      if (!record) throw new Error('application.add requires an application object')
      if (!record.applicationId) throw new Error('applicationId is required')
      if (snapshot.applications[record.applicationId]) {
        throw new Error(`Duplicate compositor application: ${record.applicationId}`)
      }
      requireApplicationComponent(record.applicationName)
      const added = Object.freeze({
        applicationId: record.applicationId,
        applicationName: record.applicationName,
        props: record.props ?? {},
      })
      commit({
        applications: { ...snapshot.applications, [added.applicationId]: added },
      })
      return added
    },
    read({ applicationId } = {}) {
      return snapshot.applications[applicationId]
    },
    update({ applicationId, ...changes } = {}) {
      const current = requireApplication(applicationId)
      const applicationName = changes.applicationName ?? current.applicationName
      requireApplicationComponent(applicationName)
      const updated = Object.freeze({ ...current, ...changes, applicationName })
      const surfaces = { ...snapshot.surfaces }
      for (const [surfaceId, surface] of Object.entries(surfaces)) {
        if (surface.applicationId === applicationId) {
          surfaces[surfaceId] = Object.freeze({ ...surface, application: updated })
        }
      }
      commit({
        applications: { ...snapshot.applications, [applicationId]: updated },
        surfaces,
      })
      return updated
    },
    remove({ applicationId } = {}) {
      requireApplication(applicationId)
      if (
        Object.values(snapshot.surfaces).some(
          (surface) => surface.applicationId === applicationId,
        )
      ) {
        throw new Error(`Cannot remove application ${applicationId} while surfaces reference it`)
      }
      const applications = { ...snapshot.applications }
      delete applications[applicationId]
      commit({ applications })
      return applicationId
    },
    getComponent({ applicationId } = {}) {
      return requireApplicationComponent(requireApplication(applicationId).applicationName)
    },
  })

  const surface = Object.freeze({
    create({
      surfaceId = createId('surface'),
      windowId,
      applicationId,
      surfaceComponentName = defaultSurfaceComponentName,
      workspaceId = defaultWorkspaceId,
      zIndex = nextZIndex(),
      hidden = false,
      position,
      size,
      props = {},
    } = {}) {
      validateSurfaceState({ surfaceId, workspaceId, zIndex, hidden })
      requireSurfaceComponent(surfaceComponentName)
      return Object.freeze({
        surfaceId,
        windowId,
        window: requireWindow(windowId),
        applicationId,
        application: requireApplication(applicationId),
        surfaceComponentName,
        workspaceId,
        zIndex,
        hidden,
        ...(position === undefined ? {} : { position }),
        ...(size === undefined ? {} : { size }),
        props,
      })
    },
    add({ surface: record } = {}) {
      if (!record) throw new Error('surface.add requires a surface object')
      validateSurfaceState(record)
      if (snapshot.surfaces[record.surfaceId]) {
        throw new Error(`Duplicate compositor surface: ${record.surfaceId}`)
      }
      const window = requireWindow(record.windowId)
      const linkedApplication = requireApplication(record.applicationId)
      requireSurfaceComponent(record.surfaceComponentName)
      if (record.window !== window || record.application !== linkedApplication) {
        throw new Error('surface.add requires current window and application references')
      }
      const added = Object.freeze({ ...record, window, application: linkedApplication })
      commit({ surfaces: { ...snapshot.surfaces, [added.surfaceId]: added } })
      return added
    },
    read({ surfaceId } = {}) {
      return snapshot.surfaces[surfaceId]
    },
    readChildren({ surfaceId } = {}) {
      const parentSurface = requireSurface(surfaceId)
      const managerSnapshot = windowManager.getSnapshot()
      const previous = childCache.get(surfaceId)
      if (
        previous?.compositorSnapshot === snapshot &&
        previous?.managerSnapshot === managerSnapshot
      ) {
        return previous.value
      }

      const childWindowIds = new Set(
        windowManager.window
          .readChildren({ windowId: parentSurface.windowId })
          .map((window) => window.windowId),
      )
      const next = Object.freeze(
        Object.values(snapshot.surfaces).filter((candidate) =>
          childWindowIds.has(candidate.windowId),
        ),
      )
      const value = previous && sameRecords(previous.value, next) ? previous.value : next
      childCache.set(surfaceId, {
        compositorSnapshot: snapshot,
        managerSnapshot,
        value,
      })
      return value
    },
    update({ surfaceId, window: suppliedWindow, application: suppliedApplication, ...changes } = {}) {
      if (suppliedWindow !== undefined || suppliedApplication !== undefined) {
        throw new Error('surface.update resolves window and application references itself')
      }
      const current = requireSurface(surfaceId)
      const windowId = changes.windowId ?? current.windowId
      const applicationId = changes.applicationId ?? current.applicationId
      const surfaceComponentName =
        changes.surfaceComponentName ?? current.surfaceComponentName
      requireSurfaceComponent(surfaceComponentName)
      const updated = Object.freeze({
        ...current,
        ...changes,
        surfaceId,
        windowId,
        window: requireWindow(windowId),
        applicationId,
        application: requireApplication(applicationId),
        surfaceComponentName,
      })
      validateSurfaceState(updated)
      commit({ surfaces: { ...snapshot.surfaces, [surfaceId]: updated } })
      return updated
    },
    remove({ surfaceId } = {}) {
      requireSurface(surfaceId)
      const surfaces = { ...snapshot.surfaces }
      delete surfaces[surfaceId]
      commit({ surfaces })
      return surfaceId
    },
    getComponent({ surfaceId } = {}) {
      return requireSurfaceComponent(requireSurface(surfaceId).surfaceComponentName)
    },
  })

  const reconcileWindows = () => {
    let changed = false
    const surfaces = {}
    for (const [surfaceId, current] of Object.entries(snapshot.surfaces)) {
      const window = windowManager.window.read({ windowId: current.windowId })
      if (!window) {
        changed = true
        continue
      }
      if (window !== current.window) {
        changed = true
        surfaces[surfaceId] = Object.freeze({ ...current, window })
      } else {
        surfaces[surfaceId] = current
      }
    }
    if (changed) commit({ surfaces })
  }
  const unsubscribeWindowManager = windowManager.subscribe(reconcileWindows)

  const cleanup = () => {
    const removedSurfaceIds = []
    const surfaces = {}
    for (const [surfaceId, record] of Object.entries(snapshot.surfaces)) {
      if (
        !windowManager.window.read({ windowId: record.windowId }) ||
        !snapshot.applications[record.applicationId]
      ) {
        removedSurfaceIds.push(surfaceId)
      } else {
        surfaces[surfaceId] = record
      }
    }
    const referencedApplicationIds = new Set(
      Object.values(surfaces).map(({ applicationId }) => applicationId),
    )
    const removedApplicationIds = Object.keys(snapshot.applications).filter(
      (applicationId) => !referencedApplicationIds.has(applicationId),
    )
    if (removedSurfaceIds.length || removedApplicationIds.length) {
      const removed = new Set(removedApplicationIds)
      commit({
        surfaces,
        applications: Object.fromEntries(
          Object.entries(snapshot.applications).filter(
            ([applicationId]) => !removed.has(applicationId),
          ),
        ),
      })
    }
    return Object.freeze({
      removedSurfaceIds: Object.freeze(removedSurfaceIds),
      removedApplicationIds: Object.freeze(removedApplicationIds),
    })
  }

  return Object.freeze({
    application,
    surface,
    applicationRegistry,
    surfaceComponentRegistry,
    windowManager,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    cleanup,
    destroy: unsubscribeWindowManager,
  })
}
