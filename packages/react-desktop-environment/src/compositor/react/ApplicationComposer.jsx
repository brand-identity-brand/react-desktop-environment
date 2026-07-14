import { createElement } from 'react'
import { useCompositorContext } from './hooks.js'

export function ApplicationComposer({ controller, composeChildren }) {
  const { compositor, connectors } = useCompositorContext()
  const application = controller.application.record
  const window = controller.window.record
  const surface = controller.surface.surface
  const Component = compositor.resolveRegisteredApplication(
    application.registeredApplicationName,
  )

  if (!Component) {
    const error = new Error(
      `Unknown registered application: ${application.registeredApplicationName}`,
    )
    if (!connectors.ApplicationError) throw error
    return createElement(connectors.ApplicationError, { error, application, surface })
  }

  return createElement(Component, {
    applicationId: controller.application.id,
    application,
    surface,
    window,
    controller,
    composeChildren,
  })
}
