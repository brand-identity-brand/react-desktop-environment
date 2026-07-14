import { useEffect, useState } from 'react'
import {
  CompositorProvider,
  HiddenWindowsComposer,
  WorkspaceComposer,
  createCompositor,
  useCompositor,
  useCompositorSnapshot,
} from 'react-desktop-environment/compositor'
import { createWindowManager } from 'react-desktop-environment/window-manager'
import { useWindowManagerSnapshot } from 'react-desktop-environment/window-manager/react'
import { defaultCompositorConnectors } from 'react-desktop-environment/ui'

const applicationRegistry = { ExampleApplication }
const windowManager = createWindowManager()
const compositor = createCompositor({ windowManager, applicationRegistry })

export function CompositorDemo() {
  const [events, setEvents] = useState([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('default')

  useEffect(
    () =>
      windowManager.subscribeEvents((event) => {
        setEvents((current) => [event, ...current].slice(0, 8))
      }),
    [],
  )

  return (
    <CompositorProvider compositor={compositor} connectors={defaultCompositorConnectors}>
      <CompositorDemoContent
        events={events}
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={setActiveWorkspaceId}
      />
    </CompositorProvider>
  )
}

function CompositorDemoContent({ events, activeWorkspaceId, setActiveWorkspaceId }) {
  const compositor = useCompositor()
  const managerSnapshot = useWindowManagerSnapshot()
  const snapshot = useCompositorSnapshot()
  const applications = Object.entries(snapshot.applications)
  const windows = Object.entries(snapshot.windows)

  const runApplication = () => {
    const number = applications.length + 1
    compositor.application.run({
      registeredApplicationName: 'ExampleApplication',
      payload: { title: `Example application ${number}` },
      window: {
        workspaceId: activeWorkspaceId,
        title: `Example application ${number}`,
      },
    })
  }

  return (
    <main className="demo-layout">
      <a className="back-link" href="/">← Demo directory</a>
      <header className="demo-header">
        <div>
          <p className="eyebrow">Window-manager director</p>
          <h1>Compositor</h1>
          <p className="lede">
            Applications remain resident while the stock UI changes their
            workspace visibility.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={runApplication}>Run application</button>
      </header>

      <section className="manager-grid">
        <section className="desktop-panel" aria-label="Desktop workspace">
          <div className="panel-heading">
            <div><p className="eyebrow">Workspace: {activeWorkspaceId}</p><h2>Resident desktop</h2></div>
            <span>{windows.length} windows</span>
          </div>
          <div className="taskbar">
            <strong>Workspace</strong>
            {['default', 'second'].map((workspaceId) => (
              <button type="button" key={workspaceId} onClick={() => setActiveWorkspaceId(workspaceId)}>{workspaceId}</button>
            ))}
          </div>
          <WorkspaceComposer
            activeWorkspaceId={activeWorkspaceId}
            emptyFallback={<div className="empty-state">Run an application to create its first window.</div>}
          />
          <div className="taskbar">
            <strong>Minimized windows</strong>
            <HiddenWindowsComposer workspaceId={activeWorkspaceId} />
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading"><div><p className="eyebrow">Independent state</p><h2>Compositor snapshot</h2></div></div>
          <ol className="event-list">
            {events.map((event, index) => <li key={`${event.type}:${index}`}><code>{event.type}</code></li>)}
          </ol>
          <div className="snapshot-summary">
            <h3>Applications and windows</h3>
            <pre>{JSON.stringify({ applications: snapshot.applications, windows: snapshot.windows, surfaces: managerSnapshot.surfaces }, null, 2)}</pre>
          </div>
        </aside>
      </section>
    </main>
  )
}

function ExampleApplication({ application, surface, window, controller, composeChildren }) {
  return (
    <section className="example-application">
      <h3>{application.payload?.title}</h3>
      <p>This resident application stays mounted across workspace and minimize changes.</p>
      <dl>
        <div><dt>Application</dt><dd>{shortId(controller.application.id)}</dd></div>
        <div><dt>Surface</dt><dd>{shortId(surface.id)}</dd></div>
      </dl>
      <footer className="window-footer">
        <button type="button" onClick={() => controller.window.run({ workspaceId: window.workspaceId })}>Run another window</button>
        <button
          type="button"
          onClick={() => controller.application.run({
            registeredApplicationName: 'ExampleApplication',
            payload: { title: `Child of ${shortId(surface.id)}` },
            window: { workspaceId: window.workspaceId, title: `Child of ${shortId(surface.id)}` },
          })}
        >
          Run child application
        </button>
        <button type="button" onClick={controller.application.stop}>Stop application</button>
      </footer>
      <div className="child-window-region">{composeChildren()}</div>
    </section>
  )
}

function shortId(id) {
  return id?.split(':').at(-1).slice(0, 8) ?? null
}
