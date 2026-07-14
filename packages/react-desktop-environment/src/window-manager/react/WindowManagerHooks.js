import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { WindowIdContext, WindowManagerContext } from './WindowManagerContexts.js'

const sameRecords = (previous, next) =>
  previous.length === next.length &&
  previous.every((record, index) => record === next[index])

export const useWindowManager = () => {
  const manager = useContext(WindowManagerContext)
  if (!manager) throw new Error('useWindowManager must be used within WindowManagerProvider')
  return manager
}

export const useWindowManagerSelector = (selector, isEqual = Object.is) => {
  const manager = useWindowManager()
  const getSelection = useMemo(() => {
    let previousSnapshot
    let previousSelection
    return () => {
      const snapshot = manager.getSnapshot()
      if (snapshot === previousSnapshot) return previousSelection
      const selection = selector(manager, snapshot)
      if (previousSnapshot !== undefined && isEqual(previousSelection, selection)) {
        previousSnapshot = snapshot
        return previousSelection
      }
      previousSnapshot = snapshot
      previousSelection = selection
      return selection
    }
  }, [manager, selector, isEqual])
  return useSyncExternalStore(manager.subscribe, getSelection, getSelection)
}

export const useWindowManagerSnapshot = () => {
  const manager = useWindowManager()
  return useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot)
}

export const useCurrentWindowId = () => {
  const windowId = useContext(WindowIdContext)
  if (windowId === undefined) {
    throw new Error('useCurrentWindowId must be used within WindowProvider')
  }
  return windowId
}

export const useWindow = (windowId) => {
  const selector = useMemo(
    () => (manager) => manager.window.read({ windowId }),
    [windowId],
  )
  return useWindowManagerSelector(selector)
}

export const useCurrentWindow = () => useWindow(useCurrentWindowId())

export const useChildWindows = (parentWindowId) => {
  const contextWindowId = useContext(WindowIdContext)
  const windowId = parentWindowId === undefined ? contextWindowId : parentWindowId
  if (windowId === undefined) {
    throw new Error('useChildWindows requires a windowId or WindowProvider')
  }
  const selector = useMemo(
    () => (manager) => manager.window.readChildren({ windowId }),
    [windowId],
  )
  return useWindowManagerSelector(selector, sameRecords)
}

export const useRootWindows = () => {
  const selector = useMemo(
    () => (manager) => manager.window.readChildren({ windowId: null }),
    [],
  )
  return useWindowManagerSelector(selector, sameRecords)
}

export const useParentWindow = () => {
  const window = useCurrentWindow()
  return useWindow(window?.parentWindowId)
}

export const useWindowController = () => {
  const manager = useWindowManager()
  const windowId = useCurrentWindowId()
  const window = useWindow(windowId)
  const parentWindow = useWindow(window?.parentWindowId)
  const childWindows = useChildWindows(windowId)
  const create = useCallback(
    (input = {}) => manager.window.create({ ...input, parentWindowId: windowId }),
    [manager, windowId],
  )
  const add = useCallback(
    (record) => manager.window.add({ window: record }),
    [manager],
  )
  const move = useCallback(
    (parentWindowId = null) => manager.window.move({ windowId, parentWindowId }),
    [manager, windowId],
  )
  const remove = useCallback(
    () => manager.window.remove({ windowId }),
    [manager, windowId],
  )

  return useMemo(
    () => ({
      windowId,
      window,
      parentWindow,
      childWindows,
      create,
      add,
      move,
      remove,
    }),
    [windowId, window, parentWindow, childWindows, create, add, move, remove],
  )
}
