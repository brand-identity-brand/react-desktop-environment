import Deck from './Deck.jsx'

export function isDeckSurface({ engine, surface }) {
  if (!engine || !surface) return false
  const node = engine.runtime.resolveApplicationNode(surface.application)
  return node?.Applet === Deck
}

export default function presentedSurface({ engine, surface }) {
  let presented = surface
  const visited = new Set()

  while (
    isDeckSurface({ engine, surface: presented })
    && !visited.has(presented.surfaceId)
  ) {
    visited.add(presented.surfaceId)
    const selected = engine.runtime.readSelectedChild({
      surfaceId: presented.surfaceId,
    })
    presented = selected ?? presented
  }

  return presented
}

export function surfacePlacementOwnerId({ engine, surface }) {
  const parent = surface?.props?.ownerSurfaceId
    ? engine.compositor.surface.read({
        surfaceId: surface.props.ownerSurfaceId,
      })
    : null
  return isDeckSurface({ engine, surface: parent })
    ? parent.props.ownerSurfaceId
    : surface?.props?.ownerSurfaceId
}
