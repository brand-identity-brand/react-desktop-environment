import React, { useRef, useState } from 'react'

const DEFAULT_POSITION = Object.freeze({ x: 0, y: 0 })
const DEFAULT_SIZE = Object.freeze({ width: 360, height: 240 })
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea'

export default function Window({
  surface,
  window,
  application,
  controls,
  hidden = surface?.hidden ?? false,
  title = application?.props?.title ??
    application?.props?.label ??
    application?.applicationName ??
    'Window',
  children,
  className,
  style,
  onPointerDown,
  ...props
}) {
  const drag = useRef(null)
  const [previewPosition, setPreviewPosition] = useState(null)
  const position = previewPosition ?? surface?.position ?? DEFAULT_POSITION
  const size = surface?.size ?? DEFAULT_SIZE

  const startDragging = (event) => {
    if (event.button !== 0 || event.target.closest?.(INTERACTIVE_SELECTOR)) return
    drag.current = {
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      position,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const continueDragging = (event) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const nextPosition = {
      x: drag.current.position.x + event.clientX - drag.current.origin.x,
      y: drag.current.position.y + event.clientY - drag.current.origin.y,
    }
    drag.current.nextPosition = nextPosition
    setPreviewPosition(nextPosition)
  }

  const stopDragging = (event) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const nextPosition = drag.current.nextPosition ?? drag.current.position
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setPreviewPosition(null)
    controls?.move?.({ position: nextPosition })
  }

  const focusWindow = (event) => {
    if (event.target.closest?.('.rde-window') !== event.currentTarget) return
    onPointerDown?.(event)
    if (!event.defaultPrevented && !event.target.closest?.(INTERACTIVE_SELECTOR)) {
      controls?.focus?.()
    }
  }

  return (
    <section
      {...props}
      className={['rde-window', className].filter(Boolean).join(' ')}
      hidden={hidden}
      onPointerDown={focusWindow}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        minHeight: size.height,
        overflow: 'visible',
        border: '2px solid #29352c',
        borderRadius: '0.65rem',
        color: '#182019',
        background: '#ffffff',
        boxShadow: '0 16px 36px rgba(24, 32, 25, 0.22)',
        zIndex: surface?.zIndex,
        ...style,
      }}
    >
      <header
        className="rde-window__titlebar"
        onPointerDown={startDragging}
        onPointerMove={continueDragging}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.55rem 0.7rem',
          borderBottom: '1px solid #cbd3c8',
          background: '#edf1e9',
          cursor: drag.current ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <strong>{title}</strong>
        <span
          className="rde-window__actions"
          style={{ display: 'flex', gap: '0.4rem' }}
        >
          <button type="button" onClick={() => controls?.hide?.()}>
            Hide
          </button>
          <button type="button" onClick={() => controls?.close?.()}>
            Close
          </button>
        </span>
      </header>

      <div
        className="rde-window__content"
        style={{ position: 'relative', padding: '0.85rem' }}
      >
        {children}
      </div>
    </section>
  )
}
