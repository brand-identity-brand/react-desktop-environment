import { createElement } from 'react'
import { useCompositorContext, useCompositorSnapshot } from './hooks.js'

export function HiddenWindowsComposer({ workspaceId = 'default' }) {
  const { compositor, connectors } = useCompositorContext()
  const snapshot = useCompositorSnapshot()
  if (!connectors.HiddenWindow) return null
  return Object.entries(snapshot.windows)
    .filter(([, window]) => window.workspaceId === workspaceId && window.minimized)
    .map(([surfaceId, window]) =>
      createElement(connectors.HiddenWindow, {
        key: surfaceId,
        surfaceId,
        window,
        application: snapshot.applications[window.applicationId],
        restore: () => compositor.window.update(surfaceId, { minimized: false }),
        stop: () => compositor.window.stop(surfaceId),
      }),
    )
}
