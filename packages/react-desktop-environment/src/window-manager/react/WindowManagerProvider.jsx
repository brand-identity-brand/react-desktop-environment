import { createElement } from 'react'
import { WindowManagerContext } from './WindowManagerContexts.js'

const requireManager = (manager) => {
  if (
    !manager ||
    typeof manager.getSnapshot !== 'function' ||
    typeof manager.subscribe !== 'function' ||
    !manager.window
  ) {
    throw new TypeError('WindowManagerProvider requires a window manager')
  }

  return manager
}

export default function WindowManagerProvider({ manager, children }) {
  return createElement(
    WindowManagerContext.Provider,
    { value: requireManager(manager) },
    children,
  )
}
