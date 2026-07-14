const EMPTY_SNAPSHOT = Object.freeze({
  applications: Object.freeze({}),
  windows: Object.freeze({}),
})

const freezeRecords = (records = {}) =>
  Object.isFrozen(records)
    ? records
    : Object.freeze(
        Object.fromEntries(
          Object.entries(records).map(([id, record]) => [
            id,
            Object.isFrozen(record) ? record : Object.freeze({ ...record }),
          ]),
        ),
      )

const prepareSnapshot = (snapshot = EMPTY_SNAPSHOT) => {
  const prepared = Object.freeze({
    applications: freezeRecords(snapshot.applications),
    windows: freezeRecords(snapshot.windows),
  })

  for (const [applicationId, application] of Object.entries(prepared.applications)) {
    if (!applicationId || !application.registeredApplicationName) {
      throw new Error(`Invalid compositor application: ${applicationId}`)
    }
  }
  for (const [surfaceId, window] of Object.entries(prepared.windows)) {
    if (!surfaceId || !prepared.applications[window.applicationId]) {
      throw new Error(`Window ${surfaceId} refers to an unknown application`)
    }
    if (!window.workspaceId || !Number.isFinite(window.zIndex)) {
      throw new Error(`Window ${surfaceId} has invalid presentation state`)
    }
    if (typeof window.minimized !== 'boolean') {
      throw new Error(`Window ${surfaceId} has invalid minimized state`)
    }
  }
  return prepared
}

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

export const createCompositor = (options = {}) => {
  const { windowManager } = options
  if (!windowManager) throw new Error('createCompositor requires a windowManager')

  const applicationRegistry =
    typeof options.applicationRegistry === 'function'
      ? options.applicationRegistry
      : Object.freeze({ ...(options.applicationRegistry ?? {}) })
  const createId = resolveCreateId(options.createId)
  const rootSurfaceId = options.rootSurfaceId ?? null
  const defaultWorkspaceId = options.defaultWorkspaceId ?? 'default'
  const baseZIndex = options.baseZIndex ?? 1
  if (!Number.isFinite(baseZIndex)) throw new TypeError('baseZIndex must be finite')

  let snapshot = prepareSnapshot(options.initialSnapshot)
  const listeners = new Set()
  const notify = () => listeners.forEach((listener) => listener())
  const commit = (nextSnapshot) => {
    snapshot = prepareSnapshot(nextSnapshot)
    notify()
    return snapshot
  }
  const resolveRegisteredApplication = (name) =>
    typeof applicationRegistry === 'function'
      ? applicationRegistry(name)
      : applicationRegistry[name]
  const requireRegisteredApplication = (name) => {
    if (!name || !resolveRegisteredApplication(name)) {
      throw new Error(`Unknown registered application: ${name ?? 'missing name'}`)
    }
    return name
  }
  const requireApplication = (applicationId) => {
    const application = snapshot.applications[applicationId]
    if (!application) throw new Error(`Unknown compositor application: ${applicationId}`)
    return application
  }
  const requireWindow = (surfaceId) => {
    const window = snapshot.windows[surfaceId]
    if (!window) throw new Error(`Unknown compositor window: ${surfaceId}`)
    return window
  }
  const nextZIndex = () =>
    Math.max(baseZIndex - 1, ...Object.values(snapshot.windows).map(({ zIndex }) => zIndex)) + 1
  const createWindowRecord = (applicationId, input = {}) =>
    Object.freeze({
      ...input,
      applicationId,
      workspaceId: input.workspaceId ?? defaultWorkspaceId,
      zIndex: input.zIndex ?? nextZIndex(),
      minimized: input.minimized ?? false,
    })

  const runWindow = ({ applicationId, parentSurfaceId, surfaceId, ...windowInput }) => {
    requireApplication(applicationId)
    const resolvedSurfaceId = surfaceId ?? createId('surface')
    if (snapshot.windows[resolvedSurfaceId]) {
      throw new Error(`Duplicate compositor window: ${resolvedSurfaceId}`)
    }
    const previousSnapshot = snapshot
    snapshot = prepareSnapshot({
      ...snapshot,
      windows: {
        ...snapshot.windows,
        [resolvedSurfaceId]: createWindowRecord(applicationId, windowInput),
      },
    })
    try {
      windowManager.commands.openSurface({
        surfaceId: resolvedSurfaceId,
        parentSurfaceId: parentSurfaceId ?? rootSurfaceId,
      })
    } catch (error) {
      snapshot = previousSnapshot
      throw error
    }
    notify()
    return resolvedSurfaceId
  }

  const application = Object.freeze({
    run(input = {}) {
      const registeredApplicationName = requireRegisteredApplication(
        input.registeredApplicationName,
      )
      const applicationId = input.applicationId ?? createId('application')
      if (snapshot.applications[applicationId]) {
        throw new Error(`Duplicate compositor application: ${applicationId}`)
      }
      const record = Object.freeze({
        registeredApplicationName,
        ...(input.payload === undefined ? {} : { payload: input.payload }),
      })
      const previousSnapshot = snapshot
      snapshot = prepareSnapshot({
        ...snapshot,
        applications: { ...snapshot.applications, [applicationId]: record },
      })
      try {
        const surfaceId = runWindow({
          applicationId,
          parentSurfaceId: input.parentSurfaceId,
          surfaceId: input.surfaceId,
          ...(input.window ?? {}),
        })
        return Object.freeze({ applicationId, surfaceId })
      } catch (error) {
        snapshot = previousSnapshot
        throw error
      }
    },
    stop(applicationId) {
      requireApplication(applicationId)
      const targetSurfaceIds = Object.entries(snapshot.windows)
        .filter(([, window]) => window.applicationId === applicationId)
        .map(([surfaceId]) => surfaceId)
      const managerSurfaces = windowManager.getSnapshot().surfaces
      const targetSet = new Set(targetSurfaceIds)
      const roots = targetSurfaceIds.filter((surfaceId) => {
        let parentId = managerSurfaces[surfaceId]?.parentId ?? null
        while (parentId !== null) {
          if (targetSet.has(parentId)) return false
          parentId = managerSurfaces[parentId]?.parentId ?? null
        }
        return true
      })
      roots.forEach((surfaceId) => {
        if (windowManager.getSnapshot().surfaces[surfaceId]) {
          windowManager.commands.closeSurface(surfaceId)
        }
      })
      const windows = Object.fromEntries(
        Object.entries(snapshot.windows).filter(
          ([, window]) => window.applicationId !== applicationId,
        ),
      )
      const applications = { ...snapshot.applications }
      delete applications[applicationId]
      commit({ applications, windows })
      return applicationId
    },
    update(applicationId, changes = {}) {
      const current = requireApplication(applicationId)
      const registeredApplicationName =
        changes.registeredApplicationName ?? current.registeredApplicationName
      requireRegisteredApplication(registeredApplicationName)
      return commit({
        ...snapshot,
        applications: {
          ...snapshot.applications,
          [applicationId]: Object.freeze({ ...current, ...changes, registeredApplicationName }),
        },
      }).applications[applicationId]
    },
  })

  const window = Object.freeze({
    run: runWindow,
    focus(surfaceId) {
      const current = requireWindow(surfaceId)
      return commit({
        ...snapshot,
        windows: {
          ...snapshot.windows,
          [surfaceId]: Object.freeze({
            ...current,
            zIndex: nextZIndex(),
            minimized: false,
          }),
        },
      }).windows[surfaceId]
    },
    stop(surfaceId) {
      requireWindow(surfaceId)
      if (windowManager.getSnapshot().surfaces[surfaceId]) {
        windowManager.commands.closeSurface(surfaceId)
      } else {
        const windows = { ...snapshot.windows }
        delete windows[surfaceId]
        commit({ ...snapshot, windows })
      }
      return surfaceId
    },
    update(surfaceId, changes = {}) {
      const current = requireWindow(surfaceId)
      if (
        changes.applicationId !== undefined &&
        changes.applicationId !== current.applicationId
      ) {
        throw new Error('window.update cannot change applicationId')
      }
      return commit({
        ...snapshot,
        windows: {
          ...snapshot.windows,
          [surfaceId]: Object.freeze({ ...current, ...changes }),
        },
      }).windows[surfaceId]
    },
  })

  const cleanup = () => {
    const surfaces = windowManager.getSnapshot().surfaces
    const removedWindowIds = Object.keys(snapshot.windows).filter(
      (surfaceId) => !surfaces[surfaceId],
    )
    const removedWindows = new Set(removedWindowIds)
    const windows = Object.fromEntries(
      Object.entries(snapshot.windows).filter(([surfaceId]) => !removedWindows.has(surfaceId)),
    )
    const referencedApplicationIds = new Set(
      Object.values(windows).map(({ applicationId }) => applicationId),
    )
    const removedApplicationIds = Object.keys(snapshot.applications).filter(
      (applicationId) => !referencedApplicationIds.has(applicationId),
    )
    if (removedWindowIds.length || removedApplicationIds.length) {
      const removedApplications = new Set(removedApplicationIds)
      commit({
        windows,
        applications: Object.fromEntries(
          Object.entries(snapshot.applications).filter(
            ([applicationId]) => !removedApplications.has(applicationId),
          ),
        ),
      })
    }
    return Object.freeze({
      removedWindowIds: Object.freeze(removedWindowIds),
      removedApplicationIds: Object.freeze(removedApplicationIds),
    })
  }

  const reconcileWindows = () => {
    const surfaces = windowManager.getSnapshot().surfaces
    const windows = Object.fromEntries(
      Object.entries(snapshot.windows).filter(([surfaceId]) => surfaces[surfaceId]),
    )
    if (Object.keys(windows).length !== Object.keys(snapshot.windows).length) {
      commit({ ...snapshot, windows })
    }
  }
  const unsubscribeWindowManager = windowManager.subscribe(reconcileWindows)
  reconcileWindows()

  return Object.freeze({
    application,
    window,
    applicationRegistry,
    windowManager,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    cleanup,
    destroy: unsubscribeWindowManager,
    resolveRegisteredApplication,
  })
}
