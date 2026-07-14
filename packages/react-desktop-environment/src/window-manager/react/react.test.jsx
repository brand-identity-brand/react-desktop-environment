import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createWindowManager } from '../createWindowManager.js'
import { SurfaceProvider } from './SurfaceProvider.jsx'
import { WindowManagerProvider } from './WindowManagerProvider.jsx'
import {
  useCurrentApplication,
  useCurrentSurface,
  useRootSurfaces,
  useSurface,
  useSurfaceController,
} from './hooks.js'

const createTestManager = () => {
  let sequence = 0
  return createWindowManager({
    createId: (kind) => `${kind}:${++sequence}`,
  })
}

describe('window-manager React helpers', () => {
  it('provides current records, relationships, and surface-scoped commands', () => {
    const manager = createTestManager()
    const { surfaceId } = manager.commands.launchApplication({
      typeId: 'parent',
      payload: { title: 'Parent' },
    })
    manager.commands.launchApplication({
      typeId: 'first-child',
      parentSurfaceId: surfaceId,
    })
    let controller

    function Consumer() {
      const surface = useCurrentSurface()
      const application = useCurrentApplication()
      controller = useSurfaceController()

      return (
        <div>
          <span>{surface.id}</span>
          <span>{application.payload.title}</span>
          <span data-testid="child-count">
            {controller.childSurfaces.length}
          </span>
        </div>
      )
    }

    render(
      <WindowManagerProvider manager={manager}>
        <SurfaceProvider surfaceId={surfaceId}>
          <Consumer />
        </SurfaceProvider>
      </WindowManagerProvider>,
    )

    expect(screen.getByText(surfaceId)).toBeDefined()
    expect(screen.getByText('Parent')).toBeDefined()
    expect(screen.getByTestId('child-count').textContent).toBe('1')

    act(() => {
      controller.launchChildApplication({ typeId: 'second-child' })
    })

    expect(screen.getByTestId('child-count').textContent).toBe('2')
    expect(
      Object.values(manager.getSnapshot().surfaces).filter(
        (surface) => surface.parentId === surfaceId,
      ),
    ).toHaveLength(2)
  })

  it('supports root relationship queries without a surface context', () => {
    const manager = createTestManager()
    manager.commands.launchApplication({ typeId: 'root' })

    function Roots() {
      return <span>{useRootSurfaces().length}</span>
    }

    render(
      <WindowManagerProvider manager={manager}>
        <Roots />
      </WindowManagerProvider>,
    )

    expect(screen.getByText('1')).toBeDefined()
  })

  it('does not rerender a surface subscriber when another surface changes', () => {
    const manager = createTestManager()
    const { surfaceId } = manager.commands.launchApplication({ typeId: 'first' })
    const renderSubscriber = vi.fn()

    function Subscriber() {
      const surface = useSurface(surfaceId)
      renderSubscriber(surface)
      return <span>{surface.id}</span>
    }

    render(
      <WindowManagerProvider manager={manager}>
        <Subscriber />
      </WindowManagerProvider>,
    )
    expect(renderSubscriber).toHaveBeenCalledTimes(1)

    act(() => {
      manager.commands.launchApplication({ typeId: 'unrelated' })
    })

    expect(renderSubscriber).toHaveBeenCalledTimes(1)
  })

  it('fails clearly when a hook is outside its provider', () => {
    function InvalidConsumer() {
      useSurface('surface:missing')
      return null
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<InvalidConsumer />)).toThrow(
        /within WindowManagerProvider/,
      )
    } finally {
      consoleError.mockRestore()
    }
  })
})
