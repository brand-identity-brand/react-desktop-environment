/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest'
import * as compositor from '../compositor/index.js'
import * as ui from '../ui/index.js'
import * as windowManager from '../window-manager/index.js'
import AppletEngine from './AppletEngine.jsx'

const desktopEnvironment = Object.freeze({ compositor, ui, windowManager })

function defineApplet(applicationName, applets = {}) {
  function Applet() { return null }
  Applet.meta = Object.freeze({ applicationName })
  Applet.applets = Object.freeze(applets)
  return Applet
}

function defineSettingsOwner(applicationName, applets = {}) {
  const Settings = defineApplet('settings')
  const Applet = defineApplet(applicationName, {
    ...applets,
    settings: Settings,
  })
  Applet.Settings = Settings
  return Applet
}

function defineFixture() {
  const Product = defineSettingsOwner('product')
  const Warehouse = defineSettingsOwner('warehouse', { product: Product })
  const Manual = defineApplet('manual', {
    settings: defineApplet('settings'),
  })
  const Workspaces = defineApplet('workspaces', {
    warehouse: Warehouse,
    manual: Manual,
  })
  const Binder = defineSettingsOwner('binder')
  const Surfaces = defineApplet('surfaces', {
    binder: Binder,
    deck: defineApplet('deck'),
  })
  const Unintended = defineSettingsOwner('unintended')
  const Root = defineApplet('root', {
    workspaces: Workspaces,
    surfaces: Surfaces,
    unintended: Unintended,
  })

  return {
    Binder,
    Root,
    Surfaces,
    Warehouse,
    Workspaces,
  }
}

describe('Settings contributions', () => {
  it('requires Settings to be the exact registered direct settings child', () => {
    const RegisteredSettings = defineApplet('settings')
    const PublishedSettings = defineApplet('settings')
    const Owner = defineApplet('owner', { settings: RegisteredSettings })
    Owner.Settings = PublishedSettings
    const Root = defineApplet('root', { owner: Owner })

    expect(() => AppletEngine.collectApplicationRegistry(Root)).toThrow(
      'Applet root/owner Settings must publish its registered settings child',
    )
  })

  it('discovers only immediate publishers under the intended owner roots', () => {
    const {
      Binder,
      Root,
      Surfaces: SurfaceOwners,
      Warehouse,
      Workspaces: WorkspaceOwners,
    } = defineFixture()
    const registry = AppletEngine.collectApplicationRegistry(Root)
    const registryPaths = Object.keys(registry)
    const contributions = AppletEngine.collectSettingsContributions(
      registry,
      [WorkspaceOwners, SurfaceOwners],
    )

    expect(contributions).toEqual([
      registry['root/workspaces/warehouse/settings'],
      registry['root/surfaces/binder/settings'],
    ])
    expect(contributions.map(({ Applet }) => Applet)).toEqual([
      Warehouse.Settings,
      Binder.Settings,
    ])
    expect(contributions).not.toContain(registry['root/workspaces/warehouse/product/settings'])
    expect(contributions).not.toContain(registry['root/unintended/settings'])
    expect(Object.keys(registry)).toEqual(registryPaths)
    expect(Object.isFrozen(contributions)).toBe(true)
    expect(contributions.every(Object.isFrozen)).toBe(true)
  })

  it('returns definitions without creating Applications or registering duplicates', () => {
    const { Root, Surfaces: SurfaceOwners, Workspaces: WorkspaceOwners } = defineFixture()
    const engine = AppletEngine.create({ applet: Root, desktopEnvironment })
    try {
      const registryPaths = Object.keys(engine.applicationRegistry)
      const beforeApplications = engine.compositor.getSnapshot().applications
      const contributions = AppletEngine.collectSettingsContributions(
        engine.applicationRegistry,
        [WorkspaceOwners, SurfaceOwners],
      )
      expect(contributions).toHaveLength(2)
      expect(contributions.every(({ Applet }) => typeof Applet === 'function')).toBe(true)
      expect(contributions.every((node) => !Object.hasOwn(node, 'settingsApplication'))).toBe(true)
      expect(Object.keys(engine.applicationRegistry)).toEqual(registryPaths)
      expect(engine.compositor.getSnapshot().applications).toBe(beforeApplications)
    } finally {
      engine.compositor.destroy?.()
    }
  })

})
