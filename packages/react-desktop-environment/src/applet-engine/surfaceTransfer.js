import { resolveDeckProps } from './deckProps.js'

function retainedProps(props = {}) {
  const { resident, order, peelProvisional, ...retained } = props
  if (retained.presentationMode !== 'preview') return retained
  const { presentationMode, ...ordinary } = retained
  return ordinary
}

/** Occurrence transactions; pointer input, confirmation and paint stay with UI. */
export default function createSurfaceTransfer({ compositor, runtime, retainDeck, restoreSelection }) {
  const pending = new Set()
  const read = (surfaceId) => surfaceId
    ? compositor.surface.read({ surfaceId }) : null
  const controls = (surfaceId) => compositor.surface.readControls({ surfaceId })
  const close = (surfaceId) => {
    if (read(surfaceId)) controls(surfaceId).close()
  }
  const parentOf = (surface) => Object.values(compositor.getSnapshot().surfaces)
    .find(({ windowId }) => windowId === surface?.window.parentWindowId)

  function beginPeel({
    surfaceId, applicationId, applicationProps, surfaceProps,
    ownerSurfaceId, deckApplicationId,
  }) {
    const original = read(surfaceId)
    if (surfaceId && !original) return null
    if (!read(ownerSurfaceId)) return null
    const parent = parentOf(original)
    const parentWindowId = original?.window.parentWindowId
    const selectedSurfaceId = parent?.selectedChildSurfaceId ?? null
    const presentedSurfaceId = parent
      ? runtime.readSelectedChild({ surfaceId: parent.surfaceId })?.surfaceId : null
    const selectedResident = original?.props.resident?.containerSurfaceId === parent?.surfaceId
      && presentedSurfaceId === original?.surfaceId
    const release = retainDeck(parent?.surfaceId, {
      selectedSurfaceId: selectedResident ? presentedSurfaceId : undefined,
    })
    const captured = original && {
      fullscreen: original.fullscreen,
      hidden: original.hidden,
      zIndex: original.zIndex,
      attentionRevision: original.attentionRevision,
      workspaceId: original.workspaceId,
      position: original.position,
      size: original.size,
      restoreGeometry: original.restoreGeometry,
      props: original.props,
    }
    let movingSurfaceId = original?.surfaceId
    let frameSurfaceId
    let provisionalDeckId
    let settled = false
    let stopObservation

    const finish = () => {
      settled = true
      stopObservation?.()
      pending.delete(cancel)
    }
    const restoreCapturedSelection = () => {
      const owner = read(parent?.surfaceId)
      const child = read(selectedSurfaceId)
      if (!owner) return
      if (selectedSurfaceId && child?.window.parentWindowId !== owner.windowId) return
      if (selectedSurfaceId === original?.surfaceId && captured.fullscreen && !child.fullscreen) return
      restoreSelection({ surfaceId: owner.surfaceId, childSurfaceId: selectedSurfaceId })
    }
    const selectReplacement = () => {
      if (!selectedResident || !read(parent.surfaceId)) return
      const replacement = compositor.surface.readChildren({ surfaceId: parent.surfaceId })
        .find(({ props }) => props.resident?.key === original.props.resident.key)
      if (replacement) runtime.selectChild({
        surfaceId: parent.surfaceId, childSurfaceId: replacement.surfaceId,
      })
    }
    const retainObject = (id, dynamic) => {
      const surface = read(id)
      compositor.surface.update({ surfaceId: id, props: retainedProps(surface.props) })
      if (dynamic) runtime.retainApplicationInstance({ applicationId: surface.applicationId })
    }
    const cancel = () => {
      if (settled) return false
      finish()
      try {
        const originalParentExists = parentWindowId === null
          || compositor.windowManager.window.read({ windowId: parentWindowId })
        if (original && read(movingSurfaceId) && originalParentExists) {
          compositor.windowManager.window.move({ windowId: original.windowId, parentWindowId })
          compositor.surface.update({ surfaceId: movingSurfaceId, ...captured })
        }
        if (!original) close(movingSurfaceId)
        close(provisionalDeckId)
        restoreCapturedSelection()
      } finally {
        release()
      }
      return true
    }
    const retain = ({ geometry } = {}) => {
      if (settled) return false
      if (!read(movingSurfaceId) || !read(frameSurfaceId)) {
        cancel()
        return false
      }
      compositor.surface.update({ surfaceId: frameSurfaceId, ...geometry, hidden: false })
      retainObject(movingSurfaceId, !original || captured.props.presentationMode === 'preview')
      if (provisionalDeckId) retainObject(provisionalDeckId, true)
      finish()
      release()
      selectReplacement()
      return true
    }
    const remove = () => {
      if (settled) return false
      finish()
      try {
        close(movingSurfaceId)
        close(provisionalDeckId)
      } finally {
        release()
      }
      selectReplacement()
      return true
    }

    try {
      if (original?.fullscreen) controls(surfaceId).exitFullscreen()
      if (deckApplicationId && !runtime.isDeckSurface({ surfaceId })) {
        const application = runtime.createApplicationInstance({
          applicationId: deckApplicationId, transient: true,
        })
        const themeRoot = original?.props.themeRoot !== undefined
          ? original.props.themeRoot
          : original && runtime.resolveApplicationNode(original.application)?.themeRoot
        const deck = runtime.createReferenceSurface({
          applicationId: application.applicationId, ownerSurfaceId, themeRoot,
          surfaceProps: { peelProvisional: true },
        })
        provisionalDeckId = deck.surfaceId
      }
      const destinationId = provisionalDeckId ?? ownerSurfaceId
      if (original) {
        controls(surfaceId).reparent(destinationId)
        compositor.surface.update({ surfaceId, hidden: false })
      } else {
        const application = runtime.createApplicationInstance({
          applicationId, props: applicationProps, cloneState: true, transient: true,
        })
        const surface = runtime.createReferenceSurface({
          applicationId: application.applicationId, ownerSurfaceId: destinationId,
          surfaceProps: { ...surfaceProps, peelProvisional: true },
        })
        movingSurfaceId = surface.surfaceId
      }
      if (provisionalDeckId) runtime.selectChild({
        surfaceId: provisionalDeckId, childSurfaceId: movingSurfaceId,
      })
      restoreCapturedSelection()
      frameSurfaceId = provisionalDeckId ?? movingSurfaceId
      controls(frameSurfaceId).focus()
      stopObservation = compositor.subscribe(() => {
        if (read(movingSurfaceId) && read(frameSurfaceId)) return
        stopObservation()
        queueMicrotask(cancel)
      })
      pending.add(cancel)
      return Object.freeze({ movingSurfaceId, frameSurfaceId, cancel, retain, remove })
    } catch (error) {
      cancel()
      throw error
    }
  }

  function mergeDeck({ surfaceId, targetSurfaceId }) {
    const source = read(surfaceId)
    const target = read(targetSurfaceId)
    if (!source || !target || surfaceId === targetSurfaceId) return false
    const windows = compositor.windowManager.getSnapshot().windows
    for (let ancestor = target.window; ancestor; ancestor = windows[ancestor.parentWindowId]) {
      if (ancestor.windowId === source.windowId) return false
    }
    if (!runtime.isDeckSurface({ surfaceId: targetSurfaceId })) return false
    if (!resolveDeckProps(target.props).addable) return false
    const sourceIsDeck = runtime.isDeckSurface({ surfaceId })
    const children = sourceIsDeck
      ? compositor.surface.readChildren({ surfaceId }) : [source]
    const selected = sourceIsDeck
      ? runtime.readSelectedChild({ surfaceId })?.surfaceId : surfaceId
    const release = retainDeck(surfaceId)
    try {
      for (const child of children) controls(child.surfaceId).reparent(targetSurfaceId)
      if (sourceIsDeck) close(surfaceId)
      for (const child of children) {
        const current = read(child.surfaceId)
        compositor.surface.update({ surfaceId: child.surfaceId, props: retainedProps(current.props) })
      }
      if (selected) runtime.selectChild({ surfaceId: targetSurfaceId, childSurfaceId: selected })
    } finally {
      release()
    }
    return true
  }

  return {
    beginPeel,
    mergeDeck,
    destroy() {
      for (const cancel of pending) cancel()
    },
  }
}
