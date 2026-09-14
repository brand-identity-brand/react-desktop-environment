import React, { createContext, useContext, useMemo } from 'react'

const themeKeys = Object.freeze([
  'backgroundColor',
  'fontColor',
  'borderColor',
  'highlightColor',
  'shadowColor',
])

export const DEFAULT_APPLET_THEME = Object.freeze({
  backgroundColor: 'white',
  fontColor: 'black',
  borderColor: null,
  highlightColor: 'white',
  shadowColor: 'rgb(117 117 117)',
})

export const AppletThemeContext = createContext(DEFAULT_APPLET_THEME)
export const AppletThemeRootContext = createContext(null)

function requireColourValue(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Applet theme ${name} must be a non-empty colour string`)
  }
  return value
}

export function createAppletTheme(theme) {
  if (theme == null || typeof theme !== 'object' || Array.isArray(theme)) {
    throw new TypeError('Applet theme must be a complete theme object')
  }

  const missingKeys = themeKeys.filter((key) => !(key in theme))
  if (missingKeys.length > 0) {
    throw new TypeError(
      `Applet theme is missing: ${missingKeys.join(', ')}`,
    )
  }

  const borderColor = theme.borderColor
  if (borderColor !== null) requireColourValue(borderColor, 'borderColor')

  return Object.freeze({
    backgroundColor: requireColourValue(
      theme.backgroundColor,
      'backgroundColor',
    ),
    fontColor: requireColourValue(theme.fontColor, 'fontColor'),
    borderColor,
    highlightColor: requireColourValue(
      theme.highlightColor,
      'highlightColor',
    ),
    shadowColor: requireColourValue(theme.shadowColor, 'shadowColor'),
  })
}

export function AppletThemeProvider({ children, theme, themeRoot = null }) {
  const value = useMemo(() => (
    theme != null
      ? createAppletTheme(theme)
      : DEFAULT_APPLET_THEME
  ), [theme])

  return (
    <AppletThemeContext.Provider value={value}>
      <AppletThemeRootContext.Provider value={themeRoot}>
        {children}
      </AppletThemeRootContext.Provider>
    </AppletThemeContext.Provider>
  )
}

export function useAppletTheme() {
  return useContext(AppletThemeContext)
}

export function useAppletThemeRoot() {
  return useContext(AppletThemeRootContext)
}
