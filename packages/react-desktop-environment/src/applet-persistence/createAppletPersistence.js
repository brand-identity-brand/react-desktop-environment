const defaultScheduler = Object.freeze({
  clearTimeout(handle) {
    globalThis.clearTimeout(handle)
  },
  setTimeout(callback, delay) {
    return globalThis.setTimeout(callback, delay)
  },
})

const requireScopeId = (scopeId) => {
  if (typeof scopeId !== 'string' || scopeId.length === 0) {
    throw new TypeError('Applet persistence requires a non-empty scopeId')
  }
  return scopeId
}

const successfulWrite = (wrote) => Object.freeze({
  ok: true,
  wrote,
})

const failedOperation = (error) => Object.freeze({
  error,
  ok: false,
})

export default function createAppletPersistence({
  debounceMs = 300,
  onError,
  scheduler = defaultScheduler,
  scopeId: suppliedScopeId,
  source,
  store,
} = {}) {
  const scopeId = requireScopeId(suppliedScopeId)
  if (
    typeof source?.subscribe !== 'function'
    || typeof source?.capture !== 'function'
    || typeof source?.release !== 'function'
  ) {
    throw new TypeError(
      'Applet persistence source requires subscribe, capture, and release',
    )
  }
  if (
    typeof store?.read !== 'function'
    || typeof store?.write !== 'function'
    || typeof store?.remove !== 'function'
  ) {
    throw new TypeError(
      'Applet persistence store requires read, write, and remove',
    )
  }
  if (!Number.isFinite(debounceMs) || debounceMs < 0) {
    throw new TypeError('Applet persistence debounceMs must be non-negative')
  }
  if (onError !== undefined && typeof onError !== 'function') {
    throw new TypeError('Applet persistence onError must be a function')
  }
  if (
    typeof scheduler?.setTimeout !== 'function'
    || typeof scheduler?.clearTimeout !== 'function'
  ) {
    throw new TypeError(
      'Applet persistence scheduler requires setTimeout and clearTimeout',
    )
  }

  let lifecycle = 'active'
  let revision = 1
  let savedRevision = 0
  let timerHandle
  let activeWrite = null
  let automaticPersistence = null
  let discardOperation = null
  let disposeOperation = null

  const notifyError = (error, operation) => {
    try {
      onError?.(Object.freeze({ error, operation, scopeId }))
    } catch {
      // Persistence diagnostics must never become a second failure.
    }
  }

  const releaseCapture = (capture) => {
    try {
      if (source.release(capture) === false) {
        notifyError(
          new Error('Applet persistence source rejected its capture'),
          'release',
        )
      }
    } catch (error) {
      notifyError(error, 'release')
    }
  }

  const writeRevision = (targetRevision) => {
    if (activeWrite) return activeWrite

    const running = (async () => {
      let capture
      try {
        capture = source.capture()
        if (
          typeof capture !== 'object'
          || capture === null
          || !Object.hasOwn(capture, 'snapshot')
        ) {
          throw new TypeError(
            'Applet persistence source capture requires a snapshot',
          )
        }
      } catch (error) {
        notifyError(error, 'capture')
        if (capture !== undefined) releaseCapture(capture)
        return failedOperation(error)
      }

      try {
        await store.write({
          checkpoint: capture.snapshot,
          scopeId,
        })
        savedRevision = Math.max(savedRevision, targetRevision)
        return successfulWrite(true)
      } catch (error) {
        notifyError(error, 'write')
        return failedOperation(error)
      } finally {
        releaseCapture(capture)
      }
    })()

    activeWrite = running
    void running.finally(() => {
      if (activeWrite === running) activeWrite = null
    })
    return running
  }

  const persistAutomatically = () => {
    if (automaticPersistence || lifecycle !== 'active') {
      return automaticPersistence
    }
    const running = (async () => {
      while (lifecycle === 'active' && savedRevision < revision) {
        const targetRevision = revision
        const result = await writeRevision(targetRevision)
        if (!result.ok && revision === targetRevision) break
      }
    })()
    automaticPersistence = running
    void running.finally(() => {
      if (automaticPersistence === running) automaticPersistence = null
    })
    return running
  }

  const cancelScheduledWrite = () => {
    if (timerHandle === undefined) return
    scheduler.clearTimeout(timerHandle)
    timerHandle = undefined
  }

  const scheduleWrite = () => {
    if (lifecycle !== 'active') return
    cancelScheduledWrite()
    timerHandle = scheduler.setTimeout(() => {
      timerHandle = undefined
      void persistAutomatically()
    }, debounceMs)
  }

  let subscribed = false
  const observeChange = () => {
    if (lifecycle !== 'active') return
    revision += 1
    if (subscribed) scheduleWrite()
  }

  const unsubscribe = source.subscribe(observeChange)
  if (typeof unsubscribe !== 'function') {
    throw new TypeError(
      'Applet persistence source subscribe must return an unsubscribe function',
    )
  }
  subscribed = true
  try {
    scheduleWrite()
  } catch (error) {
    subscribed = false
    unsubscribe()
    throw error
  }

  const stopObserving = () => {
    subscribed = false
    cancelScheduledWrite()
    try {
      unsubscribe()
    } catch (error) {
      notifyError(error, 'unsubscribe')
    }
  }

  const flushThrough = async (targetRevision) => {
    let wrote = false
    while (savedRevision < targetRevision) {
      if (activeWrite) {
        const currentResult = await activeWrite
        wrote ||= currentResult.ok && currentResult.wrote
        if (savedRevision >= targetRevision) break
      }
      const result = await writeRevision(revision)
      if (!result.ok) return result
      wrote = true
    }
    return successfulWrite(wrote)
  }

  const flush = () => {
    if (lifecycle !== 'active') {
      throw new Error('Applet persistence is no longer active')
    }
    cancelScheduledWrite()
    return flushThrough(revision)
  }

  const dispose = ({ flush: shouldFlush = true } = {}) => {
    if (discardOperation) return discardOperation
    if (disposeOperation) return disposeOperation
    if (typeof shouldFlush !== 'boolean') {
      throw new TypeError('Applet persistence dispose flush must be boolean')
    }
    lifecycle = 'disposing'
    stopObserving()
    const targetRevision = revision
    disposeOperation = (async () => {
      try {
        if (shouldFlush) return await flushThrough(targetRevision)
        if (activeWrite) return await activeWrite
        return successfulWrite(false)
      } finally {
        if (lifecycle === 'disposing') lifecycle = 'disposed'
      }
    })()
    return disposeOperation
  }

  const discard = () => {
    if (discardOperation) return discardOperation
    lifecycle = 'discarding'
    if (!disposeOperation) stopObserving()
    const pendingDispose = disposeOperation
    discardOperation = (async () => {
      if (pendingDispose) {
        await pendingDispose
      } else if (activeWrite) {
        await activeWrite
      }
      try {
        await store.remove({ scopeId })
        return Object.freeze({ ok: true, removed: true })
      } catch (error) {
        notifyError(error, 'remove')
        return failedOperation(error)
      } finally {
        lifecycle = 'disposed'
      }
    })()
    return discardOperation
  }

  return Object.freeze({
    discard,
    dispose,
    flush,
    scopeId,
  })
}
