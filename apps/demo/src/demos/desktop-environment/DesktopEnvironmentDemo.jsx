import { useState } from 'react'
import {
  Desktop,
  DesktopEnvironment,
  createDesktopEnvironment,
  useDesktopCommands,
  useDesktopSnapshot,
  useWindowManagerCommands,
  useWindowManagerSnapshot,
} from 'react-desktop-environment/desktop-environment'
import { createWindowManager } from 'react-desktop-environment/window-manager'

const applicationTypes = {
  example: ExampleApplication,
}

const windowManager = createWindowManager()
const desktopEnvironment = createDesktopEnvironment({
  windowManager,
  createWindowState: ({ application, surface }) => ({
    workspaceId: 'main',
    title: `${application.payload?.title ?? application.typeId} · ${shortId(surface.id)}`,
  }),
})

function renderApplication({ application, surface, host, renderChildren }) {
  const Component = applicationTypes[application.typeId]
  if (!Component) {
    throw new Error(`Unknown demo application type: ${application.typeId}`)
  }

  return (
    <Component
      applicationId={application.id}
      surfaceId={surface.id}
      payload={application.payload}
      host={host}
      renderChildren={renderChildren}
    />
  )
}

export function DesktopEnvironmentDemo() {
  const [events, setEvents] = useState([])

  return (
    <DesktopEnvironment
      windowManager={windowManager}
      desktopEnvironment={desktopEnvironment}
      renderApplication={renderApplication}
      onInitialize={({ windowManagerSnapshot }) =>
        setEvents([
          {
            type: 'window-manager.initialized',
            applicationCount: Object.keys(windowManagerSnapshot.applications)
              .length,
            surfaceCount: Object.keys(windowManagerSnapshot.surfaces).length,
          },
        ])
      }
      onWindowManagerEvent={(event) =>
        setEvents((current) => [
          {
            type: event.type,
            applicationCount: Object.keys(event.snapshot.applications).length,
            surfaceCount: Object.keys(event.snapshot.surfaces).length,
          },
          ...current,
        ].slice(0, 8))
      }
    >
      <DesktopDemoContent events={events} />
    </DesktopEnvironment>
  )
}

function DesktopDemoContent({ events }) {
  const managerSnapshot = useWindowManagerSnapshot()
  const desktopSnapshot = useDesktopSnapshot()
  const managerCommands = useWindowManagerCommands()
  const desktopCommands = useDesktopCommands()
  const applications = Object.values(managerSnapshot.applications)
  const surfaces = Object.values(managerSnapshot.surfaces)
  const windows = Object.values(desktopSnapshot.windows).filter(
    (window) => window.workspaceId === 'main',
  )
  const hiddenWindows = windows.filter(
    (window) => window.visibility === 'hidden',
  )

  const launchApplication = () => {
    managerCommands.launchApplication({
      typeId: 'example',
      payload: { title: `Example application ${applications.length + 1}` },
    })
  }

  return (
    <main className="demo-layout">
      <a className="back-link" href="/">
        ← Demo directory
      </a>

      <header className="demo-header">
        <div>
          <p className="eyebrow">Window-manager consumer</p>
          <h1>Desktop environment</h1>
          <p className="lede">
            Manager surfaces are reconciled into independently owned desktop
            window records and rendered through consumer callbacks.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={launchApplication}>
          Launch application
        </button>
      </header>

      <section className="manager-grid">
        <section className="desktop-panel" aria-label="Desktop workspace">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Workspace: main</p>
              <h2>Desktop projection</h2>
            </div>
            <span>{windows.length} windows</span>
          </div>

          <Desktop
            workspaceId="main"
            className="desktop-canvas"
            emptyFallback={
              <div className="empty-state">
                Launch an application to create its first surface.
              </div>
            }
          />

          <div className="taskbar">
            <strong>Hidden windows</strong>
            {hiddenWindows.length === 0 ? <span>None</span> : null}
            {hiddenWindows.map((window) => (
              <button
                type="button"
                key={window.surfaceId}
                onClick={() => desktopCommands.focusWindow(window.surfaceId)}
              >
                Restore {shortId(window.surfaceId)}
              </button>
            ))}
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">External state callback</p>
              <h2>Manager events</h2>
            </div>
          </div>
          <ol className="event-list">
            {events.map((event, index) => (
              <li key={`${event.type}:${index}`}>
                <code>{event.type}</code>
                <span>
                  {event.applicationCount} apps · {event.surfaceCount} surfaces
                </span>
              </li>
            ))}
          </ol>

          <div className="snapshot-summary">
            <h3>Relational snapshot</h3>
            <pre>
              {JSON.stringify(
                {
                  applications: applications.map(({ id, typeId }) => ({
                    id: shortId(id),
                    typeId,
                  })),
                  surfaces: surfaces.map(({ id, applicationId, parentId }) => ({
                    id: shortId(id),
                    applicationId: shortId(applicationId),
                    parentId: shortId(parentId),
                  })),
                },
                null,
                2,
              )}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  )
}

function ExampleApplication({
  applicationId,
  surfaceId,
  payload,
  host,
  renderChildren,
}) {
  return (
    <section className="example-application">
      <h3>{payload?.title}</h3>
      <p>
        This application receives stable identities. Its business state remains
        application-owned.
      </p>
      <dl>
        <div>
          <dt>Application</dt>
          <dd>{shortId(applicationId)}</dd>
        </div>
        <div>
          <dt>Surface</dt>
          <dd>{shortId(surfaceId)}</dd>
        </div>
      </dl>

      <footer className="window-footer">
        <button type="button" onClick={() => host.openOwnSurface()}>
          Open another surface
        </button>
        <button
          type="button"
          onClick={() =>
            host.launchChild({
              typeId: 'example',
              payload: { title: `Child of ${shortId(surfaceId)}` },
            })
          }
        >
          Launch child
        </button>
        <button type="button" onClick={host.closeSelfApplication}>
          Close application
        </button>
      </footer>

      <div className="child-window-region">{renderChildren()}</div>
    </section>
  )
}

function shortId(id) {
  return id?.split(':').at(-1).slice(0, 8) ?? null
}
