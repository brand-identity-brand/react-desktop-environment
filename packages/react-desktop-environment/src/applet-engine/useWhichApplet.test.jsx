/* @vitest-environment jsdom */

import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import * as compositor from '../compositor/index.js'
import * as ui from '../ui/index.js'
import * as windowManager from '../window-manager/index.js'
import AppletEngine from './AppletEngine.jsx'
import AppletEnvironment from './AppletEnvironment.jsx'
import { useWhichApplet } from './AppletEngine.jsx'

const engines = []
afterEach(() => { cleanup(); engines.splice(0).forEach(engine => engine.destroy()) })

function defineApplet(applicationName, applets = {}) {
  function Applet() { return null }
  Applet.meta = { applicationName }
  Applet.applets = applets
  return Applet
}
const Workspace = defineApplet('workspace')
const Portfolio = defineApplet('portfolio', { workspace: Workspace })
const desktopEnvironment = { compositor, ui, windowManager }

function Occurrence({ receive, ...options }) {
  receive(useWhichApplet(options))
  return null
}

it('attaches its own definition under another root and follows replacement Application identity', () => {
  const engine = AppletEngine.create({ applet: Portfolio, desktopEnvironment })
  engines.push(engine)
  const workspace = engine.runtime.applicationForNode(Workspace)
  const replacement = engine.runtime.createApplicationInstance({ applicationId: workspace.applicationId })
  let current
  const observations = []
  const receive = (value) => { current = value; observations.push(value) }
  const present = (application) => <AppletEnvironment defaultDesktopEnvironment={desktopEnvironment}><AppletEngine applet={Portfolio} engine={engine}>
    <Occurrence applet={Workspace} application={application} receive={receive} />
  </AppletEngine></AppletEnvironment>
  const view = render(present())
  expect(current.application.applicationId).toBe(workspace.applicationId)
  expect(current.surface.applicationId).toBe(workspace.applicationId)
  expect(current.surface.surfaceId).not.toBe(engine.rootSurfaceId)
  observations.length = 0
  view.rerender(present(replacement))
  expect(current.surface.applicationId).toBe(replacement.applicationId)
  expect(observations.every(({ application, surface }) => !surface || surface.applicationId === application.applicationId)).toBe(true)
})

it('uses a supplied Surface occurrence before a matching inherited Application', () => {
  const engine = AppletEngine.create({ applet: Portfolio, desktopEnvironment })
  engines.push(engine)
  const definition = engine.runtime.applicationForNode(Workspace)
  const inherited = engine.runtime.createApplicationInstance({ applicationId: definition.applicationId })
  const supplied = engine.runtime.createApplicationInstance({ applicationId: definition.applicationId })
  const suppliedSurface = engine.runtime.ensureAnchorSurface({ applicationId: supplied.applicationId, key: 'supplied' })
  let current
  render(<AppletEnvironment defaultDesktopEnvironment={desktopEnvironment}>
    <AppletEngine applet={Portfolio} engine={engine}>
      <AppletEngine.Application application={inherited}>
        <Occurrence applet={Workspace} surface={suppliedSurface} receive={value => { current = value }} />
      </AppletEngine.Application>
    </AppletEngine>
  </AppletEnvironment>)
  expect(current.application.applicationId).toBe(supplied.applicationId)
  expect(current.surface.surfaceId).toBe(suppliedSurface.surfaceId)
})

it('retains the inherited occurrence of a definition reused under different owners', () => {
  const Shared = defineApplet('shared')
  const Left = defineApplet('left', { shared: Shared })
  const Right = defineApplet('right', { shared: Shared })
  const Root = defineApplet('root', { left: Left, right: Right })
  const engine = AppletEngine.create({ applet: Root, desktopEnvironment })
  engines.push(engine)
  const right = engine.runtime.applicationForNode(Right)
  const definition = engine.runtime.childApplication(right, 'shared')
  const inherited = engine.runtime.createApplicationInstance({ applicationId: definition.applicationId })
  let current
  render(<AppletEnvironment defaultDesktopEnvironment={desktopEnvironment}>
    <AppletEngine applet={Root} engine={engine}>
      <AppletEngine.Application application={inherited}>
        <Occurrence applet={Shared} receive={value => { current = value }} />
      </AppletEngine.Application>
    </AppletEngine>
  </AppletEnvironment>)
  expect(current.application.applicationId).toBe(inherited.applicationId)
  expect(current.surface.applicationId).toBe(inherited.applicationId)
})
