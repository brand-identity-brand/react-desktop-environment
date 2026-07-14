import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { useCurrentSurfaceId, useSurfaceController } from '../../window-manager/react/index.js'
import { CompositorContext } from './contexts.js'

export const useCompositorContext = () => {
  const value = useContext(CompositorContext)
  if (!value) throw new Error('A compositor React helper is missing CompositorProvider')
  return value
}

export const useCompositor = () => useCompositorContext().compositor

export const useCompositorSelector = (selector, isEqual = Object.is) => {
  const compositor = useCompositor()
  const getSelection = useMemo(() => {
    let previousSnapshot
    let previousSelection
    return () => {
      const snapshot = compositor.getSnapshot()
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
  }, [compositor, isEqual, selector])
  return useSyncExternalStore(compositor.subscribe, getSelection, getSelection)
}

export const useCompositorSnapshot = () => {
  const compositor = useCompositor()
  return useSyncExternalStore(compositor.subscribe, compositor.getSnapshot, compositor.getSnapshot)
}

export const useCompositorWindow = (surfaceId) => {
  const selector = useMemo(() => (snapshot) => snapshot.windows[surfaceId], [surfaceId])
  return useCompositorSelector(selector)
}

export const useCompositorApplication = (applicationId) => {
  const selector = useMemo(
    () => (snapshot) => snapshot.applications[applicationId],
    [applicationId],
  )
  return useCompositorSelector(selector)
}

export const useCompositorSurfaceController = () => {
  const compositor = useCompositor()
  const surface = useSurfaceController()
  const windowRecord = useCompositorWindow(surface.surfaceId)
  const applicationRecord = useCompositorApplication(windowRecord?.applicationId)

  const runApplication = useCallback(
    (input) => compositor.application.run({ ...input, parentSurfaceId: surface.surfaceId }),
    [compositor, surface.surfaceId],
  )
  const runWindow = useCallback(
    (input = {}) =>
      compositor.window.run({
        ...input,
        applicationId: input.applicationId ?? windowRecord?.applicationId,
        parentSurfaceId: input.parentSurfaceId ?? surface.surfaceId,
      }),
    [compositor, surface.surfaceId, windowRecord?.applicationId],
  )
  const stopApplication = useCallback(
    () => compositor.application.stop(windowRecord?.applicationId),
    [compositor, windowRecord?.applicationId],
  )
  const updateApplication = useCallback(
    (changes) => compositor.application.update(windowRecord?.applicationId, changes),
    [compositor, windowRecord?.applicationId],
  )
  const stopWindow = useCallback(
    () => compositor.window.stop(surface.surfaceId),
    [compositor, surface.surfaceId],
  )
  const updateWindow = useCallback(
    (changes) => compositor.window.update(surface.surfaceId, changes),
    [compositor, surface.surfaceId],
  )
  const focusWindow = useCallback(
    () => compositor.window.focus(surface.surfaceId),
    [compositor, surface.surfaceId],
  )

  return useMemo(
    () => ({
      surface,
      application: {
        id: windowRecord?.applicationId,
        record: applicationRecord,
        run: runApplication,
        stop: stopApplication,
        update: updateApplication,
      },
      window: {
        surfaceId: surface.surfaceId,
        record: windowRecord,
        run: runWindow,
        focus: focusWindow,
        stop: stopWindow,
        update: updateWindow,
      },
    }),
    [
      surface,
      windowRecord,
      applicationRecord,
      runApplication,
      runWindow,
      stopApplication,
      updateApplication,
      stopWindow,
      updateWindow,
      focusWindow,
    ],
  )
}

export const useCurrentCompositorWindow = () =>
  useCompositorWindow(useCurrentSurfaceId())
