import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { selectChildSurfaces, selectSurface } from '../selectors.js'
import { SurfaceIdContext, WindowManagerContext } from './contexts.js'

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
      const selection = selector(snapshot)
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

export const useCurrentSurfaceId = () => {
  const surfaceId = useContext(SurfaceIdContext)
  if (surfaceId === undefined) {
    throw new Error('useCurrentSurfaceId must be used within SurfaceProvider')
  }
  return surfaceId
}

export const useSurface = (surfaceId) => {
  const selector = useMemo(() => selectSurface(surfaceId), [surfaceId])
  return useWindowManagerSelector(selector)
}

export const useCurrentSurface = () => useSurface(useCurrentSurfaceId())

export const useChildSurfaces = (parentSurfaceId) => {
  const contextSurfaceId = useContext(SurfaceIdContext)
  const resolvedParentId = parentSurfaceId === undefined ? contextSurfaceId : parentSurfaceId
  if (resolvedParentId === undefined) {
    throw new Error('useChildSurfaces requires a parentSurfaceId or SurfaceProvider')
  }
  const selector = useMemo(
    () => selectChildSurfaces(resolvedParentId),
    [resolvedParentId],
  )
  return useWindowManagerSelector(selector, sameRecords)
}

export const useRootSurfaces = () => {
  const selector = useMemo(() => selectChildSurfaces(null), [])
  return useWindowManagerSelector(selector, sameRecords)
}

export const useParentSurface = () => {
  const surface = useCurrentSurface()
  return useSurface(surface?.parentId)
}

export const useSurfaceController = () => {
  const manager = useWindowManager()
  const surfaceId = useCurrentSurfaceId()
  const surface = useSurface(surfaceId)
  const parentSurface = useSurface(surface?.parentId)
  const childSurfaces = useChildSurfaces(surfaceId)
  const run = useCallback(
    (input = {}) => manager.commands.openSurface({ ...input, parentSurfaceId: surfaceId }),
    [manager, surfaceId],
  )
  const move = useCallback(
    (parentSurfaceId = null) => manager.commands.moveSurface(surfaceId, parentSurfaceId),
    [manager, surfaceId],
  )
  const stop = useCallback(
    () => manager.commands.closeSurface(surfaceId),
    [manager, surfaceId],
  )

  return useMemo(
    () => ({ surfaceId, surface, parentSurface, childSurfaces, run, move, stop }),
    [surfaceId, surface, parentSurface, childSurfaces, run, move, stop],
  )
}

const sameRecords = (previous, next) =>
  previous.length === next.length &&
  previous.every((record, index) => record === next[index])
