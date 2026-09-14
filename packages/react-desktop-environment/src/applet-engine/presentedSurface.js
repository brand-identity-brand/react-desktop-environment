export function isDeckSurface({ engine, surface }) {
  if (!engine || !surface) return false
  const node = engine.runtime.resolveApplicationNode(surface.application)
  return node?.applicationName === 'deck'
}

export default function presentedSurface({ engine, surface }) {
  let presented = surface
  const visited = new Set()

  while (
    isDeckSurface({ engine, surface: presented })
    && !visited.has(presented.surfaceId)
  ) {
    visited.add(presented.surfaceId)
    const children = engine.compositor.surface.readChildren({
      surfaceId: presented.surfaceId,
    })
    presented = children.find(({ surfaceId }) => (
      surfaceId === presented.selectedChildSurfaceId
    )) ?? children[0] ?? presented
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
