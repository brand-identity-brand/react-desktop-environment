import { useSyncExternalStore } from 'react'
import { createWindowManager } from 'react-desktop-environment/window-manager'

const windowManager = createWindowManager()

const addWindow = (parentWindowId = null) =>
  windowManager.window.add({
    window: windowManager.window.create({ parentWindowId }),
  })

export function WindowManagerDemo() {
  const snapshot = useSyncExternalStore(
    windowManager.subscribe,
    windowManager.getSnapshot,
    windowManager.getSnapshot,
  )
  const rootWindows = windowManager.window.readChildren({ windowId: null })

  return (
    <main className="demo-layout">
      <a className="back-link" href="/">← Demo directory</a>
      <header className="demo-header">
        <div>
          <p className="eyebrow">Headless relationship engine</p>
          <h1>Window manager</h1>
          <p className="lede">
            The manager owns logical window identity, parent relationships, and
            lifecycle. It knows nothing about applications or presentation.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={() => addWindow()}>
          Add root window
        </button>
      </header>

      <section className="manager-grid">
        <section className="relationship-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Relationship table</p><h2>Window tree</h2></div>
            <span>{Object.keys(snapshot.windows).length} windows</span>
          </div>
          <div className="surface-tree">
            {rootWindows.map((window) => (
              <WindowBranch key={window.windowId} window={window} />
            ))}
            {rootWindows.length === 0 ? (
              <div className="empty-state">Add a window to begin a relationship tree.</div>
            ) : null}
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading"><h2>Manager snapshot</h2></div>
          <div className="snapshot-summary"><pre>{JSON.stringify(snapshot, null, 2)}</pre></div>
        </aside>
      </section>
    </main>
  )
}

function WindowBranch({ window }) {
  const children = windowManager.window.readChildren({ windowId: window.windowId })
  return (
    <article className="surface-branch">
      <div className="surface-record">
        <div>
          <strong>{shortId(window.windowId)}</strong>
          <small>parent: {shortId(window.parentWindowId) ?? 'root'}</small>
        </div>
        <div className="record-actions">
          <button type="button" onClick={() => addWindow(window.windowId)}>Add child</button>
          <button
            type="button"
            onClick={() => windowManager.window.remove({ windowId: window.windowId })}
          >
            Remove window
          </button>
        </div>
      </div>
      {children.length ? (
        <div className="surface-children">
          {children.map((child) => (
            <WindowBranch key={child.windowId} window={child} />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function shortId(id) {
  return id?.split(':').at(-1).slice(0, 8) ?? null
}
