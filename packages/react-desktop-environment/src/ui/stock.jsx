import { createElement } from 'react'

export function DesktopWorkspace({ activeWorkspaceId, children }) {
  return createElement(
    'div',
    {
      className: 'desktop-canvas',
      'data-active-workspace-id': activeWorkspaceId,
    },
    children,
  )
}

export function DesktopWindow({
  surface,
  application,
  window,
  controller,
  activeWorkspaceId,
  children,
}) {
  const title = window.title ?? ''
  const hidden =
    window.minimized || window.workspaceId !== activeWorkspaceId

  return createElement(
    'article',
    {
      className: 'desktop-window',
      hidden,
      style: { zIndex: window.zIndex },
      'data-surface-id': surface.id,
      'data-application-id': controller.application.id,
      'data-workspace-id': window.workspaceId,
      onPointerDown: (event) => {
        if (event.target.closest?.('button, a, input, select, textarea')) return
        controller.window.focus()
      },
    },
    createElement(
      'header',
      { className: 'desktop-window-titlebar' },
      createElement(
        'div',
        null,
        title ? createElement('strong', null, title) : null,
        createElement('small', null, surface.id),
      ),
      createElement(
        'div',
        { className: 'desktop-window-actions' },
        createElement(
          'button',
          {
            type: 'button',
            'aria-label': `Minimize ${title || 'window'}`,
            onClick: () => controller.window.update({ minimized: true }),
          },
          'Minimize',
        ),
        createElement(
          'button',
          {
            type: 'button',
            'aria-label': `Close ${title || 'window'}`,
            onClick: controller.window.stop,
          },
          'Close',
        ),
      ),
    ),
    createElement('div', { className: 'desktop-window-content' }, children),
  )
}

export function DesktopHiddenWindow({ surfaceId, window, restore }) {
  return createElement(
    'button',
    { type: 'button', onClick: restore },
    `Restore ${window.title ?? surfaceId}`,
  )
}

export const defaultCompositorConnectors = Object.freeze({
  Workspace: DesktopWorkspace,
  Window: DesktopWindow,
  HiddenWindow: DesktopHiddenWindow,
})
