import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from 'react'

const emptySurfaces = Object.freeze([])

function orderChildSurfaces(childSurfaces) {
  return childSurfaces.map((surface, sourceIndex) => ({
    order: Number.isInteger(surface.props?.order) ? surface.props.order : sourceIndex,
    sourceIndex,
    surface,
  })).sort((left, right) => (
    left.order - right.order || left.sourceIndex - right.sourceIndex
  )).map(({ surface }) => surface)
}

export default function useChildSurfaceComposition({
  engine,
  fullscreen,
  onSelectedSurfaceChange,
  ownerSurfaceId,
}) {
  const subscribe = useCallback(
    (listener) => engine?.compositor?.subscribe?.(listener) ?? (() => {}),
    [engine],
  )
  const readOwnerSurface = useCallback(
    () => engine?.compositor && ownerSurfaceId
      ? engine.compositor.surface.read({ surfaceId: ownerSurfaceId })
      : null,
    [engine, ownerSurfaceId],
  )
  const readChildSurfaces = useCallback(
    () => engine?.compositor?.surface.read({ surfaceId: ownerSurfaceId })
      ? engine.compositor.surface.readChildren({ surfaceId: ownerSurfaceId })
      : emptySurfaces,
    [engine, ownerSurfaceId],
  )
  const ownerSurface = useSyncExternalStore(
    subscribe,
    readOwnerSurface,
    readOwnerSurface,
  )
  const childSurfaces = useSyncExternalStore(
    subscribe,
    readChildSurfaces,
    readChildSurfaces,
  )
  const orderedChildSurfaces = useMemo(
    () => orderChildSurfaces(fullscreen === undefined
      ? childSurfaces
      : childSurfaces.filter((surface) => surface.fullscreen === fullscreen)),
    [childSurfaces, fullscreen],
  )
  const childSurfaceIds = useMemo(
    () => orderedChildSurfaces.map(({ surfaceId }) => surfaceId),
    [orderedChildSurfaces],
  )
  const selectedSurface = ownerSurface
    ? engine.runtime.readSelectedChild({ surfaceId: ownerSurfaceId, fullscreen })
    : null
  const selectedSurfaceId = selectedSurface?.surfaceId ?? null
  const selectSurface = useCallback((surfaceId) => {
    if (!engine?.compositor || !ownerSurfaceId) return null
    const currentChildSurfaces = engine.compositor.surface.readChildren({
      surfaceId: ownerSurfaceId,
    })
    if (!currentChildSurfaces.some((surface) => (
      surface.surfaceId === surfaceId
      && (fullscreen === undefined || surface.fullscreen === fullscreen)
    ))) return null

    engine.runtime.selectChild({
      surfaceId: ownerSurfaceId,
      childSurfaceId: surfaceId,
    })
    onSelectedSurfaceChange?.(surfaceId)
    return engine.compositor.surface.read({ surfaceId })
  }, [engine, fullscreen, onSelectedSurfaceChange, ownerSurfaceId])

  return {
    childSurfaceIds,
    childSurfaces: orderedChildSurfaces,
    engine,
    ownerSurfaceId,
    selectedSurfaceId,
    selectSurface,
  }
}
