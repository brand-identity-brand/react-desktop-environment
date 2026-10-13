import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import AppletEngine from '../../applet-engine/AppletEngine.jsx'
import AppletEnvironment from '../../applet-engine/AppletEnvironment.jsx'
import useChildSurfaceComposition from '../../applet-engine/useChildSurfaceComposition.js'
import * as compositor from '../../compositor/index.js'
import * as windowManager from '../../window-manager/index.js'
import Window from '../Window.jsx'
import appletComposition from './appletComposition.js'
import AppletSurface from './AppletSurface.jsx'

const desktopEnvironment = { compositor, windowManager, ui: { Window } }
const engines = []
afterEach(() => {
  cleanup()
  engines.splice(0).forEach((engine) => engine.destroy())
})

function define(name, Component = () => null, children = {}) {
  Component.meta = { applicationName: name, displayName: name }
  Component.applets = children
  return Component
}

function Counter() {
  const [count, setCount] = AppletEngine.useState(0, 'count')
  return <button onClick={() => setCount(count + 1)}>Count {count}</button>
}

function mount(Root, setup = () => {}, composition = appletComposition) {
  const engine = AppletEngine.create({ applet: Root, desktopEnvironment, composition })
  engines.push(engine)
  setup(engine)
  const view = render(
    <AppletEnvironment desktopEnvironment={desktopEnvironment}>
      <AppletEngine engine={engine}><Root /></AppletEngine>
    </AppletEnvironment>,
  )
  return { engine, ...view }
}

const firePointer = (element, type, values) => {
  const event = new Event(type, { bubbles: true })
  Object.entries(values).forEach(([key, value]) => Object.defineProperty(event, key, { value }))
  fireEvent(element, event)
}

it('keeps stock descendants selectable and retained when their parent has a custom frame', () => {
  const counter = define('counter', Counter)
  const host = define('host', () => null, { counter })
  host.recipes = [Object.freeze({ name: 'inside', residents: [{ applet: 'counter' }] })]
  const outside = define('outside', () => <p>Outside content</p>)
  const Root = define('root', () => <p>Root content</p>, { host, outside })
  Root.recipes = [Object.freeze({ name: 'outer', residents: [{ applet: 'host' }, { applet: 'outside' }] })]
  function CustomHost({ surface, children }) {
    const engine = AppletEngine.use()
    const selection = useChildSurfaceComposition({ engine, ownerSurfaceId: surface.props.ownerSurfaceId })
    const visible = selection.selectedSurfaceId === surface.surfaceId
    return <section style={{ position: 'absolute', inset: '36px 0 0', display: visible ? 'block' : 'none' }}>{children}</section>
  }
  mount(Root, undefined, {
    ...appletComposition,
    ReferenceSurface: (props) => props.surface.application.applicationName === 'root/host'
      ? <CustomHost {...props} />
      : <AppletSurface {...props} />,
  })

  fireEvent.click(screen.getByRole('button', { name: 'Count 0' }))
  const retainedCounter = screen.getByRole('button', { name: 'Count 1' })
  fireEvent.click(screen.getByRole('button', { name: 'outside', exact: true }))
  expect(screen.queryByRole('button', { name: 'Count 1' })).toBeNull()
  expect(screen.getByText('Count 1')).toBe(retainedCounter)
  fireEvent.click(screen.getByRole('button', { name: 'host', exact: true }))
  expect(screen.getByRole('button', { name: 'Count 1' })).toBe(retainedCounter)
})

it('connects floating drag, sizing, fullscreen, restore, and close controls to the occurrence', () => {
  const counter = define('counter', Counter)
  const Root = define('root', () => null, { counter })
  Root.recipes = [Object.freeze({ name: 'mounted', residents: [{ applet: 'counter' }] })]
  let floating
  const { engine, container } = mount(Root, (runtime) => {
    floating = runtime.runtime.createReferenceSurface({
      applicationId: runtime.runtime.applicationForNode('root/counter').applicationId,
      ownerSurfaceId: runtime.rootSurfaceId,
      position: { x: 10, y: 20 },
      size: { width: 360, height: 240 },
    })
  })
  const read = () => engine.compositor.surface.read({ surfaceId: floating.surfaceId })
  const frame = container.querySelector(`[data-applet-surface="${floating.surfaceId}"]`)
  const mounted = engine.runtime.readSelectedChild({ surfaceId: engine.rootSurfaceId, fullscreen: true })
  const mountedFrame = container.querySelector(`[data-applet-surface="${mounted.surfaceId}"]`)
  const titlebar = frame.querySelector('header')
  firePointer(titlebar, 'pointerdown', { button: 0, pointerId: 1, clientX: 10, clientY: 20 })
  firePointer(titlebar, 'pointermove', { pointerId: 1, clientX: 40, clientY: 60 })
  firePointer(titlebar, 'pointerup', { pointerId: 1, clientX: 40, clientY: 60 })
  expect(read().position).toEqual({ x: 40, y: 60 })
  expect(within(mountedFrame).queryByRole('button', { name: 'Count 0' })).not.toBeNull()

  fireEvent.click(within(frame).getByRole('button', { name: 'Fullscreen' }))
  expect(read().fullscreen).toBe(true)
  expect(frame.style.width).toBe('100%')
  expect(within(mountedFrame).queryByRole('button', { name: 'Count 0' })).toBeNull()
  fireEvent.click(within(frame).getByRole('button', { name: 'Restore' }))
  expect(read().position).toEqual({ x: 40, y: 60 })
  expect(frame.style.width).toBe('360px')
  expect(within(mountedFrame).queryByRole('button', { name: 'Count 0' })).not.toBeNull()

  const grip = screen.getByRole('button', { name: 'Resize counter' })
  firePointer(grip, 'pointerdown', { button: 0, pointerId: 2, clientX: 0, clientY: 0 })
  firePointer(grip, 'pointermove', { pointerId: 2, clientX: 60, clientY: 40 })
  expect(frame.style.width).toBe('420px')
  firePointer(grip, 'pointerup', { pointerId: 2 })
  expect(read().size).toEqual({ width: 420, height: 280 })

  fireEvent.click(within(frame).getByRole('button', { name: 'Close', exact: true }))
  expect(read()).toBeUndefined()
  expect(container.querySelector(`[data-applet-surface="${floating.surfaceId}"]`)).toBeNull()
})

it('starts an independent stock engine inside a selected Deck without inheriting its exposure', () => {
  const Inner = define('inner', () => null, { counter: define('counter', Counter) })
  Inner.recipes = [Object.freeze({ name: 'inside', residents: [{ applet: 'counter' }] })]
  const innerEngine = AppletEngine.create({ applet: Inner, desktopEnvironment, composition: appletComposition })
  engines.push(innerEngine)
  const embedded = define('embedded', () => <AppletEngine engine={innerEngine}><Inner /></AppletEngine>)
  const Outer = define('outer', () => null, { embedded })
  Outer.recipes = [Object.freeze({ name: 'outside', residents: [{ applet: 'embedded' }] })]
  mount(Outer)

  fireEvent.click(screen.getByRole('button', { name: 'Count 0' }))
  expect(screen.getByRole('button', { name: 'Count 1' })).not.toBeNull()
})
