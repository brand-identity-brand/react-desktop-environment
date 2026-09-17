/* @vitest-environment jsdom */

import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  AppletThemeProvider,
  createAppletTheme,
  DEFAULT_APPLET_THEME,
  resolveAppletTheme,
  useAppletTheme,
  useAppletThemeRoot,
} from './AppletTheme.jsx'

function ThemeProbe() {
  const theme = useAppletTheme()
  const themeRoot = useAppletThemeRoot()
  return <output data-theme={JSON.stringify(theme)} data-theme-root={themeRoot ?? ''} />
}

describe('Applet theme', () => {
  it('provides the complete white theme by default', () => {
    const { container } = render(<ThemeProbe />)
    const theme = JSON.parse(
      container.querySelector('output').dataset.theme,
    )

    expect(theme).toEqual(DEFAULT_APPLET_THEME)
  })

  it('provides a complete explicit theme unchanged', () => {
    const theme = {
      backgroundColor: 'navy',
      fontColor: 'white',
      borderColor: 'blue',
      highlightColor: 'cyan',
      shadowColor: 'black',
    }
    const { container } = render(
      <AppletThemeProvider theme={theme} themeRoot="root/theme">
        <ThemeProbe />
      </AppletThemeProvider>,
    )

    expect(JSON.parse(
      container.querySelector('output').dataset.theme,
    )).toEqual(theme)
    expect(container.querySelector('output').dataset.themeRoot).toBe('root/theme')
  })

  it('rejects partial themes instead of silently filling them', () => {
    expect(() => createAppletTheme({
      backgroundColor: 'white',
      fontColor: 'black',
    })).toThrow('borderColor, highlightColor, shadowColor')
  })

  it('retains consumer material and freezes declarations and reconciled roles', () => {
    const reconcile = vi.fn((identity, scheme) => ({
      ...identity,
      canvas: { background: scheme === 'night' ? 'black' : 'white', ink: 'cyan' },
    }))
    const declaration = createAppletTheme({ ...DEFAULT_APPLET_THEME, owner: { accent: 'cyan' }, reconcile })
    expect(declaration.reconcile).toBe(reconcile)
    expect(Object.isFrozen(declaration.owner)).toBe(true)
    const result = resolveAppletTheme(declaration, 'night')
    expect(result.canvas).toEqual({ background: 'black', ink: 'cyan' })
    expect(Object.isFrozen(result.canvas)).toBe(true)
    expect(reconcile.mock.calls[0][0]).not.toHaveProperty('reconcile')
    expect(Object.isFrozen(reconcile.mock.calls[0][0])).toBe(true)
    expect(resolveAppletTheme(result)).toBe(result)
  })

  it('reconciles standalone providers and publishes exact resolved material', () => {
    const reconcile = vi.fn((identity, scheme) => ({ ...identity, canvasColor: scheme ?? 'default' }))
    const declaration = { ...DEFAULT_APPLET_THEME, reconcile }
    let observed
    function Probe() { observed = useAppletTheme(); return null }
    const view = render(<AppletThemeProvider theme={declaration} scheme="night"><Probe /></AppletThemeProvider>)
    expect(observed.canvasColor).toBe('night')
    const first = observed
    view.rerender(<AppletThemeProvider theme={declaration} scheme="night"><Probe /></AppletThemeProvider>)
    expect(observed).toBe(first)
    expect(reconcile).toHaveBeenCalledOnce()
    view.rerender(<AppletThemeProvider theme={declaration} scheme="day"><Probe /></AppletThemeProvider>)
    expect(observed.canvasColor).toBe('day')
    const result = resolveAppletTheme(declaration, 'night')
    view.rerender(<AppletThemeProvider theme={result}><Probe /></AppletThemeProvider>)
    expect(observed).toBe(result)
  })

  it('rejects invalid declarations and incomplete reconciled material', () => {
    expect(() => resolveAppletTheme(DEFAULT_APPLET_THEME, '')).toThrow('scheme')
    expect(() => createAppletTheme({ ...DEFAULT_APPLET_THEME, reconcile: true })).toThrow('reconcile must be a function')
    expect(() => resolveAppletTheme({ ...DEFAULT_APPLET_THEME, reconcile: () => ({ backgroundColor: 'red' }) }))
      .toThrow('missing')
    expect(() => createAppletTheme({ ...DEFAULT_APPLET_THEME, roles: { value: () => 'red' } }))
      .toThrow('immutable material')
    expect(() => resolveAppletTheme({ ...DEFAULT_APPLET_THEME, reconcile: (identity) => ({ ...identity, reconcile() {} }) }))
      .toThrow('not a reconciler')
  })

})
