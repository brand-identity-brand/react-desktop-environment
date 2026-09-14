/* @vitest-environment jsdom */

import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AppletEnvironment from './AppletEnvironment.jsx'

const standaloneEnvironment = { source: 'standalone' }

function StandaloneApplet({ children, desktopEnvironment }) {
  return (
    <AppletEnvironment
      defaultDesktopEnvironment={standaloneEnvironment}
      desktopEnvironment={desktopEnvironment}
    >
      {children}
    </AppletEnvironment>
  )
}

function EnvironmentProbe({ onEnvironment }) {
  onEnvironment(AppletEnvironment.use())
  return null
}

describe('AppletEnvironment', () => {
  it('lets an Applet use its own desktop environment when standalone', () => {
    let receivedEnvironment

    render(
      <StandaloneApplet>
        <EnvironmentProbe
          onEnvironment={(environment) => {
            receivedEnvironment = environment
          }}
        />
      </StandaloneApplet>,
    )

    expect(receivedEnvironment).toBe(standaloneEnvironment)
  })

  it('inherits a consumer injection through nested meta-Applets', () => {
    const injectedEnvironment = { source: 'consumer' }
    let receivedEnvironment

    render(
      <AppletEnvironment desktopEnvironment={injectedEnvironment}>
        <StandaloneApplet>
          <EnvironmentProbe
            onEnvironment={(environment) => {
              receivedEnvironment = environment
            }}
          />
        </StandaloneApplet>
      </AppletEnvironment>,
    )

    expect(receivedEnvironment).toBe(injectedEnvironment)
  })
})
