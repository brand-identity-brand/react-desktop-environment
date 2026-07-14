import { createElement } from 'react'
import { SurfaceIdContext } from './contexts.js'

export function SurfaceProvider({ surfaceId, children }) {
  if (!surfaceId) {
    throw new TypeError('SurfaceProvider requires a surfaceId')
  }

  return createElement(SurfaceIdContext.Provider, { value: surfaceId }, children)
}
