import { createElement, useMemo } from 'react'
import { WindowManagerProvider } from '../../window-manager/react/index.js'
import { CompositorContext } from './contexts.js'

export function CompositorProvider({ compositor, connectors = {}, children }) {
  if (!compositor) throw new Error('CompositorProvider requires a compositor')
  const value = useMemo(
    () => ({
      compositor,
      connectors: Object.freeze({
        Workspace: connectors.Workspace,
        Window: connectors.Window,
        HiddenWindow: connectors.HiddenWindow,
        ApplicationError: connectors.ApplicationError,
      }),
    }),
    [compositor, connectors],
  )
  return createElement(
    WindowManagerProvider,
    { manager: compositor.windowManager },
    createElement(CompositorContext.Provider, { value }, children),
  )
}
