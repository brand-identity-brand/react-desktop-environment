import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createWindowManager } from '../createWindowManager.js'
import { WindowManagerProvider } from './WindowManagerProvider.jsx'
import { WindowProvider } from './WindowProvider.jsx'
import { useRootWindows, useWindow, useWindowController } from './hooks.js'

const createTestManager = () => {
  let sequence = 0
  return createWindowManager({ createId: () => `window:${++sequence}` })
}

const addWindow = (manager, input) =>
  manager.window.add({ window: manager.window.create(input) })

describe('window-manager React helpers', () => {
  it('provides current window relationships and scoped operations', () => {
    const manager = createTestManager()
    const window = addWindow(manager)
    let controller
    function Consumer() {
      controller = useWindowController()
      return <span data-testid="children">{controller.childWindows.length}</span>
    }
    render(
      <WindowManagerProvider manager={manager}>
        <WindowProvider windowId={window.windowId}><Consumer /></WindowProvider>
      </WindowManagerProvider>,
    )
    act(() => controller.add(controller.create()))
    expect(screen.getByTestId('children').textContent).toBe('1')
  })

  it('queries roots without window context', () => {
    const manager = createTestManager()
    addWindow(manager)
    function Roots() { return <span data-testid="roots">{useRootWindows().length}</span> }
    render(<WindowManagerProvider manager={manager}><Roots /></WindowManagerProvider>)
    expect(screen.getByTestId('roots').textContent).toBe('1')
  })

  it('does not rerender one window when another is added', () => {
    const manager = createTestManager()
    const window = addWindow(manager)
    const rendered = vi.fn()
    function Consumer() {
      rendered(useWindow(window.windowId))
      return null
    }
    render(<WindowManagerProvider manager={manager}><Consumer /></WindowManagerProvider>)
    act(() => addWindow(manager))
    expect(rendered).toHaveBeenCalledTimes(1)
  })
})
