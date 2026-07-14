export const ABSTRACTION = `
The compositor gives presentation meaning to applications and surfaces.

It directs application identity, surface relationships, and window state into a
coherent environment. The window manager supplies surface identity and parent
relationships; the compositor decides which registered application each window
presents and which presentation capabilities are available to the interface.

The compositor owns the desktop experience while remaining separate from its
visual appearance. A replaceable interface may use as many or as few compositor
capabilities as it needs. Unused capabilities remove features without
invalidating the compositor.

The compositor is a facilitator. Like a manufacturer assembling independently
sourced parts into a complete system, its greatest value is how it coordinates
the capabilities it receives and makes them meaningful together.
`

export const WHAT_IS_WORKSPACE = `
A workspace is a compositor-owned presentation identity assigned to windows. It
allows an interface to organize windows into visual contexts without changing
surface parentage, application relationships, or application lifecycle.

Applications remain resident when the active workspace changes. Workspace
identity marks which presentation the interface should make visible; it does not
determine whether an application is mounted. CSS, data attributes, or another
presentation mechanism can change visibility while preserving the same
application instances. This creates the effect of a UI server running in the
browser: applications remain available while the interface changes which part
of the resident environment is visible.

When workspace features are unused, every window receives the same default
workspace identity, so the concept has no practical effect.
`

export const SCHEMA = `
applications[applicationId] = {
  registeredApplicationName,
  payload,
}

windows[surfaceId] = {
  applicationId,
  workspaceId,
  zIndex,
  minimized,
  position,
  size,
}
`
const MAIN_API = `
Main API
const compositor = createCompositor({
  windowManager,
  applicationRegistry,
})

compositor.application.run()
compositor.application.stop()
compositor.application.update()

compositor.window.run()
compositor.window.focus()
compositor.window.stop()
compositor.window.update()

compositor.cleanup()
`
export { createCompositor } from './createCompositor.js'
export * from './react/index.js'
