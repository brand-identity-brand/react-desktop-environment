import { createElement, Fragment, memo, useCallback, useSyncExternalStore } from 'react'

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

export const SurfaceComposer = memo(function SurfaceComposerImplementation({
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

  return createElement(
    Fragment,
    null,
    children,
    childSurfaces.map((surface) => {
      const SurfaceComponent = compositor.surface.getComponent({
        surfaceId: surface.surfaceId,
      })
      const ApplicationComponent = compositor.application.getComponent({
        applicationId: surface.applicationId,
      })

      return createElement(
        SurfaceComponent,
        {
          ...surface.props,
          key: surface.surfaceId,
          surface,
          window: surface.window,
          application: surface.application,
          hidden: surface.hidden,
        },
        createElement(ApplicationComponent, {
          ...surface.application.props,
          key: surface.applicationId,
          surface,
          window: surface.window,
          application: surface.application,
        }),
        createElement(SurfaceComposer, {
          compositor,
          surfaceId: surface.surfaceId,
        }),
      )
    }),
  )
})
