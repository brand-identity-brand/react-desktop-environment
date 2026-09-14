import React from 'react'
import AppletEngine from './AppletEngine.jsx'
import AppletEnvironment from './AppletEnvironment.jsx'

export const appletEngineApi = Object.freeze([
  'Applet',
  'Runtime',
  'Application',
  'collectApplicationRegistry',
  'collectSettingsContributions',
  'create',
  'resolveRootApplet',
  'use',
  'useApplication',
  'useOptional',
  'useOwnership',
  'useRootApplet',
  'useState',
])

export default function createAppletEngine(Applet, { composition } = {}) {
  function OwnerAppletEngine({
    applet = Applet,
    desktopEnvironment,
    ...props
  }) {
    return (
      <AppletEnvironment
        defaultDesktopEnvironment={applet.desktopEnvironment}
        desktopEnvironment={desktopEnvironment}
      >
        <AppletEngine {...props} applet={applet} composition={composition} />
      </AppletEnvironment>
    )
  }

  OwnerAppletEngine.Applet = Applet
  OwnerAppletEngine.Runtime = AppletEngine
  OwnerAppletEngine.Application = AppletEngine.Application
  OwnerAppletEngine.collectApplicationRegistry = (...args) => (
    AppletEngine.collectApplicationRegistry(...args)
  )
  OwnerAppletEngine.collectSettingsContributions = (...args) => (
    AppletEngine.collectSettingsContributions(...args)
  )
  OwnerAppletEngine.create = (options) => AppletEngine.create({ composition, ...options })
  OwnerAppletEngine.resolveRootApplet = (RootApplet, fallbackApplet = Applet) => (
    AppletEngine.resolveRootApplet(RootApplet, fallbackApplet, composition?.rootDefaults)
  )
  OwnerAppletEngine.use = () => AppletEngine.use()
  OwnerAppletEngine.useApplication = () => AppletEngine.useApplication()
  OwnerAppletEngine.useOptional = () => AppletEngine.useOptional()
  OwnerAppletEngine.useOwnership = () => AppletEngine.useOwnership()
  OwnerAppletEngine.useRootApplet = (RootApplet) => (
    AppletEngine.useRootApplet(RootApplet, Applet, composition?.rootDefaults)
  )
  OwnerAppletEngine.useState = (...args) => AppletEngine.useState(...args)

  return OwnerAppletEngine
}
