const EMPTY_DESKTOP_SNAPSHOT = Object.freeze({
  windows: Object.freeze({}),
})

const freezeDesktopSnapshot = (snapshot = EMPTY_DESKTOP_SNAPSHOT) =>
  Object.freeze({
    windows: Object.freeze(
      Object.fromEntries(
        Object.entries(snapshot.windows ?? {}).map(([surfaceId, window]) => [
          surfaceId,
          Object.freeze({ ...window }),
        ]),
      ),
    ),
  })

const validateWindow = ([surfaceId, window]) => {
  if (!window.surfaceId || window.surfaceId !== surfaceId) {
    throw new Error(`Invalid desktop window: ${window.surfaceId ?? 'missing id'}`)
  }
  if (!window.workspaceId) {
    throw new Error(`Desktop window ${surfaceId} has no workspace`)
  }
  if (!Number.isFinite(window.order)) {
    throw new Error(`Desktop window ${surfaceId} has an invalid order`)
  }
  if (window.visibility !== 'visible' && window.visibility !== 'hidden') {
    throw new Error(`Desktop window ${surfaceId} has invalid visibility`)
  }
}

const prepareDesktopSnapshot = (snapshot) => {
  const prepared = freezeDesktopSnapshot(snapshot)
  Object.entries(prepared.windows).forEach(validateWindow)
  return prepared
}

const nextWindowOrder = (windows, workspaceId) =>
  Math.max(
    -1,
    ...Object.values(windows)
      .filter((window) => window.workspaceId === workspaceId)
      .map((window) => window.order),
  ) + 1

export const createDesktopEnvironment = (options = {}) => {
  const { windowManager } = options
  if (!windowManager) {
    throw new Error('createDesktopEnvironment requires a windowManager')
  }

  const defaultWorkspaceId = options.defaultWorkspaceId ?? 'main'
  const createWindowState = options.createWindowState ?? (() => ({}))
  let snapshot = prepareDesktopSnapshot(options.initialSnapshot)
  const listeners = new Set()

  const notify = () => listeners.forEach((listener) => listener())

  const reconcile = () => {
    const managerSnapshot = windowManager.getSnapshot()
    const managerSurfaceIds = new Set(Object.keys(managerSnapshot.surfaces))
    const windows = Object.fromEntries(
      Object.entries(snapshot.windows).filter(([surfaceId]) =>
        managerSurfaceIds.has(surfaceId),
      ),
    )
    let changed = Object.keys(windows).length !== Object.keys(snapshot.windows).length

    for (const surface of Object.values(managerSnapshot.surfaces)) {
      if (windows[surface.id]) continue

      const application = managerSnapshot.applications[surface.applicationId]
      const suppliedState = createWindowState({
        surface,
        application,
        windowManagerSnapshot: managerSnapshot,
      }) ?? {}
      const workspaceId = suppliedState.workspaceId ?? defaultWorkspaceId

      windows[surface.id] = {
        ...suppliedState,
        surfaceId: surface.id,
        workspaceId,
        order: suppliedState.order ?? nextWindowOrder(windows, workspaceId),
        visibility: suppliedState.visibility ?? 'visible',
      }
      changed = true
    }

    if (!changed) return snapshot

    snapshot = prepareDesktopSnapshot({ windows })
    notify()
    return snapshot
  }

  const requireWindow = (surfaceId) => {
    const window = snapshot.windows[surfaceId]
    if (!window) throw new Error(`Unknown desktop window: ${surfaceId}`)
    return window
  }

  const replaceWindow = (surfaceId, nextWindow) => {
    snapshot = prepareDesktopSnapshot({
      windows: {
        ...snapshot.windows,
        [surfaceId]: nextWindow,
      },
    })
    notify()
  }

  const commands = Object.freeze({
    focusWindow(surfaceId) {
      const window = requireWindow(surfaceId)
      replaceWindow(surfaceId, {
        ...window,
        order: nextWindowOrder(snapshot.windows, window.workspaceId),
        visibility: 'visible',
      })
    },
    setWindowVisibility(surfaceId, visibility) {
      if (visibility !== 'visible' && visibility !== 'hidden') {
        throw new Error(`Invalid desktop window visibility: ${visibility}`)
      }
      replaceWindow(surfaceId, {
        ...requireWindow(surfaceId),
        visibility,
      })
    },
    updateWindow(surfaceId, changes) {
      const window = requireWindow(surfaceId)
      replaceWindow(surfaceId, {
        ...window,
        ...changes,
        surfaceId,
      })
    },
  })

  const unsubscribeWindowManager = windowManager.subscribe(reconcile)
  reconcile()

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reconcile,
    destroy: unsubscribeWindowManager,
    commands,
  })
}
