import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

const DesktopEnvironmentContext = createContext(null)

export function DesktopEnvironment({
  windowManager,
  desktopEnvironment,
  renderApplication,
  onInitialize,
  onWindowManagerEvent,
  initializationFallback = null,
  children,
}) {
  if (!windowManager) {
    throw new Error('DesktopEnvironment requires a windowManager')
  }
  if (!desktopEnvironment) {
    throw new Error('DesktopEnvironment requires a desktopEnvironment')
  }
  if (typeof renderApplication !== 'function') {
    throw new Error('DesktopEnvironment requires renderApplication')
  }

  const onInitializeRef = useRef(onInitialize)
  const onWindowManagerEventRef = useRef(onWindowManagerEvent)
  const initializedManagerRef = useRef(null)
  const [readyManager, setReadyManager] = useState(() =>
    onInitialize ? null : windowManager,
  )
  const [initializationError, setInitializationError] = useState(null)
  onInitializeRef.current = onInitialize
  onWindowManagerEventRef.current = onWindowManagerEvent

  const value = useMemo(
    () => ({
      windowManager,
      desktopEnvironment,
      renderApplication,
    }),
    [desktopEnvironment, renderApplication, windowManager],
  )

  useEffect(
    () =>
      windowManager.subscribeEvents((event) => {
        onWindowManagerEventRef.current?.(event, {
          ...value,
          windowManagerSnapshot: event.snapshot,
          desktopSnapshot: desktopEnvironment.getSnapshot(),
        })
      }),
    [desktopEnvironment, value, windowManager],
  )

  useEffect(() => {
    if (initializedManagerRef.current === windowManager) return undefined
    initializedManagerRef.current = windowManager
    setInitializationError(null)

    let result
    try {
      result = onInitializeRef.current?.({
        ...value,
        windowManagerSnapshot: windowManager.getSnapshot(),
        desktopSnapshot: desktopEnvironment.getSnapshot(),
      })
    } catch (error) {
      setInitializationError(error)
      return undefined
    }

    if (!result || typeof result.then !== 'function') {
      setReadyManager(windowManager)
      return undefined
    }

    let active = true
    setReadyManager(null)
    result.then(
      () => active && setReadyManager(windowManager),
      (error) => active && setInitializationError(error),
    )

    return () => {
      active = false
    }
  }, [desktopEnvironment, value, windowManager])

  if (initializationError) throw initializationError

  return (
    <DesktopEnvironmentContext.Provider value={value}>
      {readyManager === windowManager ? children : initializationFallback}
    </DesktopEnvironmentContext.Provider>
  )
}

export function useDesktopEnvironment() {
  const value = useContext(DesktopEnvironmentContext)
  if (!value) throw new Error('DesktopEnvironment is missing')
  return value
}

export function useWindowManagerSnapshot() {
  const { windowManager } = useDesktopEnvironment()
  return useSyncExternalStore(
    windowManager.subscribe,
    windowManager.getSnapshot,
    windowManager.getSnapshot,
  )
}

export function useDesktopSnapshot() {
  const { desktopEnvironment } = useDesktopEnvironment()
  return useSyncExternalStore(
    desktopEnvironment.subscribe,
    desktopEnvironment.getSnapshot,
    desktopEnvironment.getSnapshot,
  )
}

export const useWindowManagerCommands = () =>
  useDesktopEnvironment().windowManager.commands

export const useDesktopCommands = () =>
  useDesktopEnvironment().desktopEnvironment.commands
