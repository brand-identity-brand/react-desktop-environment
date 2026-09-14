import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import AppletEnvironment from './AppletEnvironment.jsx'
import Deck from './Deck.jsx'
import {
  AppletApplicationContext,
  AppletStateStoreContext,
  createAppletStateStore,
  immutableJson,
  useAppletState,
  validateSurfaceState,
} from './AppletState.js'
import {
  AppletThemeProvider,
  DEFAULT_APPLET_THEME,
} from './AppletTheme.jsx'
import presentedSurface from './presentedSurface.js'

const AppletEngineContext = createContext(null)
const AppletEngineOwnershipContext = createContext(false)
let localEngineSequence = 0

const applicationNamePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
function freezeRecord(entries) {
  const record = Object.create(null)
  for (const [key, value] of entries) record[key] = value
  return Object.freeze(record)
}

function cloneJson(value, label) {
  return immutableJson(value, label)
}

function omitUndefinedRuntimeState(value, label) {
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      if (entry === undefined) {
        throw new TypeError(`${label}.${index} must be a JSON value`)
      }
      return omitUndefinedRuntimeState(entry, `${label}.${index}`)
    })
  }
  if (value === null || typeof value !== 'object') return value
  const record = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${label}.${String(key)} must use a data property`)
    }
    if (descriptor.value === undefined) continue
    record[key] = omitUndefinedRuntimeState(
      descriptor.value,
      `${label}.${String(key)}`,
    )
  }
  return record
}

function snapshotSurface(surface, { selectedChildSurfaceId } = {}) {
  const record = Object.create(null)
  for (const key of Reflect.ownKeys(surface)) {
    if (
      key === 'application'
      || key === 'applicationId'
      || key === 'window'
      || key === 'windowId'
    ) continue
    const descriptor = Object.getOwnPropertyDescriptor(surface, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Surface ${surface.surfaceId} must use data properties`)
    }
    if (descriptor.value === undefined) continue
    if (key === 'selectedChildSurfaceId' && selectedChildSurfaceId !== undefined) {
      record[key] = selectedChildSurfaceId
    } else {
      record[key] = omitUndefinedRuntimeState(
        descriptor.value,
        `Surface ${surface.surfaceId}.${String(key)}`,
      )
    }
  }
  return cloneJson(record, `Surface ${surface.surfaceId}`)
}

function orderSurfaces(surfaces, rootSurfaceId) {
  return surfaces.toSorted((first, second) => {
    if (first.surfaceId === rootSurfaceId) return -1
    if (second.surfaceId === rootSurfaceId) return 1
    return first.surfaceId.localeCompare(second.surfaceId)
  })
}

function requireApplicationSegment(value, label) {
  if (typeof value !== 'string' || !applicationNamePattern.test(value)) {
    throw new TypeError(
      `${label} must be a lowercase kebab-case application name segment`,
    )
  }
  return value
}

function createRuntimeIdFactory() {
  const engineSequence = ++localEngineSequence
  let recordSequence = 0

  return (kind = 'record') => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      try {
        return `${kind}:${globalThis.crypto.randomUUID()}`
      } catch {
        // Some browsers expose randomUUID but reject it outside a secure origin.
      }
    }

    recordSequence += 1
    return `${kind}:applet-${engineSequence}-${recordSequence}`
  }
}

function collectApplicationRegistry(rootApplet) {
  const applicationRegistry = Object.create(null)
  const ancestors = new Set()

  const visit = (Applet, localName, parentPath = null) => {
    if (typeof Applet !== 'function') {
      throw new TypeError(`Invalid Applet definition: ${localName}`)
    }
    requireApplicationSegment(localName, 'Applet registry key')
    const metadataName = requireApplicationSegment(
      Applet.meta?.applicationName,
      `Applet ${localName} meta.applicationName`,
    )
    if (metadataName !== localName) {
      throw new Error(
        `Applet registry key ${localName} does not match meta.applicationName ${metadataName}`,
      )
    }
    const applicationName = parentPath
      ? `${parentPath}/${localName}`
      : localName
    if (ancestors.has(Applet)) {
      throw new Error(`Cyclic Applet definition: ${applicationName}`)
    }
    if (Object.hasOwn(applicationRegistry, applicationName)) {
      throw new Error(`Duplicate Applet definition: ${applicationName}`)
    }

    const childApplets = Applet.applets ?? {}
    if (
      typeof childApplets !== 'object'
      || childApplets === null
      || Array.isArray(childApplets)
      || ![
        null,
        Object.prototype,
      ].includes(Object.getPrototypeOf(childApplets))
    ) {
      throw new TypeError(
        `Applet ${applicationName} applets must be a plain object`,
      )
    }
    const children = Object.entries(childApplets).map(
      ([childLocalName, ChildApplet]) => {
        requireApplicationSegment(
          childLocalName,
          `Applet ${applicationName} child registry key`,
        )
        if (typeof ChildApplet !== 'function') {
          throw new TypeError(
            `Invalid Applet definition: ${applicationName}/${childLocalName}`,
          )
        }
        const childMetadataName = requireApplicationSegment(
          ChildApplet.meta?.applicationName,
          `Applet ${applicationName}/${childLocalName} meta.applicationName`,
        )
        if (childMetadataName !== childLocalName) {
          throw new Error(
            `Applet registry key ${childLocalName} does not match meta.applicationName ${childMetadataName}`,
          )
        }
        return [childLocalName, `${applicationName}/${childLocalName}`]
      },
    )
    const settingsApplet = Applet.Settings
    if (
      settingsApplet !== undefined
      && (
        typeof settingsApplet !== 'function'
        || childApplets.settings !== settingsApplet
      )
    ) {
      throw new Error(
        `Applet ${applicationName} Settings must publish its registered settings child`,
      )
    }
    applicationRegistry[applicationName] = {
      Applet,
      applicationName,
      children: freezeRecord(children),
      localName,
      parentApplicationName: parentPath,
      path: applicationName,
      settingsApplicationName: settingsApplet
        ? `${applicationName}/settings`
        : null,
      themeRoot: Object.hasOwn(Applet.meta, 'theme')
        ? applicationName
        : applicationRegistry[parentPath]?.themeRoot ?? null,
    }
    ancestors.add(Applet)
    for (const [childLocalName, ChildApplet] of Object.entries(childApplets)) {
      visit(ChildApplet, childLocalName, applicationName)
    }
    ancestors.delete(Applet)
  }

  const rootApplicationName = rootApplet?.meta?.applicationName
  if (!rootApplicationName) {
    throw new Error('The root Applet requires meta.applicationName')
  }
  visit(rootApplet, rootApplicationName)
  visit(Deck, 'deck')

  const recipesByWorkspace = new Map()
  const resolveRecipePath = (owner, value, label) => {
    if (typeof value !== 'string' || !value.length) {
      throw new TypeError(`${label} must be a relative Applet registry path`)
    }
    for (const segment of value.split('/')) {
      requireApplicationSegment(segment, label)
    }
    const path = `${owner.applicationName}/${value}`
    if (!applicationRegistry[path]) {
      throw new Error(`Unknown recipe Applet: ${path}`)
    }
    return path
  }
  for (const owner of Object.values(applicationRegistry)) {
    const recipes = owner.Applet.recipes ?? []
    if (!Array.isArray(recipes)) {
      throw new TypeError(`Applet ${owner.applicationName} recipes must be an array`)
    }
    for (const source of recipes) {
      if (
        source === null
        || typeof source !== 'object'
        || Array.isArray(source)
        || ![Object.prototype, null].includes(Object.getPrototypeOf(source))
        || !Object.isFrozen(source)
      ) {
        throw new TypeError(`Applet ${owner.applicationName} recipes must be frozen plain objects`)
      }
      const recipe = cloneJson(source, `Applet ${owner.applicationName} recipe`)
      const name = requireApplicationSegment(recipe.name, 'Recipe name')
      if (recipe.addable !== undefined && typeof recipe.addable !== 'boolean') {
        throw new TypeError(`Recipe ${name} addable must be a boolean`)
      }
      const workspace = recipe.workspace === undefined
        ? owner.applicationName
        : resolveRecipePath(owner, recipe.workspace, 'Recipe workspace')
      const hasResidents = Object.hasOwn(recipe, 'residents')
      const hasSettings = Object.hasOwn(recipe, 'settingsOf')
      if (hasResidents === hasSettings) {
        throw new TypeError(`Recipe ${name} requires either residents or settingsOf`)
      }
      if (!Array.isArray(hasResidents ? recipe.residents : recipe.settingsOf)) {
        throw new TypeError(`Recipe ${name} ${hasResidents ? 'residents' : 'settingsOf'} must be an array`)
      }
      const residents = hasResidents
        ? recipe.residents.map((resident) => {
            if (
              resident === null
              || typeof resident !== 'object'
              || Array.isArray(resident)
            ) throw new TypeError(`Recipe ${name} residents must be plain objects`)
            if (
              resident.state !== undefined
              && (
                resident.state === null
                || typeof resident.state !== 'object'
                || Array.isArray(resident.state)
              )
            ) throw new TypeError(`Recipe ${name} resident state must be a plain object`)
            return {
              applet: resolveRecipePath(owner, resident.applet, `Recipe ${name} resident`),
              ...(resident.state === undefined ? {} : { state: resident.state }),
            }
          })
        : collectSettingsContributions(applicationRegistry, recipe.settingsOf.map(
            (container) => resolveRecipePath(owner, container, `Recipe ${name} settingsOf`),
          )).map(({ applicationName }) => ({ applet: applicationName }))
      if (new Set(residents.map(({ applet }) => applet)).size !== residents.length) {
        throw new Error(`Recipe ${name} must name each resident once`)
      }
      const workspaceRecipes = recipesByWorkspace.get(workspace) ?? []
      if (workspaceRecipes.some(({ recipe }) => recipe.name === name)) {
        throw new Error(`Duplicate recipe ${name} for Workspace ${workspace}`)
      }
      workspaceRecipes.push({
        owner: owner.applicationName,
        recipe: cloneJson({ name, residents, ...(recipe.addable === undefined ? {} : { addable: recipe.addable }) }, `Recipe ${name}`),
      })
      recipesByWorkspace.set(workspace, workspaceRecipes)
    }
  }
  for (const node of Object.values(applicationRegistry)) {
    node.recipes = Object.freeze((recipesByWorkspace.get(node.applicationName) ?? [])
      .sort((first, second) => second.owner.split('/').length - first.owner.split('/').length)
      .map(({ recipe }) => recipe))
    Object.freeze(node)
  }
  return Object.freeze(applicationRegistry)
}

function resolveRegistryNode(applicationRegistry, nodeOrApplicationName) {
  if (typeof nodeOrApplicationName === 'function') {
    return Object.values(applicationRegistry).find(
      ({ Applet }) => Applet === nodeOrApplicationName,
    )
  }
  const applicationName = typeof nodeOrApplicationName === 'string'
    ? nodeOrApplicationName
    : nodeOrApplicationName?.applicationName
      ?? nodeOrApplicationName?.meta?.applicationName
      ?? nodeOrApplicationName?.path
  return typeof applicationName === 'string'
    ? applicationRegistry[applicationName]
    : undefined
}

function collectSettingsContributions(applicationRegistry, ownerNodes) {
  if (!Array.isArray(ownerNodes)) {
    throw new TypeError('Settings contribution owners must be an array')
  }
  const contributions = []
  const settingsApplicationNames = new Set()

  for (const ownerNode of ownerNodes) {
    const containerNode = resolveRegistryNode(applicationRegistry, ownerNode)
    if (!containerNode) {
      throw new Error('Unknown Settings contribution owner')
    }
    for (const applicationName of Object.values(containerNode.children)) {
      const publisherNode = applicationRegistry[applicationName]
      const settingsApplicationName = publisherNode?.settingsApplicationName
      if (
        !settingsApplicationName
        || settingsApplicationNames.has(settingsApplicationName)
      ) continue
      const settingsNode = applicationRegistry[settingsApplicationName]
      if (!settingsNode) {
        throw new Error(
          `Missing registered Settings contribution: ${settingsApplicationName}`,
        )
      }
      settingsApplicationNames.add(settingsApplicationName)
      contributions.push(settingsNode)
    }
  }

  return Object.freeze(contributions)
}

function resolveRootApplet(rootApplet, fallbackApplet, defaults = {}) {
  const resolvedRootApplet = rootApplet ?? fallbackApplet
  if (typeof resolvedRootApplet !== 'function') {
    throw new TypeError('RootApplet must be an Applet function')
  }
  const missing = Object.entries(defaults).filter(([key]) => resolvedRootApplet[key] === undefined)
  if (!missing.length) return resolvedRootApplet
  function RootAppletAdapter(props) {
    const RootApplet = resolvedRootApplet
    return <RootApplet {...props} />
  }
  Object.assign(RootAppletAdapter, resolvedRootApplet, Object.fromEntries(missing))
  return RootAppletAdapter
}

function PassThrough({ children }) {
  return children
}

function ReferenceSurface({ children, surface }) {
  const engine = useContext(AppletEngineContext)
  const themeRoot = surface.props?.themeRoot !== undefined
    ? surface.props.themeRoot
    : engine.runtime.resolveApplicationNode(surface.application)?.themeRoot ?? null
  return (
    <AppletThemeProvider theme={engine.runtime.themeFor(surface)} themeRoot={themeRoot}>
      {children}
    </AppletThemeProvider>
  )
}

function constrainPresentationSize(size, minimumSize) {
  if (!size) return null
  const width = Math.max(size.width, minimumSize.width)
  const height = Math.max(size.height, minimumSize.height)
  return width === size.width && height === size.height ? size : { width, height }
}

function constructAppletRuntime({
  applet,
  adoption,
  composition = {},
  desktopEnvironment,
  options = {},
  resetRootApplet,
  rootApplet,
}) {
  const createWindowManager = desktopEnvironment?.windowManager
    ?.createWindowManager
  const createCompositor = desktopEnvironment?.compositor?.createCompositor
  const Window = desktopEnvironment?.ui?.Window

  if (typeof createWindowManager !== 'function') {
    throw new TypeError('The desktop environment requires createWindowManager')
  }
  if (typeof createCompositor !== 'function') {
    throw new TypeError('The desktop environment requires createCompositor')
  }
  if (
    options.beforeResetRootApplet !== undefined
    && typeof options.beforeResetRootApplet !== 'function'
  ) {
    throw new TypeError('options.beforeResetRootApplet must be a function')
  }

  const RootApplet = resolveRootApplet(rootApplet, applet, composition.rootDefaults)
  if (Object.hasOwn(options, 'applicationRegistry')) {
    throw new Error(
      'options.applicationRegistry is not supported; register children through Applet.applets',
    )
  }
  const applicationRegistry = collectApplicationRegistry(applet)
  const hasCheckpoint = (value) => value != null
    && (!Array.isArray(value) || value.length > 0)
  const readSurfaceStateOption = (surfaceState) => hasCheckpoint(surfaceState)
    ? validateSurfaceState(surfaceState, { applicationRegistry })
    : null
  const initialSurfaceState = readSurfaceStateOption(options.initialState)
  const cleanSurfaceState = readSurfaceStateOption(options.cleanState)
  const rawSurfaceState = [initialSurfaceState, cleanSurfaceState]
    .filter(Array.isArray)
    .flat()
  const reservedIds = adoption?.reservedIds ?? new Set(rawSurfaceState.flatMap((entry) => [
    entry.surfaceId,
    entry.application.applicationId,
    entry.window.windowId,
  ]))
  const suppliedCreateId = adoption?.createId ?? options.createId ?? createRuntimeIdFactory()
  const defaultIds = adoption?.defaultIds ?? new Map()
  const defaultSequences = new Map()
  const createId = (kind) => {
    let id
    do id = suppliedCreateId(kind)
    while (reservedIds.has(id))
    reservedIds.add(id)
    return id
  }
  const defaultId = (target, kind) => {
    const sequence = defaultSequences.get(target) ?? 0
    defaultSequences.set(target, sequence + 1)
    const key = `${target}:${sequence}:${kind}`
    if (!defaultIds.has(key)) defaultIds.set(key, createId(kind))
    return defaultIds.get(key)
  }
  const baselineInput = Object.hasOwn(options, 'cleanState')
    ? cleanSurfaceState
    : initialSurfaceState
  const localOnly = Object.hasOwn(options, 'cleanState')
    && cleanSurfaceState === null && initialSurfaceState !== null
  let cleanEntries = null
  const cleanNamedCandidates = new Map((baselineInput ?? []).map((entry) => [
    entry.application.applicationId, entry.appletState,
  ]))
  const fieldSupplies = new Map()
  const ownerKey = (supply) => {
    if (!supply || Object.keys(supply).length !== 1
      || !(supply.applicationId || supply.surfaceId)) {
      throw new TypeError('Supply requires exactly one Application or Surface identity')
    }
    const key = supply.applicationId ? 'applicationId' : 'surfaceId'
    if (typeof supply[key] !== 'string' || !supply[key].length) {
      throw new TypeError('Supply requires a nonempty owner identity')
    }
    return `${key}:${supply[key]}`
  }
  const equalValue = (first, second) => JSON.stringify(first) === JSON.stringify(second)
  const readField = (record, field) => field.split('.').reduce(
    (value, key) => value?.[key], record,
  )
  const replaceField = (record, field, value) => {
    const [key, ...rest] = field.split('.')
    return {
      ...record,
      [key]: rest.length ? replaceField(record?.[key], rest.join('.'), value) : value,
    }
  }
  const updateCleanEntry = (surfaceId, update) => {
    if (cleanEntries === null) return
    cleanEntries = cleanEntries.map((entry) => entry.surfaceId === surfaceId
      ? cloneJson(update(entry), 'Clean Surface state') : entry)
  }
  const eligibleField = (surfaceId, field, current, supply, missing = current == null) => {
    const key = `${surfaceId}:${field}`
    if (!supply) {
      fieldSupplies.delete(key)
      return true
    }
    const owner = ownerKey(supply)
    const previous = fieldSupplies.get(key)
    return missing || (previous?.owner === owner && equalValue(previous.value, current))
  }
  const suppliedField = (surfaceId, field, value, supply) => {
    if (!supply) return
    fieldSupplies.set(`${surfaceId}:${field}`, {
      owner: ownerKey(supply), supply: Object.freeze({ ...supply }), value,
    })
    updateCleanEntry(surfaceId, (entry) => replaceField(entry, field, value))
  }
  const rootApplicationName = applet.meta?.applicationName
  const restoredRootEntry = initialSurfaceState?.find((entry) => (
    entry.application.root === true
    && entry.application.applicationName === rootApplicationName
    && entry.window.parentWindowId === null
  ))
  const restoredSurfaceState = restoredRootEntry ? initialSurfaceState : null
  const windowManagerOptions = options.windowManager ?? {}
  const compositorOptions = options.compositor ?? {}

  const applicationComponentRegistry = freezeRecord(
    Object.values(applicationRegistry).map((node) => [
      node.applicationName,
      node.Applet,
    ]),
  )
  const surfaceComponentRegistry = Object.freeze({
    ...(Window ? { window: Window } : {}),
    reference: composition.ReferenceSurface ?? ReferenceSurface,
    ...(options.surfaceComponentRegistry ?? {}),
  })
  const defaultSurfaceComponentName = options.defaultSurfaceComponentName
    ?? 'window'
  if (!surfaceComponentRegistry[defaultSurfaceComponentName]) {
    throw new Error(
      `Unknown default Surface component: ${defaultSurfaceComponentName}`,
    )
  }

  const windowManager = createWindowManager({
    ...windowManagerOptions,
    createId: windowManagerOptions.createId ?? createId,
    ...(restoredSurfaceState ? {
      initialSnapshot: {
        windows: Object.fromEntries(restoredSurfaceState.map(({ window }) => [
          window.windowId,
          window,
        ])),
      },
    } : {}),
  })
  let applicationCleanupDirty = false
  let activeWorkspaceSurfaceId = restoredSurfaceState?.find(
    ({ activeWorkspace }) => activeWorkspace === true,
  )?.surfaceId ?? null
  let checkpointCoordinator
  let compositor
  const checkpointListeners = new Set()
  let cachedSurfaceState = null
  let checkpointNotificationScheduled = false
  const notifyCheckpoint = () => {
    cachedSurfaceState = null
    if (checkpointNotificationScheduled) return
    checkpointNotificationScheduled = true
    queueMicrotask(() => {
      checkpointNotificationScheduled = false
      checkpointListeners.forEach((listener) => listener())
    })
  }
  const suppliedConfigureSurfaceControls = compositorOptions
    .configureSurfaceControls
  compositor = createCompositor({
    ...compositorOptions,
    applicationRegistry: applicationComponentRegistry,
    createId: compositorOptions.createId ?? createId,
    defaultSurfaceComponentName,
    retainUnreferencedApplications:
      compositorOptions.retainUnreferencedApplications ?? true,
    surfaceComponentRegistry,
    windowManager,
    configureSurfaceControls({ controls, surfaceId }) {
      const activate = () => {
        const current = compositor.surface.read({ surfaceId })
        if (!current) throw new Error(`Unknown Surface: ${surfaceId}`)
        const parentWindowId = current.window?.parentWindowId
        const parentSurface = Object.values(
          compositor.getSnapshot().surfaces,
        ).find(({ windowId }) => windowId === parentWindowId)
        if (!parentSurface) return controls.show()
        fieldSupplies.delete(`${parentSurface.surfaceId}:selectedChildSurfaceId`)
        return compositor.surface.activateChild({
          childSurfaceId: surfaceId,
          surfaceId: parentSurface.surfaceId,
        })
      }
      const reparent = (parentSurfaceId) => {
        const current = compositor.surface.read({ surfaceId })
        const parent = compositor.surface.read({ surfaceId: parentSurfaceId })
        if (!current) throw new Error(`Unknown Surface: ${surfaceId}`)
        if (!parent) throw new Error(`Unknown parent Surface: ${parentSurfaceId}`)
        windowManager.window.move({
          parentWindowId: parent.windowId,
          windowId: current.windowId,
        })
        compositor.surface.update({
          surfaceId,
          props: {
            ...current.props,
            ownerSurfaceId: parentSurfaceId,
          },
        })
        return compositor.surface.read({ surfaceId })
      }
      const fullscreen = (geometry) => {
        const current = compositor.surface.read({ surfaceId })
        if (
          activeWorkspaceSurfaceId
          && activeWorkspaceSurfaceId !== current?.props?.ownerSurfaceId
        ) {
          reparent(activeWorkspaceSurfaceId)
        }
        controls.fullscreen(geometry)
        const fullscreenSurface = compositor.surface.read({ surfaceId })
        const ownerSurfaceId = fullscreenSurface?.props?.ownerSurfaceId
        if (!ownerSurfaceId) return fullscreenSurface
        fieldSupplies.delete(`${ownerSurfaceId}:selectedChildSurfaceId`)
        return compositor.surface.activateChild({
          childSurfaceId: surfaceId,
          surfaceId: ownerSurfaceId,
        })
      }
      const resize = (geometry, { supply } = {}) => {
        const current = compositor.surface.read({ surfaceId })
        const fields = ['size', 'position'].filter((field) => (
          geometry?.[field] !== undefined
          && eligibleField(surfaceId, field, current?.[field], supply)
        ))
        if (!fields.length) return current
        const result = controls.resize({
          position: current.position,
          size: current.size,
          ...Object.fromEntries(fields.map((field) => [field, geometry[field]])),
        })
        const resized = compositor.surface.read({ surfaceId })
        for (const field of fields) suppliedField(surfaceId, field, resized[field], supply)
        notifyCheckpoint()
        return result
      }
      const selectChild = (...args) => {
        fieldSupplies.delete(`${surfaceId}:selectedChildSurfaceId`)
        return controls.selectChild(...args)
      }
      const move = (...args) => {
        fieldSupplies.delete(`${surfaceId}:position`)
        return controls.move(...args)
      }
      const extendedControls = Object.freeze({
        ...controls,
        activate,
        fullscreen,
        reparent,
        resize,
        selectChild,
        move,
      })
      return {
        activate,
        close() {
          applicationCleanupDirty = true
          const result = controls.close()
          collectUnreferencedApplications()
          return result
        },
        fullscreen,
        reparent,
        focus: controls.focus,
        hide: controls.hide,
        show: controls.show,
        move,
        resize,
        exitFullscreen: controls.exitFullscreen,
        selectChild,
        ...(suppliedConfigureSurfaceControls?.({
          controls: extendedControls,
          surfaceId,
        }) ?? {}),
      }
    },
  })
  const mutableApplicationInstances = Object.create(null)
  let rootWindow
  let rootApplication
  let rootSurface
  const restoredApplicationState = Object.create(null)
  const restoredApplicationMetadata = new Map()

  if (restoredSurfaceState) {
    for (const entry of restoredSurfaceState) {
      const record = entry.application
      if (restoredApplicationMetadata.has(record.applicationId)) continue
      restoredApplicationMetadata.set(record.applicationId, record)
      restoredApplicationState[record.applicationId] = entry.appletState
    }
    for (const [applicationName] of Object.entries(applicationRegistry)) {
      const saved = [...restoredApplicationMetadata.values()].find((record) => (
        record.permanent === true
        && record.applicationName === applicationName
      ))
      const application = compositor.application.add({
        application: compositor.application.create({
          applicationId: saved?.applicationId ?? defaultId(`application:${applicationName}`, 'application'),
          applicationName,
          ...(applicationName === rootApplicationName
            ? { props: options.rootApplicationProps }
            : {}),
        }),
      })
      mutableApplicationInstances[applicationName] = application
    }
    for (const record of restoredApplicationMetadata.values()) {
      if (record.permanent === true) continue
      compositor.application.add({
        application: compositor.application.create({
          applicationId: record.applicationId,
          applicationName: record.applicationName,
        }),
      })
    }
    rootWindow = windowManager.window.read({
      windowId: restoredRootEntry.window.windowId,
    })
    rootApplication = mutableApplicationInstances[rootApplicationName]
    if (!rootWindow || rootApplication?.applicationName !== rootApplicationName) {
      throw new Error('Restored workspace root does not match this Applet')
    }
    for (const entry of restoredSurfaceState) {
      const {
        activeWorkspace: _activeWorkspace,
        appletState: _appletState,
        application,
        window,
        ...surfaceState
      } = entry
      const restoredSurface = compositor.surface.add({
        surface: compositor.surface.create({
          ...surfaceState,
          applicationId: application.applicationId,
          selectedChildSurfaceId: null,
          windowId: window.windowId,
        }),
      })
      if (
        surfaceState.attentionRevision !== undefined
        || surfaceState.restoreGeometry !== undefined
      ) {
        compositor.surface.update({
          surfaceId: restoredSurface.surfaceId,
          ...(surfaceState.attentionRevision === undefined ? {} : {
            attentionRevision: surfaceState.attentionRevision,
          }),
          ...(surfaceState.restoreGeometry === undefined ? {} : {
            restoreGeometry: surfaceState.restoreGeometry,
          }),
        })
      }
    }
    for (const entry of restoredSurfaceState) {
      if (entry.selectedChildSurfaceId == null) continue
      const parent = compositor.surface.read({ surfaceId: entry.surfaceId })
      const child = compositor.surface.read({
        surfaceId: entry.selectedChildSurfaceId,
      })
      if (parent && child?.window?.parentWindowId === parent.windowId) {
        compositor.surface.selectChild({
          childSurfaceId: child.surfaceId,
          surfaceId: parent.surfaceId,
        })
      }
    }
    rootSurface = compositor.surface.read({
      surfaceId: restoredRootEntry.surfaceId,
    })
    if (
      !rootSurface
      || rootSurface.windowId !== rootWindow.windowId
      || rootSurface.applicationId !== rootApplication.applicationId
    ) {
      throw new Error('Restored workspace root Surface is invalid')
    }
  } else {
    rootWindow = windowManager.window.add({
      window: windowManager.window.create({
        ...options.rootWindow,
        windowId: options.rootWindow?.windowId ?? defaultId('root-window', 'window'),
      }),
    })
    rootApplication = compositor.application.add({
      application: compositor.application.create({
        applicationId: defaultId(`application:${rootApplicationName}`, 'application'),
        applicationName: rootApplicationName,
        props: options.rootApplicationProps,
      }),
    })
    rootSurface = compositor.surface.add({
      surface: compositor.surface.create({
        surfaceId: defaultId('root-surface', 'surface'),
        applicationId: rootApplication.applicationId,
        props: { themeRoot: rootApplicationName },
        surfaceComponentName: defaultSurfaceComponentName,
        windowId: rootWindow.windowId,
        workspaceId: options.rootWorkspaceId ?? rootApplicationName,
      }),
    })
    mutableApplicationInstances[rootApplicationName] = rootApplication
    for (const applicationName of Object.keys(applicationRegistry)) {
      if (applicationName === rootApplicationName) continue
      mutableApplicationInstances[applicationName] = compositor.application.add({
        application: compositor.application.create({
          applicationId: defaultId(`application:${applicationName}`, 'application'),
          applicationName,
        }),
      })
    }
  }
  const applicationInstances = Object.freeze(mutableApplicationInstances)
  const appletState = createAppletStateStore({
    applications: compositor.getSnapshot().applications,
    initialState: restoredApplicationState,
    getCleanState: (applicationId) => cleanEntries === null
      ? undefined : cleanNamedCandidates.get(applicationId) ?? {},
    onCleanStateChange({ applicationId, state }) {
      if (cleanEntries === null) return
      cleanEntries = cleanEntries.map((entry) => entry.application.applicationId === applicationId
        ? cloneJson({ ...entry, appletState: state }, 'Clean Surface state') : entry)
      notifyCheckpoint()
    },
  })
  appletState.subscribeCheckpoint(notifyCheckpoint)
  const permanentApplicationIds = new Set(
    Object.values(applicationInstances).map(({ applicationId }) => applicationId),
  )
  const dynamicApplicationIds = new Set(
    Object.keys(compositor.getSnapshot().applications).filter(
      (applicationId) => !permanentApplicationIds.has(applicationId),
    ),
  )
  const transientApplicationIds = new Set()
  const retainedApplicationIds = new Set()
  const childApplicationIds = new Map()
  const parentApplicationIds = new Map()
  const connectApplicationChildren = (parentApplication, childApplications) => {
    const children = new Map()
    for (const [localName, childApplication] of Object.entries(
      childApplications,
    )) {
      children.set(localName, childApplication.applicationId)
      parentApplicationIds.set(
        childApplication.applicationId,
        parentApplication.applicationId,
      )
    }
    childApplicationIds.set(parentApplication.applicationId, children)
  }
  for (const [applicationName, node] of Object.entries(applicationRegistry)) {
    const parentApplication = applicationInstances[applicationName]
    connectApplicationChildren(parentApplication, Object.fromEntries(
      Object.entries(node.children).map(([localName, childApplicationName]) => [
        localName,
        applicationInstances[childApplicationName],
      ]),
    ))
  }
  const createApplicationBranch = (applicationName, {
    props,
    savedState,
    transient = false,
    supplyTarget,
  } = {}) => {
    const node = applicationRegistry[applicationName]
    if (!node) throw new Error(`Unknown Applet application: ${applicationName}`)
    const application = compositor.application.add({
      application: compositor.application.create({
        applicationName,
        props,
        ...(supplyTarget ? { applicationId: defaultId(supplyTarget, 'application') } : {}),
      }),
    })
    dynamicApplicationIds.add(application.applicationId)
    if (transient) transientApplicationIds.add(application.applicationId)
    appletState.addApplication(application, {
      savedState,
      ...(supplyTarget && savedState ? { supply: { applicationId: application.applicationId } } : {}),
    })
    if (supplyTarget && savedState) cleanNamedCandidates.set(application.applicationId, savedState)
    connectApplicationChildren(application, Object.fromEntries(
      Object.entries(node.children).map(([localName, childApplicationName]) => [
        localName,
        createApplicationBranch(childApplicationName, {
          transient,
          ...(supplyTarget ? { supplyTarget: `${supplyTarget}/${localName}` } : {}),
        }),
      ]),
    ))
    return application
  }
  if (restoredSurfaceState) {
    const connectRestoredBranch = (application, ancestors = new Set()) => {
      if (ancestors.has(application.applicationId)) return
      const node = applicationRegistry[application.applicationName]
      if (!node) return
      const nextAncestors = new Set(ancestors).add(application.applicationId)
      const childApplications = Object.fromEntries(
        Object.entries(node.children).map(([localName, applicationName]) => {
          const saved = [...restoredApplicationMetadata.values()].find(
            (record) => (
              record.parentApplicationId === application.applicationId
              && record.localName === localName
              && record.applicationName === applicationName
            ),
          )
          const child = saved
            ? compositor.application.read({ applicationId: saved.applicationId })
            : createApplicationBranch(applicationName)
          if (saved) connectRestoredBranch(child, nextAncestors)
          return [localName, child]
        }),
      )
      connectApplicationChildren(application, childApplications)
    }
    for (const applicationId of dynamicApplicationIds) {
      const metadata = restoredApplicationMetadata.get(applicationId)
      if (
        metadata?.parentApplicationId
        && dynamicApplicationIds.has(metadata.parentApplicationId)
      ) continue
      const application = compositor.application.read({ applicationId })
      if (application) connectRestoredBranch(application)
    }
  }
  const anchorSurfaces = new Map()
  let reconcileResidence = () => {}
  const shakeApplications = () => {
    const reachable = new Set([
      ...permanentApplicationIds,
      ...retainedApplicationIds,
      ...Object.values(compositor.getSnapshot().surfaces).map(
        ({ applicationId }) => applicationId,
      ),
    ])
    const pending = [...reachable]
    while (pending.length) {
      const applicationId = pending.pop()
      const related = [
        ...(childApplicationIds.get(applicationId)?.values() ?? []),
        parentApplicationIds.get(applicationId),
      ]
      for (const relatedApplicationId of related) {
        if (!relatedApplicationId || reachable.has(relatedApplicationId)) continue
        reachable.add(relatedApplicationId)
        pending.push(relatedApplicationId)
      }
    }

    const removedApplicationIds = [...dynamicApplicationIds].filter(
      (applicationId) => !reachable.has(applicationId),
    )
    for (const applicationId of removedApplicationIds) {
      compositor.application.remove({ applicationId })
      appletState.removeApplication({ applicationId })
      dynamicApplicationIds.delete(applicationId)
      transientApplicationIds.delete(applicationId)
      retainedApplicationIds.delete(applicationId)
      childApplicationIds.delete(applicationId)
      parentApplicationIds.delete(applicationId)
    }
    if (removedApplicationIds.length) {
      const removed = new Set(removedApplicationIds)
      for (const children of childApplicationIds.values()) {
        for (const [localName, applicationId] of children) {
          if (removed.has(applicationId)) children.delete(localName)
        }
      }
      notifyCheckpoint()
    }
    return Object.freeze(removedApplicationIds)
  }
  const collectUnreferencedApplications = () => {
    if (!applicationCleanupDirty) return Object.freeze([])
    applicationCleanupDirty = false
    return shakeApplications()
  }
  if (restoredSurfaceState) {
    applicationCleanupDirty = true
    collectUnreferencedApplications()
  }
  const resolveApplicationNode = (applicationOrName) => (
    resolveRegistryNode(applicationRegistry, applicationOrName)
  )
  const surfaceThemeRoot = (surface) => (
    surface?.props?.themeRoot !== undefined
      ? surface.props.themeRoot
      : resolveApplicationNode(surface?.application)?.themeRoot ?? null
  )
  const supplyOccurrence = (surfaceId, supply) => {
    ownerKey(supply)
    const surface = compositor.surface.read({ surfaceId })
    for (const field of ['position', 'size', 'selectedChildSurfaceId', 'fullscreen', 'props.order']) {
      const value = readField(surface, field)
      if (value != null) suppliedField(surfaceId, field, value, supply)
    }
    if (cleanEntries === null) return
    cachedSurfaceState = null
    const entry = readSurfaceState().find((candidate) => candidate.surfaceId === surfaceId)
    if (!entry) return
    if (!cleanNamedCandidates.has(entry.application.applicationId)) {
      cleanNamedCandidates.set(entry.application.applicationId, entry.appletState)
    }
    cleanEntries = [
      ...cleanEntries.filter((candidate) => candidate.surfaceId !== surfaceId), entry,
    ]
  }
  const runtime = Object.freeze({
    activeWorkspaceSurface() {
      return activeWorkspaceSurfaceId
        ? compositor.surface.read({ surfaceId: activeWorkspaceSurfaceId })
          ?? null
        : null
    },
    activateWorkspaceSurface({ surfaceId, supply }) {
      const surface = compositor.surface.read({ surfaceId })
      if (!surface) throw new Error(`Unknown Workspace Surface: ${surfaceId}`)
      if (!eligibleField(rootSurface.surfaceId, 'activeWorkspace', activeWorkspaceSurfaceId,
        supply, !compositor.surface.read({ surfaceId: activeWorkspaceSurfaceId }))) return surface
      activeWorkspaceSurfaceId = surfaceId
      if (supply) {
        fieldSupplies.set(`${rootSurface.surfaceId}:activeWorkspace`, {
          owner: ownerKey(supply), supply: Object.freeze({ ...supply }), value: surfaceId,
        })
        if (cleanEntries !== null) cleanEntries = cleanEntries.map((entry) => {
          const { activeWorkspace: _activeWorkspace, ...state } = entry
          return cloneJson({ ...state, ...(entry.surfaceId === surfaceId ? { activeWorkspace: true } : {}) }, 'Clean Surface state')
        })
      }
      notifyCheckpoint()
      return surface
    },
    selectChild({ surfaceId, childSurfaceId, supply }) {
      const surface = compositor.surface.read({ surfaceId })
      const selected = compositor.surface.read({ surfaceId: surface?.selectedChildSurfaceId })
      if (!eligibleField(surfaceId, 'selectedChildSurfaceId', surface?.selectedChildSurfaceId,
        supply, !selected || selected.window.parentWindowId !== surface.windowId)) return surface
      const result = compositor.surface.selectChild({ surfaceId, childSurfaceId })
      suppliedField(surfaceId, 'selectedChildSurfaceId', childSurfaceId, supply)
      notifyCheckpoint()
      return result
    },
    selectionSupply({ surfaceId }) {
      const current = compositor.surface.read({ surfaceId })?.selectedChildSurfaceId
      const supplied = fieldSupplies.get(`${surfaceId}:selectedChildSurfaceId`)
      return supplied && supplied.value === current ? supplied.supply : undefined
    },
    applicationForNode(nodeOrApplicationName) {
      const node = resolveApplicationNode(nodeOrApplicationName)
      return node ? applicationInstances[node.applicationName] : undefined
    },
    childApplication(parentApplication, localName) {
      if (!parentApplication?.applicationId) {
        throw new TypeError('childApplication requires a parent application')
      }
      requireApplicationSegment(localName, 'Child application localName')
      const parentNode = resolveApplicationNode(parentApplication)
      if (!parentNode) {
        throw new Error(
          `Unknown registered application: ${parentApplication.applicationName}`,
        )
      }
      const childApplicationName = parentNode.children[localName]
      if (!childApplicationName) {
        throw new Error(
          `Unknown child application ${localName} of ${parentNode.applicationName}`,
        )
      }
      const childApplicationId = childApplicationIds
        .get(parentApplication.applicationId)
        ?.get(localName)
      if (!childApplicationId) {
        throw new Error(
          `Missing child application ${localName} of ${parentApplication.applicationId}`,
        )
      }
      return compositor.application.read({ applicationId: childApplicationId })
    },
    createApplicationInstance({
      applicationId,
      applicationName,
      cloneState = false,
      props,
      transient = false,
    } = {}) {
      const source = applicationId
        ? compositor.application.read({ applicationId })
        : null
      const application = createApplicationBranch(
        applicationName ?? source?.applicationName,
        {
          props,
          savedState: source && cloneState
            ? appletState.snapshot(source.applicationId)
            : undefined,
          transient,
        },
      )
      retainedApplicationIds.add(application.applicationId)
      notifyCheckpoint()
      return application
    },
    retainApplicationInstance({ applicationId }) {
      if (!dynamicApplicationIds.has(applicationId)) {
        throw new Error(`Unknown dynamic Application: ${applicationId}`)
      }
      const pending = [applicationId]
      while (pending.length) {
        const currentApplicationId = pending.pop()
        transientApplicationIds.delete(currentApplicationId)
        pending.push(...(
          childApplicationIds.get(currentApplicationId)?.values() ?? []
        ))
      }
      notifyCheckpoint()
      return compositor.application.read({ applicationId })
    },
    ensureAnchorSurface({
      applicationId,
      key,
      workspaceId,
    }) {
      const existing = anchorSurfaces.get(key) ?? Object.values(
        compositor.getSnapshot().surfaces,
      ).find((surface) => (
        surface.applicationId === applicationId
        && surface.workspaceId === workspaceId
        && surface.window?.parentWindowId === null
        && surface.surfaceId !== rootSurface.surfaceId
      ))
      if (existing && compositor.surface.read({
        surfaceId: existing.surfaceId,
      })) {
        anchorSurfaces.set(key, existing)
        reconcileResidence()
        return compositor.surface.read({ surfaceId: existing.surfaceId })
      }

      const window = windowManager.window.add({
        window: windowManager.window.create({
          windowId: defaultId(`anchor:${key}`, 'window'), parentWindowId: null,
        }),
      })
      const surface = compositor.surface.add({
        surface: compositor.surface.create({
          surfaceId: defaultId(`anchor:${key}`, 'surface'),
          applicationId,
          props: {
            themeRoot: resolveApplicationNode(compositor.application.read({
              applicationId,
            }))?.themeRoot ?? null,
          },
          surfaceComponentName: 'reference',
          windowId: window.windowId,
          workspaceId,
        }),
      })
      anchorSurfaces.set(key, surface)
      supplyOccurrence(surface.surfaceId, { applicationId: rootApplication.applicationId })
      reconcileResidence()
      notifyCheckpoint()
      return compositor.surface.read({ surfaceId: surface.surfaceId })
    },
    createReferenceSurface({
      applicationId,
      hidden = false,
      ownerSurfaceId,
      position,
      size,
      surfaceProps,
      supply,
      themeRoot,
      workspaceId,
    }) {
      if (supply) ownerKey(supply)
      const ownerSurface = compositor.surface.read({
        surfaceId: ownerSurfaceId,
      })
      if (!ownerSurface) {
        throw new Error(`Unknown reference-surface owner: ${ownerSurfaceId}`)
      }
      const applicationNode = resolveApplicationNode(compositor.application.read({
        applicationId,
      }))
      const referenceThemeRoot = Object.hasOwn(applicationNode.Applet.meta, 'theme')
        ? applicationNode.applicationName
        : themeRoot !== undefined ? themeRoot : surfaceThemeRoot(ownerSurface)
      const supplyTarget = supply
        ? `${ownerKey(supply)}:reference:${applicationId}` : null
      const window = windowManager.window.add({
        window: windowManager.window.create({
          ...(supplyTarget ? { windowId: defaultId(supplyTarget, 'window') } : {}),
          parentWindowId: ownerSurface.windowId,
        }),
      })
      try {
        const surface = compositor.surface.add({
          surface: compositor.surface.create({
            ...(supplyTarget ? { surfaceId: defaultId(supplyTarget, 'surface') } : {}),
            applicationId,
            hidden,
            position,
            props: {
              ...surfaceProps,
              ownerSurfaceId,
              themeRoot: referenceThemeRoot,
            },
            size,
            surfaceComponentName: 'reference',
            windowId: window.windowId,
            workspaceId: workspaceId ?? ownerSurface.workspaceId,
          }),
        })
        retainedApplicationIds.delete(applicationId)
        if (supply) supplyOccurrence(surface.surfaceId, supply)
        reconcileResidence()
        return compositor.surface.read({ surfaceId: surface.surfaceId })
      } catch (error) {
        windowManager.window.remove({ windowId: window.windowId })
        throw error
      }
    },
    resolveApplicationNode,
    themeFor(surface) {
      return applicationRegistry[surfaceThemeRoot(surface)]?.Applet.meta.theme
        ?? DEFAULT_APPLET_THEME
    },

  })

  const restoredResidence = new Set((restoredSurfaceState ?? []).map(({ surfaceId }) => surfaceId))
  let reconcilingResidence = false
  reconcileResidence = () => {
    if (reconcilingResidence) return
    reconcilingResidence = true
    try {
      const pending = Object.keys(compositor.getSnapshot().surfaces)
      const visited = new Set()
      while (pending.length) {
        const containerSurfaceId = pending.shift()
        if (visited.has(containerSurfaceId)) continue
        visited.add(containerSurfaceId)
        const container = compositor.surface.read({ surfaceId: containerSurfaceId })
        if (!container) continue
        const node = applicationRegistry[container.application.applicationName]
        const deck = node.Applet === Deck
        const recipeResidents = deck && Array.isArray(container.props?.recipe?.residents)
          ? container.props.recipe.residents
          : null
        if (deck && recipeResidents === null) continue
        const requests = deck
          ? recipeResidents.filter((resident) => applicationRegistry[resident.applet])
            .map((resident, order) => ({
              applicationName: resident.applet,
              key: resident.applet,
              order,
              savedState: resident.state,
              surfaceProps: {},
            }))
          : node.recipes.map((recipe, order) => ({
              applicationName: 'deck',
              key: recipe.name,
              order,
              surfaceProps: { recipe, addable: recipe.addable ?? false, unmountable: false },
            }))
        if (!deck && !requests.length) continue
        const desiredKeys = new Set(requests.map(({ key }) => key))
        for (const resident of Object.values(compositor.getSnapshot().surfaces)) {
          if (
            resident.props?.resident?.containerSurfaceId !== containerSurfaceId
            || desiredKeys.has(resident.props.resident.key)
          ) continue
          compositor.surface.readControls({ surfaceId: resident.surfaceId }).close()
        }
        for (const request of requests) {
          if (!compositor.surface.read({ surfaceId: containerSurfaceId })) break
          const resident = Object.values(compositor.getSnapshot().surfaces).find(
            ({ props }) => props?.resident?.containerSurfaceId === containerSurfaceId
              && props.resident.key === request.key,
          )
          if (resident) {
            const supply = { surfaceId: containerSurfaceId }
            const adoptingOrder = restoredResidence.delete(resident.surfaceId)
            const suppliesOrder = adoptingOrder || eligibleField(
              resident.surfaceId, 'props.order', resident.props.order, supply,
            )
            if (resident.props.order !== request.order && suppliesOrder) {
              compositor.surface.update({
                surfaceId: resident.surfaceId,
                props: { ...resident.props, order: request.order },
              })
              suppliedField(resident.surfaceId, 'props.order', request.order, supply)
            } else if (adoptingOrder) {
              suppliedField(resident.surfaceId, 'props.order', request.order, supply)
            }
            continue
          }
          const application = createApplicationBranch(request.applicationName, {
            savedState: request.savedState,
            supplyTarget: `resident:${containerSurfaceId}:${request.key}`,
          })
          const supplied = runtime.createReferenceSurface({
            applicationId: application.applicationId,
            ownerSurfaceId: containerSurfaceId,
            supply: { surfaceId: containerSurfaceId },
            surfaceProps: {
              ...request.surfaceProps,
              resident: { containerSurfaceId, key: request.key },
              order: request.order,
            },
          })
          if (!deck) {
            compositor.surface.update({ surfaceId: supplied.surfaceId, fullscreen: true })
            suppliedField(supplied.surfaceId, 'fullscreen', true, { surfaceId: containerSurfaceId })
          }
          const selectedId = compositor.surface.read({ surfaceId: containerSurfaceId })
            ?.selectedChildSurfaceId
          const selected = selectedId
            ? compositor.surface.read({ surfaceId: selectedId })
            : null
          if (!selected) {
            runtime.selectChild({
              surfaceId: containerSurfaceId,
              childSurfaceId: supplied.surfaceId,
              supply: { surfaceId: containerSurfaceId },
            })
          }
          pending.push(supplied.surfaceId)
        }
      }
    } finally {
      reconcilingResidence = false
    }
  }
  reconcileResidence()

  if (restoredSurfaceState) {
    const sizingEngine = { compositor, runtime }
    for (const saved of restoredSurfaceState) {
      if (!saved.size || saved.fullscreen || saved.surfaceComponentName !== 'reference') continue
      const surface = compositor.surface.read({ surfaceId: saved.surfaceId })
      if (!surface) continue
      const presented = presentedSurface({ engine: sizingEngine, surface })
      const definition = resolveApplicationNode(presented.application)?.Applet
      const size = constrainPresentationSize(saved.size,
        definition?.meta.minimumSize ?? { width: 240, height: 180 })
      if (size && !equalValue(surface.size, size)) {
        compositor.surface.update({ surfaceId: surface.surfaceId, size })
      }
    }
  }

  const checkpointCaptures = new WeakMap()
  const readSurfaceState = () => {
    if (cachedSurfaceState) return cachedSurfaceState
    collectUnreferencedApplications()
    const compositorSnapshot = compositor.getSnapshot()
    const excludedApplicationIds = new Set(transientApplicationIds)
    const excludedWindowIds = new Set(
      Object.values(compositorSnapshot.surfaces)
        .filter(({ applicationId }) => excludedApplicationIds.has(applicationId))
        .map(({ windowId }) => windowId),
    )
    let foundExcludedWindow = true
    while (foundExcludedWindow) {
      foundExcludedWindow = false
      for (const window of Object.values(windowManager.getSnapshot().windows)) {
        if (
          excludedWindowIds.has(window.windowId)
          || !excludedWindowIds.has(window.parentWindowId)
        ) continue
        excludedWindowIds.add(window.windowId)
        foundExcludedWindow = true
      }
    }
    const windowSnapshot = windowManager.getSnapshot().windows
    const includedSurfaces = Object.values(compositorSnapshot.surfaces).filter(
      ({ windowId }) => !excludedWindowIds.has(windowId),
    )
    const includedSurfaceIds = new Set(
      includedSurfaces.map(({ surfaceId }) => surfaceId),
    )
    const includedApplicationIds = new Set(
      includedSurfaces.map(({ applicationId }) => applicationId),
    )
    const orderedSurfaces = orderSurfaces(includedSurfaces, rootSurface.surfaceId)
    cachedSurfaceState = validateSurfaceState(orderedSurfaces.map((surface) => {
      const application = compositorSnapshot.applications[surface.applicationId]
      const window = windowSnapshot[surface.windowId]
      const parentApplicationId = parentApplicationIds.get(
        application.applicationId,
      )
      const localName = parentApplicationId
        ? [...(childApplicationIds.get(parentApplicationId) ?? [])].find(
            ([, applicationId]) => applicationId === application.applicationId,
          )?.[0]
        : undefined
      const selectedChildSurfaceId = surface.selectedChildSurfaceId == null
        ? null
        : includedSurfaceIds.has(surface.selectedChildSurfaceId)
          ? surface.selectedChildSurfaceId
          : null
      return {
        ...snapshotSurface(surface, { selectedChildSurfaceId }),
        ...(surface.surfaceId === activeWorkspaceSurfaceId
          ? { activeWorkspace: true }
          : {}),
        application: {
          applicationId: application.applicationId,
          applicationName: application.applicationName,
          ...(permanentApplicationIds.has(application.applicationId)
            ? { permanent: true }
            : {}),
          ...(application.applicationId === rootApplication.applicationId
            ? { root: true }
            : {}),
          ...(parentApplicationId && localName
            && includedApplicationIds.has(parentApplicationId)
            ? { localName, parentApplicationId }
            : {}),
        },
        appletState: appletState.snapshot(application.applicationId),
        window: cloneJson(window, `Window ${window.windowId}`),
      }
    }), { applicationRegistry })
    return cachedSurfaceState
  }
  if (adoption) {
    adoption.receiveNamedCandidates(cleanNamedCandidates)
    adoption.receiveRootSurfaceId(rootSurface.surfaceId)
    const adopted = readSurfaceState()
    compositor.destroy()
    return adopted
  }
  let cleanRootSurfaceId = rootSurface.surfaceId
  if (!localOnly) {
    if (baselineInput !== null) {
      const cleanOptions = { ...options, initialState: baselineInput }
      delete cleanOptions.cleanState
      cleanEntries = constructAppletRuntime({
        applet,
        composition,
        desktopEnvironment,
        options: cleanOptions,
        rootApplet,
        adoption: {
          createId: suppliedCreateId,
          defaultIds,
          reservedIds,
          receiveRootSurfaceId(surfaceId) {
            cleanRootSurfaceId = surfaceId
          },
          receiveNamedCandidates(candidates) {
            for (const [id, state] of candidates) cleanNamedCandidates.set(id, state)
          },
        },
      })
    } else {
      cleanEntries = readSurfaceState()
    }
  }
  const cleanStateJson = () => cleanEntries === null ? null : JSON.stringify(
    orderSurfaces(validateSurfaceState(cleanEntries, { applicationRegistry }), cleanRootSurfaceId),
  )
  checkpointCoordinator = Object.freeze({
    capture() {
      const snapshot = readSurfaceState()
      const capture = Object.freeze({ snapshot })
      checkpointCaptures.set(capture, snapshot)
      return capture
    },
    getSnapshot: readSurfaceState,
    isDirty() {
      return cleanEntries === null
        || JSON.stringify(readSurfaceState()) !== cleanStateJson()
    },
    markClean(capture) {
      const captured = checkpointCaptures.get(capture)
      if (!captured) throw new Error('Unknown Surface state capture')
      cleanEntries = captured
      cleanRootSurfaceId = rootSurface.surfaceId
      cleanNamedCandidates.clear()
      for (const entry of captured) {
        cleanNamedCandidates.set(entry.application.applicationId, entry.appletState)
      }
      appletState.replaceCleanState(Object.fromEntries(cleanNamedCandidates))
      notifyCheckpoint()
      return capture.snapshot
    },
    matches(snapshot) {
      const validated = validateSurfaceState(snapshot, {
        applicationRegistry,
      })
      return JSON.stringify(readSurfaceState()) === JSON.stringify(validated)
    },
    release(capture) {
      if (!checkpointCaptures.has(capture)) return false
      checkpointCaptures.delete(capture)
      return true
    },
    ...(typeof resetRootApplet === 'function'
      ? {
          reset: () => resetRootApplet({
            beforeResetRootApplet: options.beforeResetRootApplet,
          }),
        }
      : {}),
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('Surface state listener must be a function')
      }
      checkpointListeners.add(listener)
      return () => checkpointListeners.delete(listener)
    },

  })

  let previousSurfaceIds = new Set(
    Object.keys(compositor.getSnapshot().surfaces),
  )
  let previousSurfaceApplications = new Map(
    Object.values(compositor.getSnapshot().surfaces).map((surface) => [
      surface.surfaceId,
      surface.applicationId,
    ]),
  )
  let previousChildSurfaceIds = new Map(
    [...previousSurfaceIds].map((surfaceId) => [
      surfaceId,
      compositor.surface.readChildren({ surfaceId })
        .map((surface) => surface.surfaceId),
    ]),
  )
  let previousSelections = new Map(
    Object.values(compositor.getSnapshot().surfaces).map((surface) => [
      surface.surfaceId,
      surface.selectedChildSurfaceId,
    ]),
  )
  compositor.subscribe(() => {
    const surfaces = Object.values(compositor.getSnapshot().surfaces)
    const surfaceIds = new Set(surfaces.map(({ surfaceId }) => surfaceId))
    for (const [key, declaration] of fieldSupplies) {
      const field = key.slice(key.lastIndexOf(':') + 1)
      const surfaceId = key.slice(0, key.lastIndexOf(':'))
      const surface = surfaces.find((candidate) => candidate.surfaceId === surfaceId)
      const ownerAlive = declaration.supply.surfaceId
        ? surfaceIds.has(declaration.supply.surfaceId)
        : surfaces.some((candidate) => candidate.applicationId === declaration.supply.applicationId)
      const value = field === 'activeWorkspace' ? activeWorkspaceSurfaceId : readField(surface, field)
      if (!surface || !ownerAlive || !equalValue(value, declaration.value)) fieldSupplies.delete(key)
    }
    const removedSurfaceIds = [...previousSurfaceIds].filter(
      (surfaceId) => !surfaceIds.has(surfaceId),
    )
    const applicationIds = new Set(surfaces.map(({ applicationId }) => applicationId))
    const endedApplicationIds = new Set(removedSurfaceIds
      .map((surfaceId) => previousSurfaceApplications.get(surfaceId))
      .filter((applicationId) => !applicationIds.has(applicationId)))
    if (removedSurfaceIds.length) {
      applicationCleanupDirty = true
    }
    const selectionChanged = surfaces.some((surface) => (
      previousSelections.get(surface.surfaceId)
      !== surface.selectedChildSurfaceId
      && surface.selectedChildSurfaceId != null
    ))
    const descendantSurfaceIds = new Set()
    const pendingRemovedSurfaceIds = [...removedSurfaceIds]
    while (pendingRemovedSurfaceIds.length) {
      const parentSurfaceId = pendingRemovedSurfaceIds.pop()
      for (const childSurfaceId of (
        previousChildSurfaceIds.get(parentSurfaceId) ?? []
      )) {
        if (descendantSurfaceIds.has(childSurfaceId)) continue
        descendantSurfaceIds.add(childSurfaceId)
        pendingRemovedSurfaceIds.push(childSurfaceId)
      }
    }
    previousSurfaceIds = surfaceIds
    previousSurfaceApplications = new Map(surfaces.map((surface) => [
      surface.surfaceId,
      surface.applicationId,
    ]))
    previousChildSurfaceIds = new Map(surfaces.map(({ surfaceId }) => [
      surfaceId,
      compositor.surface.readChildren({ surfaceId })
        .map((surface) => surface.surfaceId),
    ]))
    previousSelections = new Map(surfaces.map((surface) => [
      surface.surfaceId,
      surface.selectedChildSurfaceId,
    ]))
    for (const applicationId of endedApplicationIds) {
      appletState.endApplicationState({ applicationId })
    }
    for (const descendantSurfaceId of descendantSurfaceIds) {
      if (!surfaceIds.has(descendantSurfaceId)) continue
      compositor.surface.readControls({
        surfaceId: descendantSurfaceId,
      }).close()
    }
    if (removedSurfaceIds.length || selectionChanged) {
      collectUnreferencedApplications()
    }
    reconcileResidence()
    notifyCheckpoint()
  })

  return Object.freeze({
    appletState,
    composition,
    applicationInstances,
    applicationRegistry,
    compositor,
    desktopEnvironment,
    rootApplicationId: rootApplication.applicationId,
    rootApplet: RootApplet,
    rootSurfaceId: rootSurface.surfaceId,
    rootWindowId: rootWindow.windowId,
    surfaceComponentRegistry,
    checkpoint: checkpointCoordinator,
    runtime,
    windowManager,
  })
}

function createAppletEngine({ applet, composition, desktopEnvironment, options, resetRootApplet, rootApplet }) {
  return constructAppletRuntime({ applet, composition, desktopEnvironment, options, resetRootApplet, rootApplet })
}

function AppletEngineRuntime({
  RootApplet,
  applet,
  children,
  composition,
  dnd,
  engine,
  onEngine,
  options,
  resetRootApplet,
}) {
  const inheritedEngine = useContext(AppletEngineContext)
  const desktopEnvironment = AppletEnvironment.use()
  const ownsEngine = !engine && !inheritedEngine
  const hostsRuntime = !inheritedEngine
  const [ownedEngine] = useState(() => ownsEngine
    ? createAppletEngine({
        applet,
        composition,
        desktopEnvironment,
        options,
        resetRootApplet,
        rootApplet: RootApplet,
      })
    : null)
  const resolvedEngine = engine ?? inheritedEngine ?? ownedEngine
  const mountedEffects = useRef(0)
  const destroyedEngine = useRef(false)

  if (!resolvedEngine) {
    throw new TypeError('AppletEngine requires an engine')
  }
  const rootSurface = resolvedEngine.compositor.surface.read({
    surfaceId: resolvedEngine.rootSurfaceId,
  })
  const rootThemeRoot = rootSurface?.props?.themeRoot !== undefined
    ? rootSurface.props.themeRoot
    : resolvedEngine.runtime.resolveApplicationNode(rootSurface?.application)?.themeRoot ?? null

  useEffect(() => {
    onEngine?.(resolvedEngine)
  }, [onEngine, resolvedEngine])

  useEffect(() => {
    if (!ownsEngine) return undefined
    mountedEffects.current += 1
    return () => {
      mountedEffects.current -= 1
      queueMicrotask(() => {
        if (
          mountedEffects.current === 0
          && !destroyedEngine.current
        ) {
          destroyedEngine.current = true
          resolvedEngine.compositor.destroy?.()
        }
      })
    }
  }, [ownsEngine, resolvedEngine])

  const Provider = resolvedEngine.composition.Provider ?? PassThrough
  const ThemeProvider = resolvedEngine.composition.ThemeProvider ?? AppletThemeProvider

  const content = hostsRuntime
    ? (
        <AppletStateStoreContext.Provider value={resolvedEngine.appletState}>
          <AppletApplicationContext.Provider
            value={resolvedEngine.compositor.application.read({
              applicationId: resolvedEngine.rootApplicationId,
            })}
          >
            <ThemeProvider
              theme={resolvedEngine.runtime.themeFor(rootSurface)}
              themeRoot={rootThemeRoot}
            >
              <desktopEnvironment.compositor.SurfaceComposer
                applicationContext={AppletApplicationContext}
                compositor={resolvedEngine.compositor}
                surfaceId={resolvedEngine.rootSurfaceId}
              >
                {children}
              </desktopEnvironment.compositor.SurfaceComposer>
            </ThemeProvider>
          </AppletApplicationContext.Provider>
        </AppletStateStoreContext.Provider>
      )
    : children

  return (
    <AppletEngineContext.Provider value={resolvedEngine}>
      <AppletEngineOwnershipContext.Provider value={ownsEngine}>
        <Provider {...dnd}>
          {content}
        </Provider>
      </AppletEngineOwnershipContext.Provider>
    </AppletEngineContext.Provider>
  )
}

function OwnedAppletEngine({ options, ...props }) {
  const [runtimeRevision, setRuntimeRevision] = useState(0)
  const activeRuntimeRevision = useRef(runtimeRevision)
  const resetOperation = useRef(null)
  activeRuntimeRevision.current = runtimeRevision
  const resetRootApplet = useCallback(({ beforeResetRootApplet } = {}) => {
    if (activeRuntimeRevision.current !== runtimeRevision) {
      return Promise.resolve(false)
    }
    if (resetOperation.current?.runtimeRevision === runtimeRevision) {
      return resetOperation.current.promise
    }

    let operation
    operation = (async () => {
      try {
        await beforeResetRootApplet?.()
        if (activeRuntimeRevision.current !== runtimeRevision) return false
        activeRuntimeRevision.current = runtimeRevision + 1
        setRuntimeRevision((current) => (
          current === runtimeRevision ? current + 1 : current
        ))
        return true
      } finally {
        if (resetOperation.current?.promise === operation) {
          resetOperation.current = null
        }
      }
    })()
    resetOperation.current = { promise: operation, runtimeRevision }
    return operation
  }, [runtimeRevision])
  const runtimeOptions = runtimeRevision === 0
    ? options
    : {
        ...(options ?? {}),
        initialState: null,
        cleanState: null,
      }

  return (
    <AppletEngineRuntime
      {...props}
      key={runtimeRevision}
      options={runtimeOptions}
      resetRootApplet={resetRootApplet}
    />
  )
}

export default function AppletEngine(props) {
  const inheritedEngine = useContext(AppletEngineContext)
  return props.engine || inheritedEngine
    ? <AppletEngineRuntime {...props} />
    : <OwnedAppletEngine {...props} />
}

AppletEngine.collectApplicationRegistry = collectApplicationRegistry
AppletEngine.collectSettingsContributions = collectSettingsContributions
AppletEngine.create = createAppletEngine
AppletEngine.resolveRootApplet = resolveRootApplet
AppletEngine.Application = function AppletEngineApplication({
  application,
  children,
}) {
  return (
    <AppletApplicationContext.Provider value={application ?? null}>
      {children}
    </AppletApplicationContext.Provider>
  )
}
AppletEngine.use = function useAppletEngine() {
  const engine = useContext(AppletEngineContext)
  if (!engine) throw new Error('AppletEngine.use must be called inside an Applet')
  return engine
}
AppletEngine.useOptional = function useOptionalAppletEngine() {
  return useContext(AppletEngineContext)
}
AppletEngine.useRootApplet = function useRootApplet(
  suppliedRootApplet,
  fallbackApplet,
  defaults,
) {
  const engine = useContext(AppletEngineContext)
  return resolveRootApplet(
    suppliedRootApplet ?? engine?.rootApplet,
    fallbackApplet,
    defaults,
  )
}
AppletEngine.useOwnership = function useAppletEngineOwnership() {
  return useContext(AppletEngineOwnershipContext)
}
AppletEngine.useApplication = function useAppletApplication() {
  return useContext(AppletApplicationContext)
}
AppletEngine.useState = useAppletState

export { useAppletState }
