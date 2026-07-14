import React, { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createWindowManager } from '../../window-manager/createWindowManager.js'
import { createCompositor } from '../createCompositor.js'
import { CompositorProvider } from './CompositorProvider.jsx'
import { WorkspaceComposer } from './WorkspaceComposer.jsx'

const createSystems = (applicationRegistry) => {
  let sequence = 0
  const createId = (kind) => `${kind}:${++sequence}`
  const windowManager = createWindowManager({ createId })
  const compositor = createCompositor({
    windowManager,
    createId,
    applicationRegistry,
  })
  return { compositor, windowManager }
}

describe('compositor React composition', () => {
  it('resolves compositor applications and composes child surfaces', () => {
    function Example({ application, composeChildren }) {
      return (
        <section>
          <span>{application.payload.label}</span>
          <div data-testid={`children:${application.payload.label}`}>
            {composeChildren()}
          </div>
        </section>
      )
    }
    const { compositor } = createSystems({ Example })
    const parent = compositor.application.run({
      registeredApplicationName: 'Example',
      payload: { label: 'Parent' },
    })
    compositor.application.run({
      registeredApplicationName: 'Example',
      payload: { label: 'Child' },
      parentSurfaceId: parent.surfaceId,
    })

    render(
      <CompositorProvider compositor={compositor}>
        <WorkspaceComposer />
      </CompositorProvider>,
    )

    expect(screen.getByText('Parent')).toBeDefined()
    expect(screen.getByTestId('children:Parent').textContent).toContain('Child')
  })

  it('changes workspace and minimized presentation without unmounting applications', () => {
    const mounted = vi.fn()
    const unmounted = vi.fn()
    function Example() {
      useEffect(() => {
        mounted()
        return unmounted
      }, [])
      return <span>Resident application</span>
    }
    const Window = ({ window, activeWorkspaceId, children }) => (
      <article hidden={window.minimized || window.workspaceId !== activeWorkspaceId}>
        {children}
      </article>
    )
    const { compositor } = createSystems({ Example })
    const { surfaceId } = compositor.application.run({
      registeredApplicationName: 'Example',
    })
    const view = render(
      <CompositorProvider compositor={compositor} connectors={{ Window }}>
        <WorkspaceComposer activeWorkspaceId="default" />
      </CompositorProvider>,
    )

    expect(mounted).toHaveBeenCalledTimes(1)
    view.rerender(
      <CompositorProvider compositor={compositor} connectors={{ Window }}>
        <WorkspaceComposer activeWorkspaceId="other" />
      </CompositorProvider>,
    )
    act(() => compositor.window.update(surfaceId, { minimized: true }))

    expect(screen.getByText('Resident application')).toBeDefined()
    expect(mounted).toHaveBeenCalledTimes(1)
    expect(unmounted).not.toHaveBeenCalled()
  })
})
