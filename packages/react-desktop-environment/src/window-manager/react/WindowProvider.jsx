import { createElement } from 'react'
import { WindowIdContext } from './contexts.js'

export function WindowProvider({ windowId, children }) {
  if (!windowId) throw new TypeError('WindowProvider requires a windowId')
  return createElement(WindowIdContext.Provider, { value: windowId }, children)
}
