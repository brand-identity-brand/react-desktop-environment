import React, { memo, useCallback, useSyncExternalStore } from 'react'

const requireCompositor = (compositor) => {
  if (
    !compositor?.surface ||
    !compositor?.application ||
    typeof compositor.subscribe !== 'function'
  ) {
    throw new TypeError('SurfaceComposer requires a compositor')
  }
  return compositor
}

// A key preserves component identity, memo skips rendering when props are
// unchanged, and an external-store subscription rerenders when the selected
// state for that surface changes.
//
// Keep the recursive composition as one simple architectural idea. If profiling
// shows that adding a sibling makes existing SurfaceComponent or
// ApplicationComponent renders expensive, each mapped surface can gain its own
// memoized rendering boundary. That is an infrastructure optimization, not a
// requirement of the surface architecture.
//
// Surface controls are compositor policy. The composer only connects those
// controls to the replaceable surface UI that invokes them.
const SurfaceComposer = memo(function SurfaceComposerComponent({
  compositor: suppliedCompositor,
  surfaceId,
  children,
}) {
  const compositor = requireCompositor(suppliedCompositor)
  const readChildren = useCallback(
    () => compositor.surface.readChildren({ surfaceId }),
    [compositor, surfaceId],
  )
  const childSurfaces = useSyncExternalStore(
    compositor.subscribe,
    readChildren,
    readChildren,
  )

  return (
    <>
      {children}

      {childSurfaces.map((surface) => {
        const SurfaceComponent = compositor.surface.getComponent({
          surfaceId: surface.surfaceId,
        })
        const ApplicationComponent = compositor.application.getComponent({
          applicationId: surface.applicationId,
        })
        const controls = compositor.surface.readControls({
          surfaceId: surface.surfaceId,
        })
        return (
          <SurfaceComponent
            {...surface.props}
            key={surface.surfaceId}
            surface={surface}
            window={surface.window}
            application={surface.application}
            hidden={surface.hidden}
            controls={controls}
          >
            <ApplicationComponent
              {...surface.application.props}
              key={surface.applicationId}
              controls={controls}
              surface={surface}
              window={surface.window}
              application={surface.application}
            />

            <SurfaceComposer
              compositor={compositor}
              surfaceId={surface.surfaceId}
            />
          </SurfaceComponent>
        )
      })}
    </>
  )
})

SurfaceComposer.displayName = 'SurfaceComposer'

export default SurfaceComposer
