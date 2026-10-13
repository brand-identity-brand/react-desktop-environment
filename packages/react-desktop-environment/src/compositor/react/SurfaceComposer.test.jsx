import React, { createContext, useContext, useEffect, useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import createWindowManager from '../../window-manager/createWindowManager.js'
import createCompositor from '../createCompositor.js'
import SurfaceComposer from './SurfaceComposer.jsx'

describe('SurfaceComposer', () => {
  it.each([false, true])('resets Application-local state on reassignment with context %s', contextual => {
    const disposed = vi.fn()
    function Application({ application }) {
      const [initial] = useState(application.applicationId)
      useEffect(() => () => disposed(application.applicationId), [])
      return <output>{initial}</output>
    }
    const manager = createWindowManager()
    const compositor = createCompositor({ windowManager: manager,
      applicationRegistry: { Application }, surfaceComponentRegistry: { Surface: ({ children }) => <>{children}</> },
      defaultSurfaceComponentName: 'Surface',
    })
    const open = parentWindowId => {
      const window = manager.window.add({ window: manager.window.create({ parentWindowId }) })
      const application = compositor.application.add({ application: compositor.application.create({ applicationName: 'Application' }) })
      return compositor.surface.add({ surface: compositor.surface.create({ windowId: window.windowId, applicationId: application.applicationId }) })
    }
    const owner = open(null)
    const surface = open(owner.windowId)
    const replacement = compositor.application.add({ application: compositor.application.create({ applicationName: 'Application' }) })
    const context = contextual ? createContext(null) : undefined
    const view = render(<SurfaceComposer compositor={compositor} surfaceId={owner.surfaceId}
      applicationContext={context} renderApplication={(Applet, props) => <Applet {...props} />} />)
    try {
      expect(view.container.querySelector('output').textContent).toBe(surface.applicationId)
      act(() => compositor.surface.update({ surfaceId: surface.surfaceId, applicationId: replacement.applicationId }))
      expect(view.container.querySelector('output').textContent).toBe(replacement.applicationId)
      expect(disposed).toHaveBeenCalledWith(surface.applicationId)
    } finally { view.unmount(); compositor.destroy() }
  })
  it('reactively composes child surfaces without context', () => {
    let sequence = 0
    const createId = (kind) => `${kind}:${++sequence}`
    const mounted = vi.fn()
    function Application({ application, controls }) {
      useEffect(() => {
        mounted(application.applicationId)
      }, [application.applicationId])
      return (
        <span data-has-application-controls={typeof controls?.selectChild === 'function'}>
          {application.props.label}
        </span>
      )
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
    expect(screen.getByText('Child application').dataset.hasApplicationControls)
      .toBe('true')
    expect(
      screen.getByText('Child application').closest('section').dataset.hasControls,
    ).toBe('true')
    expect(mounted).toHaveBeenCalledTimes(1)

    act(() => compositor.surface.update({ surfaceId: childSurface.surfaceId, hidden: true }))
    expect(screen.getByText('Child application').closest('section').hidden).toBe(true)
    expect(mounted).toHaveBeenCalledTimes(1)
  })

  it('provides each composed application through an optional context', () => {
    let sequence = 0
    const createId = (kind) => `${kind}:${++sequence}`
    const ApplicationContext = createContext(null)
    function Application() {
      return <span>{useContext(ApplicationContext)?.applicationId}</span>
    }
    function Surface({ children }) {
      return children
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
        applicationContext={ApplicationContext}
        compositor={compositor}
        surfaceId={rootSurface.surfaceId}
      />,
    )

    let childApplication
    act(() => {
      const childWindow = windowManager.window.add({
        window: windowManager.window.create({
          parentWindowId: rootWindow.windowId,
        }),
      })
      childApplication = compositor.application.add({
        application: compositor.application.create({
          applicationName: 'Application',
        }),
      })
      compositor.surface.add({
        surface: compositor.surface.create({
          windowId: childWindow.windowId,
          applicationId: childApplication.applicationId,
        }),
      })
    })

    expect(screen.getByText(childApplication.applicationId)).toBeDefined()
  })
})
