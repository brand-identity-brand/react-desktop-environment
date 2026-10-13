import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppletEngine, AppletEnvironment, createAppletEngine } from '../../applet-engine/index.js'
import * as compositor from '../../compositor/index.js'
import * as windowManager from '../../window-manager/index.js'
import { AppletThemeProvider, DEFAULT_APPLET_THEME, useAppletTheme } from './AppletTheme.jsx'
import createAppletThemes from './createAppletThemes.js'

const environment = { compositor, windowManager }
afterEach(cleanup)

it('keeps equal roots distinct, shares inherited roots, and reuses GUI material on scheme revisits', () => {
  const reconcile = vi.fn((identity, scheme) => ({ ...identity, backgroundColor: scheme === 'night' ? 'black' : 'white' }))
  function Child() { return null }
  Child.meta = { applicationName: 'child' }
  function Left() { return null }
  Left.meta = { applicationName: 'left', theme: { ...DEFAULT_APPLET_THEME, reconcile } }
  Left.applets = { child: Child }
  function Right() { return null }
  Right.meta = { applicationName: 'right', theme: Left.meta.theme }
  function Root() { return null }
  Root.meta = { applicationName: 'root' }
  Root.applets = { left: Left, right: Right }
  const engine = AppletEngine.create({ applet: Root, desktopEnvironment: environment })
  const themes = createAppletThemes(engine)
  const left = { application: { applicationName: 'root/left' } }
  const child = { application: { applicationName: 'root/left/child' } }
  const right = { application: { applicationName: 'root/right' } }
  try {
    const day = themes(left, 'day')
    expect(themes(child, 'day')).toBe(day)
    expect(themes(right, 'day')).toEqual(day)
    expect(themes(right, 'day')).not.toBe(day)
    expect(reconcile).toHaveBeenCalledTimes(2)
    expect(themes(left, 'night')).not.toBe(day)
    expect(themes(left, 'day')).toBe(day)
    expect(reconcile).toHaveBeenCalledTimes(3)
    expect(createAppletThemes(engine)(left, 'day')).not.toBe(day)
  } finally { engine.destroy() }
})

it('lets Applets sharing an unchanged engine select independent GUI providers and material', () => {
  function Probe({ name }) {
    return <output data-name={name}>{useAppletTheme().backgroundColor}</output>
  }
  function Applet({ colour, name }) {
    return <AppletThemeProvider theme={{ ...DEFAULT_APPLET_THEME, backgroundColor: colour }}><Probe name={name} /></AppletThemeProvider>
  }
  Applet.meta = { applicationName: 'applet' }
  Applet.desktopEnvironment = environment
  const Binding = createAppletEngine(Applet)
  const engine = Binding.create()
  const runtime = engine.runtime
  const source = engine.compositor
  const before = engine.checkpoint.getSnapshot()
  const scene = colour => <AppletEnvironment desktopEnvironment={environment}><AppletEngine engine={engine}>
    <Applet colour="orange" name="host" />
    <Binding><Applet colour={colour} name="hosted" /></Binding>
  </AppletEngine></AppletEnvironment>
  try {
    const view = render(scene('blue'))
    expect(view.container.querySelector('[data-name="host"]').textContent).toBe('orange')
    expect(view.container.querySelector('[data-name="hosted"]').textContent).toBe('blue')
    view.rerender(scene('green'))
    expect(view.container.querySelector('[data-name="host"]').textContent).toBe('orange')
    expect(view.container.querySelector('[data-name="hosted"]').textContent).toBe('green')
    expect(engine.runtime).toBe(runtime)
    expect(engine.compositor).toBe(source)
    expect(engine.checkpoint.getSnapshot()).toBe(before)
  } finally { engine.destroy() }
})
