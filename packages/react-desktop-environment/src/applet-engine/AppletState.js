import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

const surfaceStateKeys = Object.freeze([
  'surfaceId',
  'surfaceComponentName',
  'workspaceId',
  'zIndex',
  'hidden',
  'fullscreen',
  'selectedChildSurfaceId',
  'position',
  'size',
  'props',
  'attentionRevision',
  'restoreGeometry',
])

const applicationStateKeys = Object.freeze([
  'applicationId',
  'applicationName',
  'permanent',
  'parentApplicationId',
  'localName',
  'root',
])

const isArrayIndex = (key, length) => {
  if (!/^(?:0|[1-9]\d*)$/.test(key)) return false
  const index = Number(key)
  return Number.isSafeInteger(index) && index >= 0 && index < length
}

const isRecord = (value) => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const nonEmptyString = (value) => (
  typeof value === 'string' && value.length > 0
)

export function immutableJson(value, label = 'Persistent value') {
  const ancestors = new Set()

  const detach = (candidate, path) => {
    if (
      candidate === null
      || typeof candidate === 'boolean'
      || typeof candidate === 'string'
    ) return candidate
    if (typeof candidate === 'number') {
      if (!Number.isFinite(candidate) || Object.is(candidate, -0)) {
        throw new TypeError(`${path} must contain only JSON numbers`)
      }
      return candidate
    }
    if (typeof candidate !== 'object') {
      throw new TypeError(`${path} must contain only JSON values`)
    }
    if (ancestors.has(candidate)) {
      throw new TypeError(`${path} must not contain a cycle`)
    }

    const isArray = Array.isArray(candidate)
    const prototype = Object.getPrototypeOf(candidate)
    if (
      (isArray && prototype !== Array.prototype)
      || (!isArray && prototype !== Object.prototype && prototype !== null)
    ) {
      throw new TypeError(`${path} must contain only plain JSON containers`)
    }

    const ownKeys = Reflect.ownKeys(candidate)
    if (ownKeys.some((key) => typeof key === 'symbol')) {
      throw new TypeError(`${path} must not contain symbol keys`)
    }
    const stringKeys = isArray
      ? ownKeys.filter((key) => key !== 'length')
      : ownKeys
    if (
      isArray
      && (
        stringKeys.length !== candidate.length
        || stringKeys.some((key) => !isArrayIndex(key, candidate.length))
      )
    ) {
      throw new TypeError(`${path} must be a dense JSON array`)
    }

    ancestors.add(candidate)
    const result = isArray ? [] : Object.create(null)
    const keys = isArray
      ? Array.from({ length: candidate.length }, (_, index) => String(index))
      : stringKeys.sort()
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key)
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
        ancestors.delete(candidate)
        throw new TypeError(`${path}.${key} must be a JSON data property`)
      }
      if (!isArray && !descriptor.enumerable) {
        ancestors.delete(candidate)
        throw new TypeError(`${path}.${key} must be enumerable`)
      }
      const detached = detach(descriptor.value, `${path}.${key}`)
      if (isArray) result.push(detached)
      else result[key] = detached
    }
    ancestors.delete(candidate)
    return Object.freeze(result)
  }

  return detach(value, label)
}

function sameLocalStateValue(current, next) {
  if (Object.is(current, next)) return true
  try {
    return JSON.stringify(immutableJson(current))
      === JSON.stringify(immutableJson(next))
  } catch {
    return false
  }
}

function copyKnownState(source, keys) {
  return Object.fromEntries(keys.flatMap((key) => (
    Object.hasOwn(source, key) ? [[key, source[key]]] : []
  )))
}

export function validateSurfaceState(surfaceState, {
  applicationRegistry,
} = {}) {
  const detached = immutableJson(surfaceState ?? [], 'Surface state')
  if (!Array.isArray(detached)) {
    throw new TypeError('Surface state must be an array')
  }

  const surfaceIds = new Set()
  const windowIds = new Set()
  const entries = []
  for (const entry of detached) {
    if (!isRecord(entry)) continue
    const application = entry.application
    const window = entry.window
    if (
      !nonEmptyString(entry.surfaceId)
      || !isRecord(application)
      || !nonEmptyString(application.applicationId)
      || !nonEmptyString(application.applicationName)
      || !isRecord(window)
      || !nonEmptyString(window.windowId)
      || surfaceIds.has(entry.surfaceId)
      || windowIds.has(window.windowId)
      || (
        applicationRegistry
        && !applicationRegistry[application.applicationName]
      )
    ) continue

    const appletState = isRecord(entry.appletState)
      ? entry.appletState
      : Object.freeze(Object.create(null))
    const normalized = {
      ...copyKnownState(entry, surfaceStateKeys),
      application: copyKnownState(application, applicationStateKeys),
      appletState,
      window,
      ...(entry.activeWorkspace === true ? { activeWorkspace: true } : {}),
    }
    if (!isRecord(normalized.props)) normalized.props = {}
    if (
      normalized.selectedChildSurfaceId !== null
      && normalized.selectedChildSurfaceId !== undefined
      && !nonEmptyString(normalized.selectedChildSurfaceId)
    ) normalized.selectedChildSurfaceId = null

    surfaceIds.add(normalized.surfaceId)
    windowIds.add(normalized.window.windowId)
    entries.push(normalized)
  }

  const retainedWindowIds = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const entry of entries) {
      if (retainedWindowIds.has(entry.window.windowId)) continue
      if (
        entry.window.parentWindowId === null
        || retainedWindowIds.has(entry.window.parentWindowId)
      ) {
        retainedWindowIds.add(entry.window.windowId)
        changed = true
      }
    }
  }
  const retainedSurfaceIds = new Set(entries
    .filter(({ window }) => retainedWindowIds.has(window.windowId))
    .map(({ surfaceId }) => surfaceId))
  const retainedApplicationIds = new Set(entries
    .filter(({ window }) => retainedWindowIds.has(window.windowId))
    .map(({ application }) => application.applicationId))
  const entriesBySurfaceId = new Map(entries.map((entry) => [entry.surfaceId, entry]))

  return immutableJson(entries
    .filter(({ window }) => retainedWindowIds.has(window.windowId))
    .map((entry) => {
      const parentApplicationId = entry.application.parentApplicationId
      const hasUsefulParent = retainedApplicationIds.has(parentApplicationId)
      return {
        ...entry,
        application: hasUsefulParent
          ? entry.application
          : Object.fromEntries(Object.entries(entry.application).filter(
              ([key]) => key !== 'parentApplicationId' && key !== 'localName',
            )),
        selectedChildSurfaceId: retainedSurfaceIds.has(entry.selectedChildSurfaceId)
          && entriesBySurfaceId.get(entry.selectedChildSurfaceId).window.parentWindowId
            === entry.window.windowId
          ? entry.selectedChildSurfaceId : null,
      }
    }), 'Surface state')
}

export const AppletApplicationContext = createContext(null)
export const AppletStateStoreContext = createContext(null)

const requireStateName = (stateName) => {
  if (!nonEmptyString(stateName)) {
    throw new TypeError('useAppletState requires a non-empty stateName')
  }
  return stateName
}

export function createAppletStateStore({
  applications,
  initialState = {},
  getCleanState,
  onCleanStateChange = () => {},
} = {}) {
  const records = new Map()
  const initialCandidates = new Map(Object.entries(initialState))
  const listeners = new Map()
  const checkpointListeners = new Set()
  const setters = new Map()

  const requireRecord = (applicationId) => {
    const record = records.get(applicationId)
    if (!record) throw new Error(`Unknown Applet application: ${applicationId}`)
    return record
  }
  const listenerKey = (applicationId, stateName) => `${applicationId}\0${stateName}`
  const notify = (applicationId, stateName) => {
    listeners.get(listenerKey(applicationId, stateName))?.forEach(
      (listener) => listener(),
    )
  }
  const notifyCheckpoint = () => {
    checkpointListeners.forEach((listener) => listener())
  }
  const stateJson = (applicationId, stateName, value) => immutableJson(
    value,
    `Applet state ${applicationId}.${stateName}`,
  )
  const sameValue = (left, right, persistent) => (
    Object.is(left, right)
    || (persistent && JSON.stringify(left) === JSON.stringify(right))
  )
  const cleanSnapshot = (applicationId) => immutableJson(
    Object.fromEntries(requireRecord(applicationId).cleanValues),
    `Clean Applet state ${applicationId}`,
  )
  const publishCleanState = (applicationId) => onCleanStateChange({
    applicationId,
    state: cleanSnapshot(applicationId),
  })
  const readCleanCandidates = (applicationId, record) => {
    if (record.cleanCandidates === undefined) {
      const candidate = getCleanState ? getCleanState(applicationId) : record.saved
      record.hasCleanState = candidate !== undefined
      record.cleanCandidates = immutableJson({
        ...(record.savedSupply ? record.saved : {}),
        ...(isRecord(candidate) ? candidate : {}),
      }, `Clean Applet state ${applicationId}`)
    }
    return record.cleanCandidates
  }
  const addApplication = (application, { savedState, supply } = {}) => {
    const applicationId = application?.applicationId
    if (
      !nonEmptyString(applicationId)
      || !nonEmptyString(application?.applicationName)
    ) throw new TypeError('Applet state applications require an id and name')
    if (records.has(applicationId)) return application
    const candidate = savedState ?? initialCandidates.get(applicationId)
    initialCandidates.delete(applicationId)
    records.set(applicationId, {
      application,
      saved: isRecord(candidate)
        ? immutableJson(candidate, `Saved Applet state ${applicationId}`)
        : {},
      savedSupply: supplyOwner(supply),
      values: new Map(),
      declarations: new Map(),
      persistence: new Map(),
      cleanCandidates: undefined,
      hasCleanState: false,
      cleanValues: new Map(),
      cleanDeclarations: new Set(),
      supplies: new Map(),
      lifetime: Symbol(),
    })
    return application
  }
  for (const application of Object.values(applications ?? {})) {
    addApplication(application)
  }

  function supplyOwner(supply) {
    if (supply === undefined) return null
    const keys = isRecord(supply) ? Object.keys(supply) : []
    if (
      keys.length !== 1
      || !['applicationId', 'surfaceId'].includes(keys[0])
      || !nonEmptyString(supply[keys[0]])
    ) {
      throw new TypeError('Applet state supply requires exactly one owner identity')
    }
    return `${keys[0]}:${supply[keys[0]]}`
  }
  const write = ({ applicationId, stateName, value, supply }) => {
    requireStateName(stateName)
    const record = requireRecord(applicationId)
    const owner = supplyOwner(supply)
    const persistent = record.persistence.get(stateName) !== false
    if (
      persistent
      && owner !== null
      && record.values.has(stateName)
      && record.supplies.get(stateName) !== owner
    ) return record.values.get(stateName)
    const nextValue = persistent
      ? stateJson(applicationId, stateName, value)
      : value
    const changed = !record.values.has(stateName)
      || !sameValue(record.values.get(stateName), nextValue, persistent)
    if (changed) record.values.set(stateName, nextValue)
    record.persistence.set(stateName, persistent)
    if (persistent && owner !== null) {
      readCleanCandidates(applicationId, record)
      record.supplies.set(stateName, owner)
      if (record.hasCleanState) {
        record.cleanValues.set(stateName, nextValue)
        publishCleanState(applicationId)
      }
    } else {
      record.supplies.delete(stateName)
    }
    if (changed) notify(applicationId, stateName)
    if (persistent && (changed || owner !== null)) notifyCheckpoint()
    return record.values.get(stateName)
  }

  return Object.freeze({
    addApplication,
    cleanSnapshot,
    endApplicationState({ applicationId }) {
      const record = requireRecord(applicationId)
      record.saved = {}
      record.savedSupply = null
      record.values.clear()
      record.declarations.clear()
      record.persistence.clear()
      record.cleanCandidates = {}
      record.cleanValues.clear()
      record.cleanDeclarations.clear()
      record.supplies.clear()
      record.lifetime = Symbol()
      const prefix = `${applicationId}\0`
      for (const [key, stateListeners] of listeners) {
        if (key.startsWith(prefix)) {
          stateListeners.forEach((listener) => listener())
        }
      }
      for (const key of setters.keys()) {
        if (key.startsWith(prefix)) setters.delete(key)
      }
      notifyCheckpoint()
    },
    ensure({ applicationId, initialValue, persistent = true, stateName, adopt }) {
      requireStateName(stateName)
      const record = requireRecord(applicationId)
      if (adopt !== undefined && typeof adopt !== 'function') {
        throw new TypeError('Applet state adopt must be a function')
      }
      if (
        record.persistence.has(stateName)
        && record.persistence.get(stateName) !== persistent
      ) {
        throw new Error(
          `Applet state ${stateName} changed persistence for ${applicationId}`,
        )
      }
      const previous = record.declarations.get(stateName)
      const adoptionChanged = !previous || previous.adopt !== adopt
      record.persistence.set(stateName, persistent)
      record.declarations.set(stateName, { initialValue, adopt, persistent })
      let suppliedDefault
      let resolvedDefault = false
      const defaultValue = () => {
        if (!resolvedDefault) {
          const value = typeof initialValue === 'function'
            ? initialValue()
            : initialValue
          suppliedDefault = persistent
            ? stateJson(applicationId, stateName, value)
            : value
          resolvedDefault = true
        }
        return suppliedDefault
      }
      const recognize = (candidate) => {
        if (candidate === undefined) return undefined
        const recognized = adopt ? adopt(candidate) : candidate
        return recognized === undefined || !persistent
          ? recognized
          : stateJson(applicationId, stateName, recognized)
      }
      let changed = false
      if (!record.values.has(stateName) || adoptionChanged) {
        const suppliedCandidate = !record.values.has(stateName)
          && Object.hasOwn(record.saved, stateName) && record.savedSupply
        const candidate = record.values.has(stateName)
          ? record.values.get(stateName)
          : persistent && Object.hasOwn(record.saved, stateName)
            ? record.saved[stateName]
            : undefined
        const recognized = recognize(candidate)
        const nextValue = recognized === undefined ? defaultValue() : recognized
        changed = !record.values.has(stateName)
          || !sameValue(record.values.get(stateName), nextValue, persistent)
        if (changed) record.values.set(stateName, nextValue)
        if (persistent && recognized === undefined) {
          record.supplies.set(stateName, `applicationId:${applicationId}`)
        } else if (persistent && suppliedCandidate) {
          record.supplies.set(stateName, suppliedCandidate)
        }
      }
      let cleanChanged = false
      if (persistent && (!record.cleanDeclarations.has(stateName) || adoptionChanged)) {
        const candidates = readCleanCandidates(applicationId, record)
        if (record.hasCleanState) {
          const candidate = record.cleanValues.has(stateName)
            ? record.cleanValues.get(stateName)
            : Object.hasOwn(candidates, stateName) ? candidates[stateName] : undefined
          const recognized = recognize(candidate)
          const nextValue = recognized === undefined ? defaultValue() : recognized
          cleanChanged = !record.cleanValues.has(stateName)
            || !sameValue(record.cleanValues.get(stateName), nextValue, true)
          record.cleanValues.set(stateName, nextValue)
          if (cleanChanged) publishCleanState(applicationId)
        }
        record.cleanDeclarations.add(stateName)
      }
      if (changed && previous) notify(applicationId, stateName)
      if (persistent && (changed || cleanChanged)) notifyCheckpoint()
      return record.values.get(stateName)
    },
    getSetter({ applicationId, stateName }) {
      requireRecord(applicationId)
      requireStateName(stateName)
      const key = listenerKey(applicationId, stateName)
      if (!setters.has(key)) {
        const record = requireRecord(applicationId)
        const lifetime = record.lifetime
        setters.set(key, (nextValue, { supply } = {}) => {
          if (records.get(applicationId)?.lifetime !== lifetime) return undefined
          const currentValue = record.values.get(stateName)
          return write({
            applicationId,
            stateName,
            value: typeof nextValue === 'function'
              ? nextValue(currentValue)
              : nextValue,
            supply,
          })
        })
      }
      return setters.get(key)
    },
    read({ applicationId, stateName }) {
      requireStateName(stateName)
      return requireRecord(applicationId).values.get(stateName)
    },
    removeApplication({ applicationId }) {
      const { application } = requireRecord(applicationId)
      records.delete(applicationId)
      const prefix = `${applicationId}\0`
      for (const key of listeners.keys()) {
        if (key.startsWith(prefix)) listeners.delete(key)
      }
      for (const key of setters.keys()) {
        if (key.startsWith(prefix)) setters.delete(key)
      }
      notifyCheckpoint()
      return application
    },
    replaceCleanState(cleanState = {}) {
      for (const [applicationId, record] of records) {
        const candidate = cleanState[applicationId]
        record.hasCleanState = true
        record.cleanCandidates = isRecord(candidate)
          ? immutableJson(candidate, `Clean Applet state ${applicationId}`)
          : {}
        record.cleanValues = new Map(Object.entries(record.cleanCandidates).filter(
          ([stateName]) => record.persistence.get(stateName) === true,
        ))
      }
    },
    snapshot(applicationId) {
      const record = requireRecord(applicationId)
      return immutableJson(Object.fromEntries([...record.values].filter(
        ([stateName]) => record.persistence.get(stateName) !== false,
      )), `Applet state ${applicationId}`)
    },
    subscribe({ applicationId, stateName }, listener) {
      requireRecord(applicationId)
      requireStateName(stateName)
      if (typeof listener !== 'function') {
        throw new TypeError('Applet state listener must be a function')
      }
      const key = listenerKey(applicationId, stateName)
      const stateListeners = listeners.get(key) ?? new Set()
      stateListeners.add(listener)
      listeners.set(key, stateListeners)
      return () => {
        stateListeners.delete(listener)
        if (stateListeners.size === 0) listeners.delete(key)
      }
    },
    subscribeCheckpoint(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('Checkpoint listener must be a function')
      }
      checkpointListeners.add(listener)
      return () => checkpointListeners.delete(listener)
    },
    write,
  })
}

export function useAppletState(initialValue, stateName, options = {}) {
  const application = useContext(AppletApplicationContext)
  const appletState = useContext(AppletStateStoreContext)
  const persistent = application !== null && appletState !== null
  const [localState, setLocalState] = useState(() => ({
    value: persistent
      ? undefined
      : typeof initialValue === 'function' ? initialValue() : initialValue,
  }))
  const committedLocalState = useRef({ adopt: options.adopt, state: localState })
  useLayoutEffect(() => {
    committedLocalState.current = { adopt: options.adopt, state: localState }
  }, [localState, options.adopt])
  let localValue = localState.value
  if (
    !persistent
    && committedLocalState.current.adopt !== options.adopt
    && (
      localState === committedLocalState.current.state
      || localState.adopt !== options.adopt
    )
  ) {
    const recognized = options.adopt ? options.adopt(localValue) : localValue
    const nextValue = recognized === undefined
      ? typeof initialValue === 'function' ? initialValue() : initialValue
      : recognized
    if (!sameLocalStateValue(localValue, nextValue)) {
      localValue = nextValue
      setLocalState({ adopt: options.adopt, value: nextValue })
    }
  }
  const setLocalValue = useCallback((nextValue) => {
    setLocalState((current) => ({
      value: typeof nextValue === 'function' ? nextValue(current.value) : nextValue,
    }))
  }, [])
  if ((application === null) !== (appletState === null)) {
    throw new Error('useAppletState received an incomplete Applet runtime')
  }
  requireStateName(stateName)
  const applicationId = application?.applicationId
  if (persistent) {
    appletState.ensure({
      applicationId,
      initialValue,
      persistent: options.persistent ?? true,
      stateName,
      adopt: options.adopt,
    })
  }

  const subscribe = useCallback(
    (listener) => persistent
      ? appletState.subscribe({ applicationId, stateName }, listener)
      : () => {},
    [appletState, applicationId, persistent, stateName],
  )
  const read = useCallback(
    () => persistent
      ? appletState.read({ applicationId, stateName })
      : localValue,
    [appletState, applicationId, localValue, persistent, stateName],
  )
  const value = useSyncExternalStore(subscribe, read, read)
  return [
    value,
    persistent
      ? appletState.getSetter({ applicationId, stateName })
      : setLocalValue,
  ]
}
