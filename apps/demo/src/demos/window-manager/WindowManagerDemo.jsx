import { useEffect, useState, useSyncExternalStore } from 'react'
import { createWindowManager, selectChildSurfaces } from 'react-desktop-environment/window-manager'

const windowManager = createWindowManager()

export function WindowManagerDemo() {
  const snapshot = useSyncExternalStore(
    windowManager.subscribe,
    windowManager.getSnapshot,
    windowManager.getSnapshot,
  )
  const [events, setEvents] = useState([])
  const rootSurfaces = selectChildSurfaces(null)(snapshot)

  useEffect(
    () =>
      windowManager.subscribeEvents((event) => {
        setEvents((current) => [event, ...current].slice(0, 10))
      }),
    [],
  )

  return (
    <main className="demo-layout">
      <a className="back-link" href="/">← Demo directory</a>
      <header className="demo-header">
        <div>
          <p className="eyebrow">Headless relationship engine</p>
          <h1>Window manager</h1>
          <p className="lede">
            The manager owns only surface identity, parent relationships, and
            lifecycle. It knows nothing about applications or presentation.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => windowManager.commands.openSurface()}
        >
          Open root surface
        </button>
      </header>

      <section className="manager-grid">
        <section className="relationship-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Relationship table</p><h2>Surface tree</h2></div>
            <span>{Object.keys(snapshot.surfaces).length} surfaces</span>
          </div>
          <div className="surface-tree">
            {rootSurfaces.map((surface) => (
              <SurfaceBranch key={surface.id} surface={surface} snapshot={snapshot} />
            ))}
            {rootSurfaces.length === 0 ? (
              <div className="empty-state">Open a surface to begin a relationship tree.</div>
            ) : null}
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading"><div><p className="eyebrow">Callback subscription</p><h2>Manager events</h2></div></div>
          <ol className="event-list">
            {events.map((event, index) => (
              <li key={`${event.type}:${index}`}><code>{event.type}</code></li>
            ))}
          </ol>
          <div className="snapshot-summary"><h3>Current snapshot</h3><pre>{JSON.stringify(snapshot, null, 2)}</pre></div>
        </aside>
      </section>
    </main>
  )
}

function SurfaceBranch({ surface, snapshot }) {
  const children = selectChildSurfaces(surface.id)(snapshot)
  return (
    <article className="surface-branch">
      <div className="surface-record">
        <div>
          <strong>{shortId(surface.id)}</strong>
          <small>parent: {shortId(surface.parentId) ?? 'root'}</small>
        </div>
        <div className="record-actions">
          <button type="button" onClick={() => windowManager.commands.openSurface({ parentSurfaceId: surface.id })}>Open child</button>
          <button type="button" onClick={() => windowManager.commands.closeSurface(surface.id)}>Close surface</button>
        </div>
      </div>
      {children.length ? (
        <div className="surface-children">
          {children.map((child) => <SurfaceBranch key={child.id} surface={child} snapshot={snapshot} />)}
        </div>
      ) : null}
    </article>
  )
}

function shortId(id) {
  return id?.split(':').at(-1).slice(0, 8) ?? null
}
