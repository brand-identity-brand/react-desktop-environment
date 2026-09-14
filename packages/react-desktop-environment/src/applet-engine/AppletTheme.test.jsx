/* @vitest-environment jsdom */

import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  AppletThemeProvider,
  createAppletTheme,
  DEFAULT_APPLET_THEME,
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

})
