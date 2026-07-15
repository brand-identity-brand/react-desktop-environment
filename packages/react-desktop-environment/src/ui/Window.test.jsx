import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Window from './Window.jsx'

const firePointer = (element, type, values) => {
  const event = new Event(type, { bubbles: true })
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { value })
  }
  fireEvent(element, event)
}

describe('Window', () => {
  it('renders children, native props, and compositor visibility', () => {
    render(
      <Window
        surface={{ hidden: true }}
        window={{ windowId: 'window:1' }}
        application={{ applicationId: 'application:1' }}
        aria-label="Example window"
      >
        Application content
      </Window>,
    )

    const element = screen.getByLabelText('Example window')
    expect(element.hidden).toBe(true)
    expect(element.textContent).toContain('Application content')
    expect(element.style.border).toContain('2px')
  })

  it('focuses, hides, closes, and commits a dragged position on drop', () => {
    const controls = {
      focus: vi.fn(),
      hide: vi.fn(),
      close: vi.fn(),
      move: vi.fn(),
    }
    render(
      <Window
        surface={{
          surfaceId: 'surface:1',
          hidden: false,
          position: { x: 10, y: 20 },
          size: { width: 300, height: 200 },
          zIndex: 4,
        }}
        window={{ windowId: 'window:1' }}
        application={{ applicationId: 'application:1', applicationName: 'Notes' }}
        controls={controls}
        aria-label="Draggable window"
      >
        Notes
      </Window>,
    )

    const element = screen.getByLabelText('Draggable window')
    const titlebar = element.querySelector('header')
    firePointer(titlebar, 'pointerdown', {
      button: 0,
      pointerId: 1,
      clientX: 30,
      clientY: 40,
    })
    firePointer(titlebar, 'pointermove', {
      pointerId: 1,
      clientX: 70,
      clientY: 90,
    })
    expect(element.style.left).toBe('50px')
    expect(element.style.top).toBe('70px')
    firePointer(titlebar, 'pointerup', {
      pointerId: 1,
      clientX: 70,
      clientY: 90,
    })

    expect(controls.focus).toHaveBeenCalled()
    expect(controls.move).toHaveBeenCalledWith({
      position: { x: 50, y: 70 },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(controls.hide).toHaveBeenCalledWith()
    expect(controls.close).toHaveBeenCalledWith()
  })
})
