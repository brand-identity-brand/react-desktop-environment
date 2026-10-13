import React, { createContext, useCallback, useContext, useRef, useState, useSyncExternalStore } from 'react'
import AppletEngine from '../../applet-engine/AppletEngine.jsx'
import { AppletThemeProvider } from '../../applet-engine/AppletTheme.jsx'
import useChildSurfaceComposition from '../../applet-engine/useChildSurfaceComposition.js'
import { constrainPresentationSize, minimumPresentationSize } from '../../applet-engine/presentationSize.js'
import Window from '../Window.jsx'

const HostContext = createContext(null)
const toolbarStyle = { display: 'flex', alignItems: 'center', gap: 4, minHeight: 32 }

function titleFor(engine, surface) {
  return surface.application.props?.title
    ?? engine.runtime.resolveApplicationNode(surface.application)?.Applet.meta.displayName
    ?? surface.application.applicationName
}

function Switches({ engine, composition }) {
  return composition.childSurfaces.map((surface) => (
    <button
      key={surface.surfaceId}
      type="button"
      aria-pressed={composition.selectedSurfaceId === surface.surfaceId}
      onClick={() => composition.selectSurface(surface.surfaceId)}
    >
      {titleFor(engine, surface)}
    </button>
  ))
}

/** Allocation and exposure only; records, selection, and transitions stay in the engine. */
function SurfaceHost({ engine, surface: suppliedSurface, children, root = false, style }) {
  const inheritedHost = useContext(HostContext)
  const body = useRef(null)
  const resize = useRef(null)
  const [resizePreview, setResizePreview] = useState(null)
  const composition = useChildSurfaceComposition({ engine, ownerSurfaceId: suppliedSurface.surfaceId })
  const surface = engine.compositor.surface.read({ surfaceId: suppliedSurface.surfaceId }) ?? suppliedSurface
  const ownerSurfaceId = surface.props?.ownerSurfaceId
  const readOwner = useCallback(() => ownerSurfaceId
    ? engine.compositor.surface.read({ surfaceId: ownerSurfaceId })
    : null, [engine, ownerSurfaceId])
  const owner = useSyncExternalStore(engine.compositor.subscribe, readOwner, readOwner)
  const parent = inheritedHost?.engine === engine && inheritedHost.surface.surfaceId === ownerSurfaceId
    ? inheritedHost
    : null
  const deck = engine.runtime.isDeckSurface({ surfaceId: surface.surfaceId })
  const insideDeck = owner && engine.runtime.isDeckSurface({ surfaceId: owner.surfaceId })
  const selected = owner && engine.runtime.readSelectedChild({
    surfaceId: owner.surfaceId,
    fullscreen: insideDeck ? undefined : true,
  })
  const controls = engine.compositor.surface.readControls({ surfaceId: surface.surfaceId })
  const hidden = surface.hidden || (
    (insideDeck || surface.fullscreen)
    && selected?.surfaceId !== surface.surfaceId
  )
  const theme = engine.runtime.themeFor(surface)
  const host = { engine, surface, body }
  const fill = root || insideDeck || surface.fullscreen
  const title = titleFor(engine, surface)
  const minimum = minimumPresentationSize({ engine, surface })
  const frameSize = constrainPresentationSize(resizePreview ?? surface.size ?? minimum, minimum)

  const toggleFullscreen = () => {
    if (surface.fullscreen) return controls.exitFullscreen()
    const allocation = parent?.body.current
      ?? body.current?.closest('[data-applet-surface]')?.parentElement
    const bounds = allocation?.getBoundingClientRect()
    return controls.fullscreen({
      position: { x: 0, y: 0 },
      ...(bounds?.width > 0 && bounds.height > 0
        ? { size: { width: bounds.width, height: bounds.height } }
        : {}),
    })
  }
  const startResize = (event) => {
    if (event.button !== 0) return
    const bounds = event.currentTarget.closest('.rde-window').getBoundingClientRect()
    resize.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      size: surface.size ?? { width: bounds.width, height: bounds.height },
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.stopPropagation()
  }
  const continueResize = (event) => {
    if (resize.current?.pointerId !== event.pointerId) return
    const requestedSize = {
      width: resize.current.size.width + event.clientX - resize.current.x,
      height: resize.current.size.height + event.clientY - resize.current.y,
    }
    const size = constrainPresentationSize(requestedSize, minimum)
    resize.current.preview = size
    setResizePreview(size)
  }
  const finishResize = (event) => {
    if (resize.current?.pointerId !== event.pointerId) return
    const size = resize.current.preview
    resize.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setResizePreview(null)
    if (event.type !== 'pointercancel' && size) controls.resize({ size })
  }
  const content = (
    <HostContext.Provider value={host}>
      {!deck && composition.childSurfaces.length > 0 && (
        <nav aria-label={`${title} Applets`} style={toolbarStyle}>
          <Switches engine={engine} composition={composition} />
        </nav>
      )}
      <div ref={body} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto' }}>
        {children}
      </div>
    </HostContext.Provider>
  )
  const frameStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    color: theme.fontColor,
    background: theme.backgroundColor,
    ...style,
  }

  if (root || insideDeck) return (
    <section
      data-applet-surface={surface.surfaceId}
      hidden={hidden}
      style={{
        ...frameStyle,
        ...(hidden ? { display: 'none' } : {}),
        ...(root
          ? { position: 'relative', height: '100%', minHeight: 240 }
          : { position: 'absolute', inset: '36px 0 0' }),
      }}
    >
      {content}
    </section>
  )

  return (
    <Window
      surface={surface}
      application={surface.application}
      controls={{ ...controls, focus: controls.activate }}
      hidden={hidden}
      draggable={!fill}
      title={title}
      data-applet-surface={surface.surfaceId}
      actions={<>
        <button type="button" onClick={toggleFullscreen}>
          {surface.fullscreen ? 'Restore' : 'Fullscreen'}
        </button>
        <button type="button" onClick={() => controls.close()}>Close</button>
      </>}
      style={{
        ...frameStyle,
        width: frameSize.width,
        height: frameSize.height,
        ...(surface.fullscreen ? { inset: 0, width: '100%', height: '100%' } : {}),
        ...(hidden ? { display: 'none' } : {}),
      }}
      contentStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 0 }}
    >
      {content}
      {!fill && (
        <button
          type="button"
          aria-label={`Resize ${title}`}
          onPointerDown={startResize}
          onPointerMove={continueResize}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
          style={{ position: 'absolute', bottom: 0, right: 0, touchAction: 'none', cursor: 'nwse-resize' }}
        >↘</button>
      )}
    </Window>
  )
}

export default function AppletSurface({ surface, children, style }) {
  const engine = AppletEngine.use()
  const ThemeProvider = engine.composition.ThemeProvider ?? AppletThemeProvider
  return (
    <ThemeProvider theme={engine.runtime.themeFor(surface)} themeRoot={surface.props?.themeRoot}>
      <SurfaceHost engine={engine} surface={surface} style={style}>{children}</SurfaceHost>
    </ThemeProvider>
  )
}

export function AppletPresentation({ children }) {
  const engine = AppletEngine.use()
  const inherited = useContext(HostContext)
  if (inherited?.engine === engine) return children
  const root = engine.compositor.surface.read({ surfaceId: engine.rootSurfaceId })
  return <SurfaceHost engine={engine} surface={root} root>{children}</SurfaceHost>
}

export function DeckSurface({ engine, surface, composition, menuOpen, onMenuOpenChange }) {
  const selected = composition.selectedSurfaceId
  return (
    <div style={{ ...toolbarStyle, position: 'relative', height: 36 }}>
      <Switches engine={engine} composition={composition} />
      <button type="button" aria-expanded={menuOpen} onClick={() => onMenuOpenChange(!menuOpen)}>
        Deck menu
      </button>
      {menuOpen && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1, background: 'white', border: '1px solid', padding: 4 }}>
          <button type="button" disabled={!selected} onClick={() => {
            onMenuOpenChange(false)
            engine.compositor.surface.readControls({ surfaceId: selected }).close()
          }}>Close selected Applet</button>
          <button type="button" onClick={() => engine.compositor.surface.readControls({ surfaceId: surface.surfaceId }).close()}>
            Close Deck
          </button>
        </div>
      )}
    </div>
  )
}
