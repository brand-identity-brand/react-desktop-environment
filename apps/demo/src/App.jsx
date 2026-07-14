import { lazy, Suspense } from 'react'

const WindowManagerDemo = lazy(() =>
  import('./demos/window-manager/WindowManagerDemo.jsx').then((module) => ({
    default: module.WindowManagerDemo,
  })),
)

const CompositorDemo = lazy(() =>
  import('./demos/compositor/CompositorDemo.jsx').then(
    (module) => ({ default: module.CompositorDemo }),
  ),
)

const normalizePath = (path) => path.replace(/\/+$/, '') || '/'

export default function App() {
  const path = normalizePath(window.location.pathname)

  if (path === '/window-manager') {
    return (
      <Suspense fallback={<DemoLoading />}>
        <WindowManagerDemo />
      </Suspense>
    )
  }

  if (path === '/compositor') {
    return (
      <Suspense fallback={<DemoLoading />}>
        <CompositorDemo />
      </Suspense>
    )
  }

  return <DemoDirectory unknownPath={path === '/' ? null : path} />
}

function DemoLoading() {
  return <main className="demo-layout">Loading demo…</main>
}

function DemoDirectory({ unknownPath }) {
  return (
    <main className="demo-layout directory-layout">
      <header className="directory-header">
        <p className="eyebrow">Component directory</p>
        <h1>React Desktop Environment</h1>
        <p className="lede">
          Open an isolated demo for either the headless relationship manager or
          its desktop implementation.
        </p>
      </header>

      {unknownPath ? (
        <p className="route-notice">No demo exists at {unknownPath}.</p>
      ) : null}

      <nav className="demo-directory" aria-label="Demo directory">
        <a className="demo-directory-card" href="/window-manager">
          <span className="eyebrow">Headless external state</span>
          <strong>Window manager</strong>
          <p>
            Inspect applications, surfaces, parent relationships, commands, and
            callback events without a desktop presentation.
          </p>
          <span className="directory-link">Open demo →</span>
        </a>

        <a className="demo-directory-card" href="/compositor">
          <span className="eyebrow">Manager director</span>
          <strong>Compositor</strong>
          <p>
            See manager relationships, desktop state, applications, and a
            replaceable interface coordinated into one experience.
          </p>
          <span className="directory-link">Open demo →</span>
        </a>
      </nav>
    </main>
  )
}
