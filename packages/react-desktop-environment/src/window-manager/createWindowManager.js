const EMPTY_SNAPSHOT = Object.freeze({ windows: Object.freeze({}) })

const resolveCreateId = (createId) => {
  if (createId !== undefined) {
    if (typeof createId !== 'function') throw new TypeError('createId must be a function')
    return createId
  }
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('createWindowManager requires crypto.randomUUID or an explicit createId')
  }
  return () => `window:${globalThis.crypto.randomUUID()}`
}

const freezeWindows = (windows = {}) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(windows).map(([windowId, window]) => [
        windowId,
        Object.isFrozen(window) ? window : Object.freeze({ ...window }),
      ]),
    ),
  )

const prepareSnapshot = (input = EMPTY_SNAPSHOT) => {
  const snapshot = Object.freeze({ windows: freezeWindows(input.windows) })

  for (const [windowId, window] of Object.entries(snapshot.windows)) {
    if (!windowId || window.windowId !== windowId) {
      throw new Error(`Invalid window record: ${window.windowId ?? 'missing windowId'}`)
    }
    if (
      window.parentWindowId !== null &&
      !snapshot.windows[window.parentWindowId]
    ) {
      throw new Error(`Window ${windowId} refers to an unknown parent`)
    }
  }

  for (const windowId of Object.keys(snapshot.windows)) {
    const visited = new Set([windowId])
    let parentWindowId = snapshot.windows[windowId].parentWindowId
    while (parentWindowId !== null) {
      if (visited.has(parentWindowId)) {
        throw new Error(`Window cycle detected at ${parentWindowId}`)
      }
      visited.add(parentWindowId)
      parentWindowId = snapshot.windows[parentWindowId].parentWindowId
    }
  }

  return snapshot
}

const sameRecords = (previous, next) =>
  previous.length === next.length &&
  previous.every((record, index) => record === next[index])

export const createWindowManager = (options = {}) => {
  const createId = resolveCreateId(options.createId)
  let snapshot = prepareSnapshot(options.initialSnapshot)
  const listeners = new Set()
  const childCache = new Map()

  const notify = () => listeners.forEach((listener) => listener())
  const commit = (windows) => {
    snapshot = prepareSnapshot({ windows })
    notify()
    return snapshot
  }
  const requireWindow = (windowId) => {
    const record = snapshot.windows[windowId]
    if (!record) throw new Error(`Unknown window: ${windowId}`)
    return record
  }
  const requireParent = (parentWindowId) => {
    if (parentWindowId !== null) requireWindow(parentWindowId)
  }
  const collectTree = (rootWindowId) => {
    const collected = new Set([rootWindowId])
    let foundChild = true
    while (foundChild) {
      foundChild = false
      for (const record of Object.values(snapshot.windows)) {
        if (collected.has(record.parentWindowId) && !collected.has(record.windowId)) {
          collected.add(record.windowId)
          foundChild = true
        }
      }
    }
    return [...collected]
  }
  const readChildren = ({ windowId = null } = {}) => {
    if (windowId !== null) requireWindow(windowId)
    const previous = childCache.get(windowId)
    if (previous?.snapshot === snapshot) return previous.value

    const next = Object.freeze(
      Object.values(snapshot.windows).filter(
        (record) => record.parentWindowId === windowId,
      ),
    )
    const value = previous && sameRecords(previous.value, next) ? previous.value : next
    childCache.set(windowId, { snapshot, value })
    return value
  }

  const window = Object.freeze({
    create({ windowId = createId('window'), parentWindowId = null } = {}) {
      if (!windowId) throw new Error('windowId is required')
      return Object.freeze({ windowId, parentWindowId })
    },
    add({ window: record } = {}) {
      if (!record) throw new Error('window.add requires a window object')
      const { windowId, parentWindowId = null } = record
      if (!windowId) throw new Error('windowId is required')
      if (snapshot.windows[windowId]) throw new Error(`Duplicate window: ${windowId}`)
      requireParent(parentWindowId)
      const added = Object.freeze({ windowId, parentWindowId })
      commit({ ...snapshot.windows, [windowId]: added })
      return added
    },
    read({ windowId } = {}) {
      return snapshot.windows[windowId]
    },
    readChildren,
    move({ windowId, parentWindowId = null } = {}) {
      const current = requireWindow(windowId)
      requireParent(parentWindowId)
      if (parentWindowId !== null && collectTree(windowId).includes(parentWindowId)) {
        throw new Error(`Moving ${windowId} would create a window cycle`)
      }
      if (current.parentWindowId === parentWindowId) return current
      const moved = Object.freeze({ ...current, parentWindowId })
      commit({ ...snapshot.windows, [windowId]: moved })
      return moved
    },
    remove({ windowId } = {}) {
      requireWindow(windowId)
      const removedWindowIds = Object.freeze(collectTree(windowId))
      const removed = new Set(removedWindowIds)
      commit(
        Object.fromEntries(
          Object.entries(snapshot.windows).filter(([id]) => !removed.has(id)),
        ),
      )
      return removedWindowIds
    },
  })

  return Object.freeze({
    window,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  })
}
