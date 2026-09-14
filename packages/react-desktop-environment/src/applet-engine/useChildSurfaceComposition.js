import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
    () => engine?.compositor && ownerSurfaceId
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
    () => orderChildSurfaces(childSurfaces),
    [childSurfaces],
  )
  const childSurfaceIds = useMemo(
    () => orderedChildSurfaces.map(({ surfaceId }) => surfaceId),
    [orderedChildSurfaces],
  )
  const retainedSelection = useRef(null)
  const recordedSelection = ownerSurface?.selectedChildSurfaceId
  const candidateId = recordedSelection ?? retainedSelection.current
  const candidate = candidateId
    ? engine?.compositor?.surface.read({ surfaceId: candidateId })
    : null
  const selectedSurfaceId = childSurfaceIds.includes(candidateId)
    || candidate?.props?.resident?.containerSurfaceId === ownerSurfaceId
    ? candidateId
    : childSurfaceIds[0] ?? null
  retainedSelection.current = selectedSurfaceId
  const selectSurface = useCallback((surfaceId) => {
    if (!engine?.compositor || !ownerSurfaceId) return null
    const currentChildSurfaces = engine.compositor.surface.readChildren({
      surfaceId: ownerSurfaceId,
    })
    if (!currentChildSurfaces.some((surface) => (
      surface.surfaceId === surfaceId
    ))) return null

    const selectedOwner = engine.compositor.surface.readControls({ surfaceId })
      .activate()
    onSelectedSurfaceChange?.(surfaceId)
    return selectedOwner
  }, [engine, onSelectedSurfaceChange, ownerSurfaceId])

  useEffect(() => {
    if (
      !ownerSurface
      || !selectedSurfaceId
      || !childSurfaceIds.includes(selectedSurfaceId)
      || selectedSurfaceId === ownerSurface.selectedChildSurfaceId
    ) return
    engine.runtime.selectChild({
      childSurfaceId: selectedSurfaceId,
      surfaceId: ownerSurfaceId,
      supply: { surfaceId: ownerSurfaceId },
    })
  }, [childSurfaceIds, engine, ownerSurface, ownerSurfaceId, selectedSurfaceId])

  return {
    childSurfaceIds,
    childSurfaces: orderedChildSurfaces,
    engine,
    ownerSurfaceId,
    selectedSurfaceId,
    selectSurface,
  }
}
