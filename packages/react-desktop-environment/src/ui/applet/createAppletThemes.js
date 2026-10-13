import { DEFAULT_APPLET_THEME, createAppletTheme, resolveAppletTheme } from './AppletTheme.jsx'

export function resolveAppletThemeRoot(registry, applicationName) {
  const node = registry?.[applicationName]
  if (!node) return null
  return Object.hasOwn(node.Applet.meta, 'theme')
    ? node.applicationName
    : resolveAppletThemeRoot(registry, node.parentApplicationName)
}

/** GUI-owned material cache. The runtime is only a source of definition and occurrence records. */
export default function createAppletThemes(engine, defaultTheme = DEFAULT_APPLET_THEME) {
  const materials = new Map()
  return function themeFor(surface, scheme) {
    const node = engine?.runtime?.resolveApplicationNode?.(surface?.application)
    const declaredRoot = surface?.props?.themeRoot
    const root = declaredRoot === undefined ? resolveAppletThemeRoot(engine?.applicationRegistry, node?.applicationName) : declaredRoot
    const definition = engine?.applicationRegistry?.[root]?.Applet
    const declaration = definition?.meta?.theme ?? defaultTheme
    const key = definition?.meta?.theme ? root : null
    if (!materials.has(key)) materials.set(key, new Map())
    const schemes = materials.get(key)
    if (!schemes.has(scheme)) schemes.set(scheme, createAppletTheme({ ...resolveAppletTheme(declaration, scheme) }))
    return schemes.get(scheme)
  }
}
