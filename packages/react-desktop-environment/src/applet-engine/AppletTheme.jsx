import React, { createContext, useContext, useMemo } from 'react'

const themeKeys = Object.freeze([
  'backgroundColor',
  'fontColor',
  'borderColor',
  'highlightColor',
  'shadowColor',
])
const validatedThemes = new WeakSet()

export const DEFAULT_APPLET_THEME = Object.freeze({
  backgroundColor: 'white',
  fontColor: 'black',
  borderColor: null,
  highlightColor: 'white',
  shadowColor: 'rgb(117 117 117)',
})
validatedThemes.add(DEFAULT_APPLET_THEME)

export const AppletThemeContext = createContext(DEFAULT_APPLET_THEME)
export const AppletThemeRootContext = createContext(null)

function requireColourValue(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Applet theme ${name} must be a non-empty colour string`)
  }
}

function immutableMaterial(value, name, ancestors = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'object' || ancestors.has(value)) {
    throw new TypeError(`Applet theme ${name} must be immutable material`)
  }
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`Applet theme ${name} must be a plain material object`)
  }
  ancestors.add(value)
  const result = Array.isArray(value) ? [] : {}
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (typeof key !== 'string' || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Applet theme ${name} must use named data properties`)
    }
    Object.defineProperty(result, key, {
      value: immutableMaterial(descriptor.value, `${name}.${key}`, ancestors),
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  ancestors.delete(value)
  return Object.freeze(result)
}

export function createAppletTheme(theme) {
  if (theme == null || typeof theme !== 'object' || Array.isArray(theme)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(theme))) {
    throw new TypeError('Applet theme must be a complete theme object')
  }
  if (validatedThemes.has(theme)) return theme
  const missingKeys = themeKeys.filter((key) => !Object.hasOwn(theme, key))
  if (missingKeys.length > 0) {
    throw new TypeError(`Applet theme is missing: ${missingKeys.join(', ')}`)
  }
  for (const key of themeKeys) {
    if (key !== 'borderColor' || theme[key] !== null) requireColourValue(theme[key], key)
  }
  if (Object.hasOwn(theme, 'reconcile') && typeof theme.reconcile !== 'function') {
    throw new TypeError('Applet theme reconcile must be a function')
  }
  const { reconcile, ...identity } = theme
  const material = immutableMaterial(identity, 'material')
  const result = reconcile ? Object.freeze({ ...material, reconcile }) : material
  validatedThemes.add(result)
  return result
}

export function validateAppletScheme(scheme) {
  if (scheme !== undefined && (typeof scheme !== 'string' || !scheme.trim())) {
    throw new TypeError('Applet scheme must be a non-empty string')
  }
  return scheme
}

export function resolveAppletTheme(theme = DEFAULT_APPLET_THEME, scheme) {
  validateAppletScheme(scheme)
  const declaration = createAppletTheme(theme)
  if (!declaration.reconcile) return declaration
  const { reconcile, ...identity } = declaration
  const result = createAppletTheme(reconcile(Object.freeze(identity), scheme))
  if (result.reconcile) {
    throw new TypeError('Resolved Applet theme must contain material, not a reconciler')
  }
  return result
}

export function AppletThemeProvider({ children, scheme, theme, themeRoot = null }) {
  const value = useMemo(() => resolveAppletTheme(theme ?? DEFAULT_APPLET_THEME, scheme), [theme, scheme])
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
