import React, { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import createWindowManager from '../../window-manager/createWindowManager.js'
import createCompositor from '../createCompositor.js'
import SurfaceComposer from './SurfaceComposer.jsx'

describe('SurfaceComposer', () => {
  it('reactively composes child surfaces without context', () => {
    let sequence = 0
    const createId = (kind) => `${kind}:${++sequence}`
    const mounted = vi.fn()
    function Application({ application }) {
      useEffect(() => {
        mounted(application.applicationId)
      }, [application.applicationId])
      return <span>{application.props.label}</span>
    }
    function Surface({ surface, controls, children }) {
      return (
        <section
          hidden={surface.hidden}
          data-has-controls={typeof controls?.close === 'function'}
        >
          {children}
        </section>
      )
    }
    const windowManager = createWindowManager({ createId })
    const compositor = createCompositor({
      windowManager,
      createId,
      applicationRegistry: { Application },
      surfaceComponentRegistry: { Surface },
      defaultSurfaceComponentName: 'Surface',
    })
    const rootWindow = windowManager.window.add({
      window: windowManager.window.create(),
    })
    const rootApplication = compositor.application.add({
      application: compositor.application.create({ applicationName: 'Application' }),
    })
    const rootSurface = compositor.surface.add({
      surface: compositor.surface.create({
        windowId: rootWindow.windowId,
        applicationId: rootApplication.applicationId,
      }),
    })

    render(
      <SurfaceComposer
        compositor={compositor}
        surfaceId={rootSurface.surfaceId}
      >
        <h1>Desktop</h1>
      </SurfaceComposer>,
    )
    expect(screen.getByText('Desktop')).toBeDefined()

    let childSurface
    act(() => {
      const childWindow = windowManager.window.add({
        window: windowManager.window.create({
          parentWindowId: rootWindow.windowId,
        }),
      })
      const childApplication = compositor.application.add({
        application: compositor.application.create({
          applicationName: 'Application',
          props: { label: 'Child application' },
        }),
      })
      childSurface = compositor.surface.add({
        surface: compositor.surface.create({
          windowId: childWindow.windowId,
          applicationId: childApplication.applicationId,
        }),
      })
    })

    expect(screen.getByText('Child application')).toBeDefined()
    expect(
      screen.getByText('Child application').closest('section').dataset.hasControls,
    ).toBe('true')
    expect(mounted).toHaveBeenCalledTimes(1)

    act(() => compositor.surface.update({ surfaceId: childSurface.surfaceId, hidden: true }))
    expect(screen.getByText('Child application').closest('section').hidden).toBe(true)
    expect(mounted).toHaveBeenCalledTimes(1)
  })
})
