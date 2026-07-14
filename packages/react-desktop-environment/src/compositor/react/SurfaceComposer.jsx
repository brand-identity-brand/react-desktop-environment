import { createElement, Fragment, useCallback } from 'react'
import { SurfaceProvider } from '../../window-manager/react/index.js'
import { ApplicationComposer } from './ApplicationComposer.jsx'
import { useCompositorContext, useCompositorSurfaceController } from './hooks.js'

export function SurfaceComposer({ surfaceId, activeWorkspaceId }) {
  return createElement(
    SurfaceProvider,
    { surfaceId },
    createElement(ComposedSurface, { activeWorkspaceId }),
  )
}

function ComposedSurface({ activeWorkspaceId }) {
  const { connectors } = useCompositorContext()
  const controller = useCompositorSurfaceController()
  const composeChildren = useCallback(
    () =>
      controller.surface.childSurfaces.map((childSurface) =>
        createElement(SurfaceComposer, {
          key: childSurface.id,
          surfaceId: childSurface.id,
          activeWorkspaceId,
        }),
      ),
    [activeWorkspaceId, controller.surface.childSurfaces],
  )
  if (!controller.window.record || !controller.application.record) return null

  const content = createElement(ApplicationComposer, { controller, composeChildren })
  if (!connectors.Window) return createElement(Fragment, null, content)
  return createElement(
    connectors.Window,
    {
      surface: controller.surface.surface,
      application: controller.application.record,
      applicationId: controller.application.id,
      window: controller.window.record,
      controller,
      activeWorkspaceId,
      composeChildren,
    },
    content,
  )
}
