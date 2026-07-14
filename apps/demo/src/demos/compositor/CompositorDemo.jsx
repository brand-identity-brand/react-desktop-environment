import { useSyncExternalStore } from 'react'
import {
  SurfaceComposer,
  createCompositor,
} from 'react-desktop-environment/compositor'
import { createWindowManager } from 'react-desktop-environment/window-manager'

const windowManager = createWindowManager()
const compositor = createCompositor({
  windowManager,
  applicationRegistry: { DesktopRoot, ExampleApplication },
  surfaceComponentRegistry: { DemoSurface },
  defaultSurfaceComponentName: 'DemoSurface',
})

const rootWindow = addWindow()
const rootApplication = addApplication('DesktopRoot')
const rootSurface = addSurface(rootWindow, rootApplication)

export function CompositorDemo() {
  const compositorSnapshot = useSyncExternalStore(
    compositor.subscribe,
    compositor.getSnapshot,
    compositor.getSnapshot,
  )
  const managerSnapshot = windowManager.getSnapshot()

  const addChild = () => {
    const number = Object.keys(compositorSnapshot.applications).length
    const window = addWindow(rootWindow.windowId)
    const application = addApplication('ExampleApplication', {
      label: `Application ${number}`,
    })
    addSurface(window, application)
  }

  return (
    <main className="demo-layout">
      <a className="back-link" href="/">← Demo directory</a>
      <header className="demo-header">
        <div>
          <p className="eyebrow">Explicit prop composition</p>
          <h1>Compositor</h1>
          <p className="lede">
            Independent surfaces resolve their related windows and applications
            without React context.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={addChild}>
          Add composed surface
        </button>
      </header>

      <section className="manager-grid">
        <section className="desktop-panel">
          <SurfaceComposer compositor={compositor} surfaceId={rootSurface.surfaceId}>
            <div className="panel-heading"><h2>Resident surfaces</h2></div>
          </SurfaceComposer>
        </section>
        <aside className="inspector-panel">
          <div className="snapshot-summary">
            <h2>Relational state</h2>
            <pre>{JSON.stringify({
              windows: managerSnapshot.windows,
              applications: compositorSnapshot.applications,
              surfaces: compositorSnapshot.surfaces,
            }, null, 2)}</pre>
          </div>
        </aside>
      </section>
    </main>
  )
}

function DemoSurface({ surface, children }) {
  return (
    <article className="surface-record" hidden={surface.hidden}>
      {children}
    </article>
  )
}

function ExampleApplication({ application, surface }) {
  return (
    <section>
      <strong>{application.props.label}</strong>
      <small>surface: {shortId(surface.surfaceId)}</small>
      <div className="record-actions">
        <button
          type="button"
          onClick={() => compositor.surface.update({
            surfaceId: surface.surfaceId,
            hidden: true,
          })}
        >
          Hide with CSS
        </button>
      </div>
    </section>
  )
}

function DesktopRoot() {
  return null
}

function addWindow(parentWindowId = null) {
  return windowManager.window.add({
    window: windowManager.window.create({ parentWindowId }),
  })
}

function addApplication(applicationName, props = {}) {
  return compositor.application.add({
    application: compositor.application.create({ applicationName, props }),
  })
}

function addSurface(window, application) {
  return compositor.surface.add({
    surface: compositor.surface.create({
      windowId: window.windowId,
      applicationId: application.applicationId,
    }),
  })
}

function shortId(id) {
  return id?.split(':').at(-1).slice(0, 8) ?? null
}
