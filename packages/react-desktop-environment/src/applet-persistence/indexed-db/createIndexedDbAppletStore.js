const DATABASE_NAME = 'react-desktop-environment-applet-persistence'
const DATABASE_VERSION = 1
const CHECKPOINT_STORE_NAME = 'checkpoints'

const requireScopeId = (scopeId) => {
  if (typeof scopeId !== 'string' || scopeId.length === 0) {
    throw new TypeError(
      'IndexedDB Applet persistence requires a non-empty scopeId',
    )
  }
  return scopeId
}

const requireCheckpoint = (checkpoint) => {
  if (!Array.isArray(checkpoint)) {
    throw new TypeError(
      'IndexedDB Applet persistence requires a Surface-state array',
    )
  }
  return checkpoint
}

const requestResult = (request) => new Promise((resolve, reject) => {
  request.addEventListener('success', () => resolve(request.result), {
    once: true,
  })
  request.addEventListener('error', () => {
    reject(request.error ?? new Error('IndexedDB request failed'))
  }, { once: true })
})

const transactionCompletion = (transaction) => new Promise(
  (resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener('abort', () => {
      reject(
        transaction.error ?? new Error('IndexedDB transaction was aborted'),
      )
    }, { once: true })
  },
)

const runRequest = async (database, mode, createRequest) => {
  const transaction = database.transaction(CHECKPOINT_STORE_NAME, mode)
  const completion = transactionCompletion(transaction)
  let request

  try {
    request = createRequest(transaction.objectStore(CHECKPOINT_STORE_NAME))
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // The transaction has already reached its terminal state.
    }
    await completion.catch(() => {})
    throw error
  }

  let result
  let operationError
  try {
    result = await requestResult(request)
  } catch (error) {
    operationError = error
  }

  try {
    await completion
  } catch (error) {
    operationError ??= error
  }

  if (operationError) throw operationError
  return result
}

const openDatabase = (indexedDb, databaseName) => new Promise((resolve, reject) => {
  if (typeof indexedDb?.open !== 'function') {
    reject(new Error('IndexedDB is unavailable'))
    return
  }

  let blocked = false
  let request
  try {
    request = indexedDb.open(databaseName, DATABASE_VERSION)
  } catch (error) {
    reject(error)
    return
  }

  request.addEventListener('upgradeneeded', (event) => {
    if (event.oldVersion === 0) {
      request.result.createObjectStore(CHECKPOINT_STORE_NAME, {
        keyPath: 'scopeId',
      })
    }
  })
  request.addEventListener('blocked', () => {
    blocked = true
    reject(new Error('Opening IndexedDB Applet persistence was blocked'))
  }, { once: true })
  request.addEventListener('error', () => {
    reject(request.error ?? new Error('Opening IndexedDB failed'))
  }, { once: true })
  request.addEventListener('success', () => {
    const database = request.result
    if (blocked) {
      database.close()
      return
    }
    resolve(database)
  }, { once: true })
})

const checkpointFromRecord = (record, scopeId) => {
  if (
    typeof record !== 'object'
    || record === null
    || Array.isArray(record)
    || record.scopeId !== scopeId
    || !Object.hasOwn(record, 'checkpoint')
  ) {
    throw new TypeError('IndexedDB Applet checkpoint record is invalid')
  }
  return requireCheckpoint(record.checkpoint)
}

export default function createIndexedDbAppletStore({
  databaseName = DATABASE_NAME,
  indexedDB: indexedDb = globalThis.indexedDB,
} = {}) {
  if (typeof databaseName !== 'string' || !databaseName.length) {
    throw new TypeError('IndexedDB Applet persistence requires a non-empty databaseName')
  }
  let database
  let openingDatabase

  const getDatabase = () => {
    if (database) return Promise.resolve(database)
    if (openingDatabase) return openingDatabase

    openingDatabase = openDatabase(indexedDb, databaseName)
      .then((openedDatabase) => {
        database = openedDatabase
        const forgetDatabase = () => {
          if (database === openedDatabase) database = undefined
        }
        openedDatabase.addEventListener('versionchange', () => {
          openedDatabase.close()
          forgetDatabase()
        })
        openedDatabase.addEventListener('close', forgetDatabase)
        return openedDatabase
      })
      .finally(() => {
        openingDatabase = undefined
      })

    return openingDatabase
  }

  const read = async ({ scopeId: suppliedScopeId } = {}) => {
    const scopeId = requireScopeId(suppliedScopeId)
    const openedDatabase = await getDatabase()
    const record = await runRequest(
      openedDatabase,
      'readonly',
      (objectStore) => objectStore.get(scopeId),
    )
    return record === undefined ? null : checkpointFromRecord(record, scopeId)
  }

  const write = async ({
    checkpoint: suppliedCheckpoint,
    scopeId: suppliedScopeId,
  } = {}) => {
    const checkpoint = requireCheckpoint(suppliedCheckpoint)
    const scopeId = requireScopeId(suppliedScopeId)
    const openedDatabase = await getDatabase()
    await runRequest(
      openedDatabase,
      'readwrite',
      (objectStore) => objectStore.put({ checkpoint, scopeId }),
    )
  }

  const remove = async ({ scopeId: suppliedScopeId } = {}) => {
    const scopeId = requireScopeId(suppliedScopeId)
    const openedDatabase = await getDatabase()
    await runRequest(
      openedDatabase,
      'readwrite',
      (objectStore) => objectStore.delete(scopeId),
    )
  }

  return Object.freeze({ read, remove, write })
}
