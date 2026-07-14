import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  createWindowManager,
  selectChildSurfaces,
} from 'react-desktop-environment/window-manager'

const windowManager = createWindowManager()

export function WindowManagerDemo() {
  const snapshot = useSyncExternalStore(
    windowManager.subscribe,
    windowManager.getSnapshot,
    windowManager.getSnapshot,
  )
  const [events, setEvents] = useState([])
  const applications = Object.values(snapshot.applications)
  const rootSurfaces = selectChildSurfaces(null)(snapshot)

  useEffect(
    () =>
      windowManager.subscribeEvents((event) => {
        setEvents((current) => [event, ...current].slice(0, 10))
      }),
    [],
  )

  const launchApplication = (parentSurfaceId = null) => {
    const applicationNumber = applications.length + 1
    windowManager.commands.launchApplication({
      typeId: 'example',
      parentSurfaceId,
      payload: { title: `Application ${applicationNumber}` },
    })
  }

  return (
    <main className="demo-layout">
      <a className="back-link" href="/">
        ← Demo directory
      </a>

      <header className="demo-header">
        <div>
          <p className="eyebrow">Headless external state</p>
          <h1>Window manager</h1>
          <p className="lede">
            This component subscribes directly to the manager. It does not
            create or use a desktop environment.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => launchApplication()}
        >
          Launch root application
        </button>
      </header>

      <section className="manager-grid">
        <section className="relationship-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Relationship table</p>
              <h2>Surface tree</h2>
            </div>
            <span>{Object.keys(snapshot.surfaces).length} surfaces</span>
          </div>

          <div className="surface-tree">
            {rootSurfaces.map((surface) => (
              <SurfaceBranch
                key={surface.id}
                surface={surface}
                snapshot={snapshot}
                launchApplication={launchApplication}
              />
            ))}
            {rootSurfaces.length === 0 ? (
              <div className="empty-state">
                Launch an application to create a root surface.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Callback subscription</p>
              <h2>Manager events</h2>
            </div>
          </div>
          <ol className="event-list">
            {events.map((event, index) => (
              <li key={`${event.type}:${index}`}>
                <code>{event.type}</code>
                <span>{event.surface?.id ?? event.application?.id}</span>
              </li>
            ))}
          </ol>

          <div className="snapshot-summary">
            <h3>Current snapshot</h3>
            <pre>{JSON.stringify(snapshot, null, 2)}</pre>
          </div>
        </aside>
      </section>
    </main>
  )
}

function SurfaceBranch({ surface, snapshot, launchApplication }) {
  const application = snapshot.applications[surface.applicationId]
  const children = selectChildSurfaces(surface.id)(snapshot)

  return (
    <article className="surface-branch">
      <div className="surface-record">
        <div>
          <strong>{application.payload?.title ?? application.typeId}</strong>
          <code>{shortId(surface.id)}</code>
          <small>parent: {shortId(surface.parentId) ?? 'root'}</small>
        </div>
        <div className="record-actions">
          <button
            type="button"
            onClick={() => launchApplication(surface.id)}
          >
            Launch child
          </button>
          <button
            type="button"
            onClick={() =>
              windowManager.commands.openSurface({
                applicationId: application.id,
                parentSurfaceId: surface.parentId,
              })
            }
          >
            Add app surface
          </button>
          <button
            type="button"
            onClick={() => windowManager.commands.closeSurface(surface.id)}
          >
            Close surface
          </button>
          <button
            type="button"
            onClick={() =>
              windowManager.commands.closeApplication(application.id)
            }
          >
            Close application
          </button>
        </div>
      </div>

      {children.length > 0 ? (
        <div className="surface-children">
          {children.map((child) => (
            <SurfaceBranch
              key={child.id}
              surface={child}
              snapshot={snapshot}
              launchApplication={launchApplication}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function shortId(id) {
  return id?.split(':').at(-1).slice(0, 8) ?? null
}
