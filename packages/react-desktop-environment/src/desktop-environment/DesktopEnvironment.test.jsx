import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createWindowManager } from '../window-manager/createWindowManager.js'
import { DesktopEnvironment } from './DesktopEnvironment.jsx'
import { createDesktopEnvironment } from './createDesktopEnvironment.js'
import { Desktop } from './ui/Desktop.jsx'

describe('DesktopEnvironment', () => {
  it('lets an application choose where its child windows are rendered', () => {
    let sequence = 0
    const windowManager = createWindowManager({
      createId: (kind) => `${kind}:${++sequence}`,
    })
    const desktopEnvironment = createDesktopEnvironment({ windowManager })
    const { surfaceId: parentSurfaceId } =
      windowManager.commands.launchApplication({
        typeId: 'parent',
        payload: { label: 'Parent application' },
      })
    windowManager.commands.launchApplication({
      typeId: 'child',
      parentSurfaceId,
      payload: { label: 'Child application' },
    })

    render(
      <DesktopEnvironment
        windowManager={windowManager}
        desktopEnvironment={desktopEnvironment}
        renderApplication={({ application, renderChildren }) => (
          <section>
            <span>{application.payload.label}</span>
            <div data-testid={`children:${application.id}`}>
              {renderChildren()}
            </div>
          </section>
        )}
      >
        <Desktop workspaceId="main" />
      </DesktopEnvironment>,
    )

    expect(screen.getByText('Parent application')).toBeDefined()
    expect(screen.getByText('Child application')).toBeDefined()
    expect(
      screen.getByTestId('children:application:1').textContent,
    ).toContain('Child application')
  })
})
