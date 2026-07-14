export const ABSTRACTION = `
The compositor gives presentation meaning to windows and applications.

It owns surfaces: independently identified compositions that link one logical
window to one application and add presentation-specific state. Each surface
provides both explicit relationship identities and the currently resolved
window and application objects.

The compositor facilitates these independent systems without changing their
records. It remains separate from visual appearance; registered surface and
application components determine how a consumer presents the composition.
`

export const WHAT_IS_WORKSPACE = `
A workspace is a compositor-owned presentation identity assigned to surfaces.
It changes which resident surfaces an interface makes visible without changing
window parentage, application relationships, or application lifecycle.

When workspace features are unused, every surface receives the same default
workspace identity, so the concept has no practical effect.
`

export const SCHEMA = `
applications[applicationId] = {
  applicationId,
  applicationName,
  props,
}

surfaces[surfaceId] = {
  surfaceId,
  windowId,
  window,
  applicationId,
  application,
  surfaceComponentName,
  workspaceId,
  zIndex,
  hidden,
  position,
  size,
  props,
}
`

export const MAIN_API = `
const compositor = createCompositor({
  windowManager,
  applicationRegistry,
  surfaceComponentRegistry,
})

compositor.application.create()
compositor.application.add()
compositor.application.read()
compositor.application.update()
compositor.application.remove()

compositor.surface.create()
compositor.surface.add()
compositor.surface.read()
compositor.surface.readChildren()
compositor.surface.update()
compositor.surface.remove()

compositor.cleanup()
`

export { default as createCompositor } from './createCompositor.js'
export { default as SurfaceComposer } from './react/SurfaceComposer.jsx'
