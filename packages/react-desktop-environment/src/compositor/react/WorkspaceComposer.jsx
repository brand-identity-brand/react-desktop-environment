import { createElement, Fragment } from 'react'
import { useRootSurfaces } from '../../window-manager/react/index.js'
import { SurfaceComposer } from './SurfaceComposer.jsx'
import { useCompositorContext, useCompositorSnapshot } from './hooks.js'

export function WorkspaceComposer({
  activeWorkspaceId = 'default',
  emptyFallback = null,
}) {
  const { connectors } = useCompositorContext()
  const rootSurfaces = useRootSurfaces()
  const snapshot = useCompositorSnapshot()
  const rootsWithWindows = rootSurfaces.filter(({ id }) => snapshot.windows[id])
  const content = rootsWithWindows.length
    ? rootsWithWindows.map(({ id }) =>
        createElement(SurfaceComposer, {
          key: id,
          surfaceId: id,
          activeWorkspaceId,
        }),
      )
    : emptyFallback

  if (!connectors.Workspace) return createElement(Fragment, null, content)
  return createElement(
    connectors.Workspace,
    {
      activeWorkspaceId,
      applications: snapshot.applications,
      windows: snapshot.windows,
    },
    content,
  )
}
