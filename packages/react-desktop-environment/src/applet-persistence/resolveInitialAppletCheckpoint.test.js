// @vitest-environment node

import assert from 'node:assert/strict'
import { test } from 'vitest'
import resolveInitialAppletCheckpoint from './resolveInitialAppletCheckpoint.js'

const surfaceState = (value) => [{
  appletState: { value },
  application: {
    applicationId: 'application:root',
    applicationName: 'root',
    root: true,
  },
  surfaceId: 'surface:root',
  window: { parentWindowId: null, windowId: 'window:root' },
}]

test('prefers a valid local checkpoint without merging the global checkpoint', async () => {
  const local = surfaceState('local')
  const global = surfaceState('global')
  const reads = []

  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: global,
    localStore: {
      async read(options) {
        reads.push(options)
        return local
      },
    },
    scopeId: 'scope:a',
  })

  assert.deepEqual(reads, [{ scopeId: 'scope:a' }])
  assert.deepEqual(result, {
    checkpoint: local,
    cleanCheckpoint: global,
    origin: 'local',
    scopeId: 'scope:a',
  })
})

test('falls through an absent local checkpoint to the global checkpoint', async () => {
  const global = surfaceState('global')
  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: global,
    localStore: { read: async () => null },
    scopeId: 'scope:a',
  })

  assert.equal(result.origin, 'global')
  assert.equal(result.checkpoint, global)
})

test('falls through an invalid local checkpoint to the global checkpoint', async () => {
  const errors = []
  const global = surfaceState('global')
  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: global,
    localStore: { read: async () => ({ invalid: true }) },
    onError: (details) => errors.push(details),
    scopeId: 'scope:a',
  })

  assert.equal(result.origin, 'global')
  assert.equal(result.checkpoint, global)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].operation, 'select')
  assert.equal(errors[0].origin, 'local')
  assert.equal(errors[0].scopeId, 'scope:a')
})

test('falls through an invalid global checkpoint to registered defaults', async () => {
  const errors = []
  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: 'incompatible global',
    localStore: { read: async () => null },
    onError: (details) => errors.push(details),
    scopeId: 'scope:a',
  })

  assert.deepEqual(result, {
    checkpoint: undefined,
    origin: 'default',
    scopeId: 'scope:a',
  })
  assert.deepEqual(
    errors.map(({ operation, origin, scopeId }) => ({
      operation,
      origin,
      scopeId,
    })),
    [{
      operation: 'select',
      origin: 'global',
      scopeId: 'scope:a',
    }],
  )
})

test('falls back to registered defaults when local reading and global validation fail', async () => {
  const errors = []
  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: { invalid: true },
    localStore: {
      async read() {
        throw new Error('database unavailable')
      },
    },
    onError: (details) => errors.push(details),
    scopeId: 'scope:b',
  })

  assert.deepEqual(result, {
    checkpoint: undefined,
    origin: 'default',
    scopeId: 'scope:b',
  })
  assert.deepEqual(
    errors.map(({ operation, origin, scopeId }) => ({
      operation,
      origin,
      scopeId,
    })),
    [
      {
        operation: 'read',
        origin: 'local',
        scopeId: 'scope:b',
      },
      {
        operation: 'select',
        origin: 'global',
        scopeId: 'scope:b',
      },
    ],
  )
})

test('treats null and empty arrays as the same absent checkpoint', async () => {
  const global = surfaceState('global')
  const fromEmptyLocal = await resolveInitialAppletCheckpoint({
    globalCheckpoint: global,
    localStore: { read: async () => [] },
    scopeId: 'scope:a',
  })
  const fromEmptyGlobal = await resolveInitialAppletCheckpoint({
    globalCheckpoint: [],
    localStore: { read: async () => null },
    scopeId: 'scope:a',
  })

  assert.equal(fromEmptyLocal.origin, 'global')
  assert.equal(fromEmptyLocal.checkpoint, global)
  assert.deepEqual(fromEmptyGlobal, {
    checkpoint: undefined,
    origin: 'default',
    scopeId: 'scope:a',
  })
})

test('validates its adapter contract before reading', async () => {
  await assert.rejects(
    resolveInitialAppletCheckpoint({
      localStore: {},
      scopeId: 'scope:a',
    }),
    /localStore requires read/,
  )
  await assert.rejects(
    resolveInitialAppletCheckpoint({
      localStore: { read: async () => null },
      scopeId: '',
    }),
    /non-empty scopeId/,
  )
})

test('selects the exact prepared checkpoint before reading a mutable shared mirror', async () => {
  const prepared = surfaceState('prepared client')
  const global = surfaceState('global baseline')
  let reads = 0
  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: global,
    localStore: {
      async read() {
        reads += 1
        return surfaceState('another client')
      },
    },
    preparedCheckpoint: prepared,
    scopeId: 'scope:a',
  })

  assert.equal(reads, 0)
  assert.equal(result.checkpoint, prepared)
  assert.equal(result.cleanCheckpoint, global)
  assert.deepEqual(result, {
    checkpoint: prepared,
    cleanCheckpoint: global,
    origin: 'prepared',
    scopeId: 'scope:a',
  })
  assert.equal(Object.isFrozen(result), true)
})

test('selects an empty prepared array without replacing its subject with local or global state', async () => {
  const prepared = []
  const global = surfaceState('global baseline')
  let reads = 0
  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: global,
    localStore: {
      async read() {
        reads += 1
        return surfaceState('another client')
      },
    },
    preparedCheckpoint: prepared,
    scopeId: 'scope:a',
  })

  assert.equal(reads, 0)
  assert.equal(result.origin, 'prepared')
  assert.equal(result.checkpoint, prepared)
  assert.equal(result.cleanCheckpoint, global)
})

test('keeps an absent or invalid global baseline separate from prepared recovery', async () => {
  const prepared = surfaceState('prepared client')
  for (const globalCheckpoint of [undefined, null, [], { invalid: true }]) {
    const errors = []
    const result = await resolveInitialAppletCheckpoint({
      globalCheckpoint,
      localStore: { read: async () => { throw new Error('Must not read the mirror') } },
      onError: (details) => errors.push(details),
      preparedCheckpoint: prepared,
      scopeId: 'scope:a',
    })
    assert.equal(result.origin, 'prepared')
    assert.equal(result.checkpoint, prepared)
    assert.equal(result.cleanCheckpoint, null)
    assert.deepEqual(errors.map(({ operation, origin }) => ({ operation, origin })),
      globalCheckpoint?.invalid ? [{ operation: 'select', origin: 'global' }] : [])
  }
})

test('retains ordinary recovery when the optional prepared checkpoint is absent', async () => {
  const local = surfaceState('local')
  const result = await resolveInitialAppletCheckpoint({
    globalCheckpoint: surfaceState('global'),
    localStore: { read: async () => local },
    preparedCheckpoint: undefined,
    scopeId: 'scope:a',
  })

  assert.equal(result.origin, 'local')
  assert.equal(result.checkpoint, local)
})

test('rejects an explicit prepared value that is not a direct checkpoint array', async () => {
  for (const preparedCheckpoint of [null, {}, 'invalid']) {
    let reads = 0
    await assert.rejects(resolveInitialAppletCheckpoint({
      localStore: { read: async () => { reads += 1 } },
      preparedCheckpoint,
      scopeId: 'scope:a',
    }), /preparedCheckpoint must be a surfaceState array/)
    assert.equal(reads, 0)
  }
})
