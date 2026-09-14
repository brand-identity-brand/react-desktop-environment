const requireScopeId = (scopeId) => {
  if (typeof scopeId !== 'string' || scopeId.length === 0) {
    throw new TypeError('Applet persistence requires a non-empty scopeId')
  }
  return scopeId
}

const reportError = (onError, details) => {
  try {
    onError?.(Object.freeze(details))
  } catch {
    // Persistence diagnostics must not prevent checkpoint fallback.
  }
}

const selectCandidate = ({
  checkpoint,
  onError,
  origin,
  scopeId,
}) => {
  if (checkpoint == null) return undefined
  if (!Array.isArray(checkpoint)) {
    const error = new TypeError(
      'Applet checkpoint must be a surfaceState array',
    )
    reportError(onError, {
      error,
      operation: 'select',
      origin,
      scopeId,
    })
    return undefined
  }
  if (checkpoint.length === 0) return undefined
  return checkpoint
}

export default async function resolveInitialAppletCheckpoint({
  globalCheckpoint,
  localStore,
  onError,
  preparedCheckpoint,
  scopeId: suppliedScopeId,
} = {}) {
  const scopeId = requireScopeId(suppliedScopeId)
  if (typeof localStore?.read !== 'function') {
    throw new TypeError('Applet persistence localStore requires read')
  }
  if (onError !== undefined && typeof onError !== 'function') {
    throw new TypeError('Applet persistence onError must be a function')
  }

  if (preparedCheckpoint !== undefined) {
    if (!Array.isArray(preparedCheckpoint)) {
      throw new TypeError(
        'Applet persistence preparedCheckpoint must be a surfaceState array',
      )
    }
    const global = selectCandidate({
      checkpoint: globalCheckpoint,
      onError,
      origin: 'global',
      scopeId,
    })
    return Object.freeze({
      checkpoint: preparedCheckpoint,
      cleanCheckpoint: global ?? null,
      origin: 'prepared',
      scopeId,
    })
  }

  let localCheckpoint
  try {
    localCheckpoint = await localStore.read({ scopeId })
  } catch (error) {
    reportError(onError, {
      error,
      operation: 'read',
      origin: 'local',
      scopeId,
    })
  }

  const local = selectCandidate({
    checkpoint: localCheckpoint,
    onError,
    origin: 'local',
    scopeId,
  })
  const global = selectCandidate({
    checkpoint: globalCheckpoint,
    onError,
    origin: 'global',
    scopeId,
  })
  if (local !== undefined) {
    return Object.freeze({
      checkpoint: local,
      cleanCheckpoint: global ?? null,
      origin: 'local',
      scopeId,
    })
  }

  if (global !== undefined) {
    return Object.freeze({
      checkpoint: global,
      origin: 'global',
      scopeId,
    })
  }

  return Object.freeze({
    checkpoint: undefined,
    origin: 'default',
    scopeId,
  })
}
