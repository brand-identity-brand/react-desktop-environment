import { selectChildSurfaces } from '../../window-manager/selectors.js'
import {
  useDesktopEnvironment,
  useDesktopSnapshot,
  useWindowManagerSnapshot,
} from '../DesktopEnvironment.jsx'
import { createDesktopApplicationHost } from '../createApplicationHost.js'

export function Desktop({
  workspaceId = 'main',
  className,
  emptyFallback = null,
}) {
  const managerSnapshot = useWindowManagerSnapshot()
  const desktopSnapshot = useDesktopSnapshot()
  const rootSurfaces = selectChildSurfaces(null)(managerSnapshot)
  const visibleRootSurfaces = rootSurfaces.filter((surface) => {
    const window = desktopSnapshot.windows[surface.id]
    return (
      window?.workspaceId === workspaceId && window.visibility === 'visible'
    )
  })

  return (
    <div className={className} data-workspace-id={workspaceId}>
      {visibleRootSurfaces.map((surface) => (
        <DesktopSurface key={surface.id} surfaceId={surface.id} />
      ))}
      {visibleRootSurfaces.length === 0 ? emptyFallback : null}
    </div>
  )
}

function DesktopSurface({ surfaceId }) {
  const { windowManager, desktopEnvironment, renderApplication } =
    useDesktopEnvironment()
  const managerSnapshot = useWindowManagerSnapshot()
  const desktopSnapshot = useDesktopSnapshot()
  const surface = managerSnapshot.surfaces[surfaceId]
  const window = desktopSnapshot.windows[surfaceId]

  if (!surface || !window || window.visibility === 'hidden') return null

  const application = managerSnapshot.applications[surface.applicationId]
  if (!application) {
    throw new Error(`Surface ${surfaceId} has no application`)
  }

  const childSurfaces = selectChildSurfaces(surface.id)(managerSnapshot)
  const host = createDesktopApplicationHost({
    windowManager,
    desktopEnvironment,
    applicationId: application.id,
    surfaceId: surface.id,
  })
  const renderChildren = () =>
    childSurfaces.map((childSurface) => (
      <DesktopSurface key={childSurface.id} surfaceId={childSurface.id} />
    ))
  const title = window.title ?? application.typeId

  return (
    <article
      className="desktop-window"
      style={{ zIndex: window.order + 1 }}
      data-surface-id={surface.id}
      onPointerDown={(event) => {
        if (event.target.closest?.('button, a, input, select, textarea')) return
        desktopEnvironment.commands.focusWindow(surface.id)
      }}
    >
      <header className="desktop-window-titlebar">
        <div>
          <strong>{title}</strong>
          <small>{surface.id}</small>
        </div>
        <div className="desktop-window-actions">
          <button
            type="button"
            aria-label={`Hide ${title}`}
            onClick={() =>
              desktopEnvironment.commands.setWindowVisibility(
                surface.id,
                'hidden',
              )
            }
          >
            Hide
          </button>
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={() => windowManager.commands.closeSurface(surface.id)}
          >
            Close
          </button>
        </div>
      </header>

      <div className="desktop-window-content">
        {renderApplication({
          application,
          surface,
          window,
          host,
          renderChildren,
        })}
      </div>
    </article>
  )
}
