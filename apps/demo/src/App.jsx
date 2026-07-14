import { useState } from 'react'
import {
  Button,
  Desktop,
  DesktopEnvironment,
  createDesktopEnvironment,
  createWindowManager,
  useDesktopCommands,
  useDesktopSnapshot,
  useWindowManagerCommands,
  useWindowManagerSnapshot,
} from 'react-desktop-environment'

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

function renderApplication({
  application,
  surface,
  host,
  renderChildren,
}) {
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

export default function App() {
  const [events, setEvents] = useState([])
  const recordEvent = (event) =>
    setEvents((current) => [event, ...current].slice(0, 8))

  return (
    <DesktopEnvironment
      windowManager={windowManager}
      desktopEnvironment={desktopEnvironment}
      renderApplication={renderApplication}
      onInitialize={({ windowManagerSnapshot }) =>
        recordEvent({
          type: 'window-manager.initialized',
          applicationCount: Object.keys(windowManagerSnapshot.applications).length,
          surfaceCount: Object.keys(windowManagerSnapshot.surfaces).length,
        })
      }
      onWindowManagerEvent={(event) =>
        recordEvent({
          type: event.type,
          applicationCount: Object.keys(event.snapshot.applications).length,
          surfaceCount: Object.keys(event.snapshot.surfaces).length,
        })
      }
    >
      <ManagerDemo events={events} />
    </DesktopEnvironment>
  )
}

function ManagerDemo({ events }) {
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
    const applicationNumber = applications.length + 1
    managerCommands.launchApplication({
      typeId: 'example',
      payload: { title: `Example application ${applicationNumber}` },
    })
  }

  return (
    <main className="demo-layout">
      <header className="demo-header">
        <div>
          <p className="eyebrow">Window-manager demo</p>
          <h1>React Desktop Environment</h1>
          <p className="lede">
            The headless manager owns application and surface relationships. The
            desktop environment independently owns and renders its windows.
          </p>
        </div>
        <Button type="button" className="primary-button" onClick={launchApplication}>
          Launch application
        </Button>
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
                Launch an application to create its first surface atomically.
              </div>
            }
          />

          <div className="taskbar">
            <strong>Hidden windows</strong>
            {hiddenWindows.length === 0 && <span>None</span>}
            {hiddenWindows.map((window) => (
              <Button
                type="button"
                key={window.surfaceId}
                onClick={() => desktopCommands.focusWindow(window.surfaceId)}
              >
                Restore {shortId(window.surfaceId)}
              </Button>
            ))}
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">External state callback</p>
              <h2>Window-manager events</h2>
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
  const openAnotherSurface = () => host.openOwnSurface()
  const launchChild = () =>
    host.launchChild({
      typeId: 'example',
      payload: { title: `Child of ${shortId(surfaceId)}` },
    })

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
        <Button type="button" onClick={openAnotherSurface}>
          Open another surface
        </Button>
        <Button type="button" onClick={launchChild}>
          Launch child
        </Button>
        <Button type="button" onClick={host.closeSelfApplication}>
          Close application
        </Button>
      </footer>

      <div className="child-window-region">{renderChildren()}</div>
    </section>
  )
}

function shortId(id) {
  return id?.split(':').at(-1).slice(0, 8) ?? null
}
