import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createWindowManager } from '../createWindowManager.js'
import { SurfaceProvider } from './SurfaceProvider.jsx'
import { WindowManagerProvider } from './WindowManagerProvider.jsx'
import { useRootSurfaces, useSurface, useSurfaceController } from './hooks.js'

const createTestManager = () => {
  let sequence = 0
  return createWindowManager({ createId: () => `surface:${++sequence}` })
}

describe('window-manager React helpers', () => {
  it('provides current surface relationships and scoped surface operations', () => {
    const manager = createTestManager()
    const surfaceId = manager.commands.openSurface()
    let controller
    function Consumer() {
      controller = useSurfaceController()
      return <span data-testid="children">{controller.childSurfaces.length}</span>
    }
    render(
      <WindowManagerProvider manager={manager}>
        <SurfaceProvider surfaceId={surfaceId}><Consumer /></SurfaceProvider>
      </WindowManagerProvider>,
    )
    act(() => controller.run())
    expect(screen.getByTestId('children').textContent).toBe('1')
  })

  it('queries roots without surface context', () => {
    const manager = createTestManager()
    manager.commands.openSurface()
    function Roots() { return <span data-testid="roots">{useRootSurfaces().length}</span> }
    render(<WindowManagerProvider manager={manager}><Roots /></WindowManagerProvider>)
    expect(screen.getByTestId('roots').textContent).toBe('1')
  })

  it('does not rerender one surface when another is added', () => {
    const manager = createTestManager()
    const surfaceId = manager.commands.openSurface()
    const rendered = vi.fn()
    function Consumer() {
      rendered(useSurface(surfaceId))
      return null
    }
    render(<WindowManagerProvider manager={manager}><Consumer /></WindowManagerProvider>)
    act(() => manager.commands.openSurface())
    expect(rendered).toHaveBeenCalledTimes(1)
  })
})
