import React, { createContext, useContext } from 'react'

const AppletEnvironmentContext = createContext(null)

export default function AppletEnvironment({
  children,
  defaultDesktopEnvironment,
  desktopEnvironment,
}) {
  const inheritedDesktopEnvironment = useContext(AppletEnvironmentContext)
  const resolvedDesktopEnvironment = desktopEnvironment
    ?? inheritedDesktopEnvironment
    ?? defaultDesktopEnvironment

  if (!resolvedDesktopEnvironment) {
    throw new TypeError('AppletEnvironment requires a desktop environment')
  }

  return (
    <AppletEnvironmentContext.Provider value={resolvedDesktopEnvironment}>
      {children}
    </AppletEnvironmentContext.Provider>
  )
}

AppletEnvironment.use = function useAppletEnvironment() {
  const desktopEnvironment = useContext(AppletEnvironmentContext)
  if (!desktopEnvironment) {
    throw new Error('AppletEnvironment.use must be called inside an Applet')
  }
  return desktopEnvironment
}
