// @vitest-environment node

import assert from 'node:assert/strict'
import { IDBFactory } from 'fake-indexeddb'
import { test } from 'vitest'
import createIndexedDbAppletStore from './createIndexedDbAppletStore.js'

const DATABASE_NAME = 'react-desktop-environment-applet-persistence'

const checkpoint = (label) => [{
  appletState: { label },
  application: {
    applicationId: 'application:root',
    applicationName: 'notebook',
    root: true,
  },
  surfaceComponentName: 'default',
  surfaceId: 'surface:root',
  window: {
    parentWindowId: null,
    windowId: 'window:root',
  },
  workspaceId: 'notebook',
}]

const requestResult = (request) => new Promise((resolve, reject) => {
  request.addEventListener('success', () => resolve(request.result), {
    once: true,
  })
  request.addEventListener('error', () => reject(request.error), { once: true })
})

const transactionCompletion = (transaction) => new Promise(
  (resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener('abort', () => reject(transaction.error), {
      once: true,
    })
  },
)

const openRawDatabase = (indexedDB) => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 1)
  request.addEventListener('success', () => resolve(request.result), {
    once: true,
  })
  request.addEventListener('error', () => reject(request.error), { once: true })
})

const readRawRecord = async (database, scopeId) => {
  const transaction = database.transaction('checkpoints', 'readonly')
  const completion = transactionCompletion(transaction)
  const record = await requestResult(
    transaction.objectStore('checkpoints').get(scopeId),
  )
  await completion
  return record
}

const writeRawRecord = async (database, record) => {
  const transaction = database.transaction('checkpoints', 'readwrite')
  const completion = transactionCompletion(transaction)
  await requestResult(transaction.objectStore('checkpoints').put(record))
  await completion
}

test('creates the version-one checkpoint store and unwraps its record', async () => {
  const indexedDB = new IDBFactory()
  const store = createIndexedDbAppletStore({ indexedDB })
  const savedCheckpoint = checkpoint('saved')

  await store.write({
    checkpoint: savedCheckpoint,
    scopeId: 'scope:a',
  })
  const restoredCheckpoint = await store.read({ scopeId: 'scope:a' })
  const database = await openRawDatabase(indexedDB)
  const objectStore = database
    .transaction('checkpoints', 'readonly')
    .objectStore('checkpoints')

  assert.deepEqual(restoredCheckpoint, savedCheckpoint)
  assert.notEqual(restoredCheckpoint, savedCheckpoint)
  assert.equal(database.version, 1)
  assert.deepEqual([...database.objectStoreNames], ['checkpoints'])
  assert.equal(objectStore.keyPath, 'scopeId')
  assert.deepEqual(
    await readRawRecord(database, 'scope:a'),
    {
      checkpoint: savedCheckpoint,
      scopeId: 'scope:a',
    },
  )
  database.close()
})

test('isolates Scope scopes and removes only the selected one', async () => {
  const store = createIndexedDbAppletStore({ indexedDB: new IDBFactory() })
  const checkpointA = checkpoint('a')
  const checkpointB = checkpoint('b')

  await store.write({ checkpoint: checkpointA, scopeId: 'scope:a' })
  await store.write({ checkpoint: checkpointB, scopeId: 'scope:b' })
  await store.remove({ scopeId: 'scope:a' })

  assert.equal(await store.read({ scopeId: 'scope:a' }), null)
  assert.deepEqual(
    await store.read({ scopeId: 'scope:b' }),
    checkpointB,
  )
})

test('replaces a complete scoped checkpoint without merging it', async () => {
  const store = createIndexedDbAppletStore({ indexedDB: new IDBFactory() })
  await store.write({
    checkpoint: [...checkpoint('first'), { obsolete: true }],
    scopeId: 'scope:a',
  })
  const replacement = checkpoint('replacement')

  await store.write({
    checkpoint: replacement,
    scopeId: 'scope:a',
  })

  assert.deepEqual(
    await store.read({ scopeId: 'scope:a' }),
    replacement,
  )
})

test('treats removing an absent scope as a successful no-op', async () => {
  const store = createIndexedDbAppletStore({ indexedDB: new IDBFactory() })

  await store.remove({ scopeId: 'scope:absent' })

  assert.equal(await store.read({ scopeId: 'scope:absent' }), null)
})

test('keeps the committed record when its replacement cannot be cloned', async () => {
  const store = createIndexedDbAppletStore({ indexedDB: new IDBFactory() })
  const committed = checkpoint('committed')
  await store.write({ checkpoint: committed, scopeId: 'scope:a' })

  await assert.rejects(store.write({
    checkpoint: [...checkpoint('invalid'), () => {}],
    scopeId: 'scope:a',
  }))

  assert.deepEqual(await store.read({ scopeId: 'scope:a' }), committed)
})

test('rejects a malformed physical checkpoint record', async () => {
  const indexedDB = new IDBFactory()
  const store = createIndexedDbAppletStore({ indexedDB })
  assert.equal(await store.read({ scopeId: 'scope:bootstrap' }), null)
  const database = await openRawDatabase(indexedDB)
  await writeRawRecord(database, { scopeId: 'scope:a' })

  await assert.rejects(
    store.read({ scopeId: 'scope:a' }),
    /checkpoint record is invalid/,
  )
  for (const malformedCheckpoint of [null, 'invalid']) {
    await writeRawRecord(database, {
      checkpoint: malformedCheckpoint,
      scopeId: 'scope:a',
    })
    await assert.rejects(
      store.read({ scopeId: 'scope:a' }),
      /Surface-state array/,
    )
  }
  database.close()
})

test('validates scope and checkpoint inputs', async () => {
  const store = createIndexedDbAppletStore({ indexedDB: new IDBFactory() })

  await assert.rejects(store.read({ scopeId: '' }), /non-empty scopeId/)
  await assert.rejects(store.remove({ scopeId: '' }), /non-empty scopeId/)
  await assert.rejects(
    store.write({ checkpoint: checkpoint('valid'), scopeId: '' }),
    /non-empty scopeId/,
  )
  await assert.rejects(
    store.write({ scopeId: 'scope:a' }),
    /Surface-state array/,
  )
})

test('reports unavailable IndexedDB through each storage operation', async () => {
  const store = createIndexedDbAppletStore()

  await assert.rejects(
    store.read({ scopeId: 'scope:a' }),
    /IndexedDB is unavailable/,
  )
  await assert.rejects(
    store.write({
      checkpoint: checkpoint('saved'),
      scopeId: 'scope:a',
    }),
    /IndexedDB is unavailable/,
  )
  await assert.rejects(
    store.remove({ scopeId: 'scope:a' }),
    /IndexedDB is unavailable/,
  )
})

test('recovers an existing host-selected version-one physical database', async () => {
  const indexedDB = new IDBFactory()
  const databaseName = 'consumer-existing-checkpoints'
  const opening = indexedDB.open(databaseName, 1)
  opening.addEventListener('upgradeneeded', () => {
    opening.result.createObjectStore('checkpoints', { keyPath: 'scopeId' })
  })
  const original = await requestResult(opening)
  const saved = checkpoint('before-extraction')
  await writeRawRecord(original, { scopeId: 'scope:existing', checkpoint: saved })
  original.close()
  const store = createIndexedDbAppletStore({ indexedDB, databaseName })
  assert.deepEqual(await store.read({ scopeId: 'scope:existing' }), saved)
  const defaultStore = createIndexedDbAppletStore({ indexedDB })
  assert.equal(await defaultStore.read({ scopeId: 'scope:existing' }), null)
})
