// @vitest-environment node

import assert from 'node:assert/strict'
import { test } from 'vitest'
import createAppletPersistence from './createAppletPersistence.js'

const deferred = () => {
  let reject
  let resolve
  const promise = new Promise((resolvePromise, rejectPromise) => {
    reject = rejectPromise
    resolve = resolvePromise
  })
  return { promise, reject, resolve }
}

const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve))

function createScheduler() {
  let sequence = 0
  const callbacks = new Map()
  return {
    clearTimeout(handle) {
      callbacks.delete(handle)
    },
    run() {
      const scheduled = [...callbacks.values()]
      callbacks.clear()
      for (const callback of scheduled) callback()
    },
    setTimeout(callback) {
      sequence += 1
      callbacks.set(sequence, callback)
      return sequence
    },
    get size() {
      return callbacks.size
    },
  }
}

function createSource(initialCheckpoint) {
  let checkpoint = initialCheckpoint
  const listeners = new Set()
  const captures = []
  const releases = []
  return {
    captures,
    releases,
    source: {
      capture() {
        const capture = { id: captures.length + 1, snapshot: checkpoint }
        captures.push(capture)
        return capture
      },
      release(capture) {
        releases.push(capture)
        return true
      },
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
    update(nextCheckpoint) {
      checkpoint = nextCheckpoint
      for (const listener of listeners) listener()
    },
    get listenerCount() {
      return listeners.size
    },
  }
}

function createStore(overrides = {}) {
  const writes = []
  const removals = []
  return {
    removals,
    store: {
      read: async () => null,
      async remove(options) {
        removals.push(options)
      },
      async write(options) {
        writes.push(options)
      },
      ...overrides,
    },
    writes,
  }
}

test('persists the initial source checkpoint without requiring a change', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const storage = createStore()
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  assert.equal(scheduler.size, 1)
  assert.deepEqual(await persistence.flush(), { ok: true, wrote: true })
  assert.deepEqual(storage.writes, [{
    checkpoint: { version: 2, value: 'initial' },
    scopeId: 'scope:a',
  }])
  assert.deepEqual(source.releases, source.captures)
  await persistence.dispose({ flush: false })
})

test('debounces a burst into one capture of the newest checkpoint', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const storage = createStore()
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  source.update({ version: 2, value: 'first' })
  source.update({ version: 2, value: 'latest' })
  assert.equal(scheduler.size, 1)
  scheduler.run()
  await persistence.dispose({ flush: false })

  assert.equal(source.captures.length, 1)
  assert.equal(storage.writes.length, 1)
  assert.equal(storage.writes[0].checkpoint.value, 'latest')
  assert.deepEqual(source.releases, source.captures)
})

test('serializes writes and coalesces changes during a pending write', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const pendingWrites = []
  const writes = []
  let activeWrites = 0
  let maximumActiveWrites = 0
  const storage = createStore({
    async write(options) {
      writes.push(options)
      activeWrites += 1
      maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites)
      const pending = deferred()
      pendingWrites.push(pending)
      await pending.promise
      activeWrites -= 1
    },
  })
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  scheduler.run()
  assert.equal(writes.length, 1)
  source.update({ version: 2, value: 'middle' })
  source.update({ version: 2, value: 'latest' })
  scheduler.run()
  assert.equal(writes.length, 1)

  pendingWrites[0].resolve()
  await yieldToEventLoop()
  assert.equal(writes.length, 2)
  assert.equal(writes[1].checkpoint.value, 'latest')
  assert.equal(maximumActiveWrites, 1)

  const disposal = persistence.dispose({ flush: false })
  pendingWrites[1].resolve()
  await disposal
  assert.deepEqual(source.releases, source.captures)
})

test('releases failed captures and lets an explicit flush retry', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'retry' })
  const errors = []
  let attempts = 0
  const storage = createStore({
    async write() {
      attempts += 1
      if (attempts === 1) throw new Error('write failed')
    },
  })
  const persistence = createAppletPersistence({
    onError: (details) => errors.push(details),
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  scheduler.run()
  await Promise.resolve()
  await Promise.resolve()
  const result = await persistence.flush()

  assert.deepEqual(result, { ok: true, wrote: true })
  assert.equal(attempts, 2)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].operation, 'write')
  assert.equal(errors[0].scopeId, 'scope:a')
  assert.deepEqual(source.releases, source.captures)
  await persistence.dispose({ flush: false })
})

test('retries a failed automatic write after the next source change', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'first' })
  const writes = []
  let attempts = 0
  const storage = createStore({
    async write(options) {
      attempts += 1
      if (attempts === 1) throw new Error('write failed')
      writes.push(options)
    },
  })
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  scheduler.run()
  await yieldToEventLoop()
  source.update({ version: 2, value: 'second' })
  scheduler.run()
  await yieldToEventLoop()

  assert.equal(attempts, 2)
  assert.equal(writes[0].checkpoint.value, 'second')
  assert.deepEqual(source.releases, source.captures)
  await persistence.dispose({ flush: false })
})

test('reports a malformed capture and releases its handle without writing', async () => {
  const scheduler = createScheduler()
  const capture = { id: 'malformed' }
  const releases = []
  const errors = []
  const storage = createStore()
  const persistence = createAppletPersistence({
    onError: (details) => errors.push(details),
    scheduler,
    scopeId: 'scope:a',
    source: {
      capture: () => capture,
      release(value) {
        releases.push(value)
        return true
      },
      subscribe: () => () => {},
    },
    store: storage.store,
  })

  const result = await persistence.flush()

  assert.equal(result.ok, false)
  assert.equal(errors[0].operation, 'capture')
  assert.deepEqual(releases, [capture])
  assert.equal(storage.writes.length, 0)
  await persistence.dispose({ flush: false })
})

test('reports a rejected release after writing each capture exactly once', async () => {
  const scheduler = createScheduler()
  const capture = {
    id: 'capture:1',
    snapshot: { version: 2, value: 'captured' },
  }
  const releases = []
  const errors = []
  const storage = createStore()
  const persistence = createAppletPersistence({
    onError: (details) => errors.push(details),
    scheduler,
    scopeId: 'scope:a',
    source: {
      capture: () => capture,
      release(value) {
        releases.push(value)
        return false
      },
      subscribe: () => () => {},
    },
    store: storage.store,
  })

  assert.deepEqual(await persistence.flush(), { ok: true, wrote: true })
  assert.deepEqual(storage.writes, [{
    checkpoint: capture.snapshot,
    scopeId: 'scope:a',
  }])
  assert.deepEqual(releases, [capture])
  assert.equal(errors.length, 1)
  assert.equal(errors[0].operation, 'release')
  assert.equal(errors[0].scopeId, 'scope:a')
  assert.match(errors[0].error.message, /rejected its capture/)
  await persistence.dispose({ flush: false })
})

test('dispose unsubscribes, cancels pending work, and awaits a started write', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const pending = deferred()
  const storage = createStore({
    write: async () => pending.promise,
  })
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  scheduler.run()
  assert.equal(source.listenerCount, 1)
  const disposal = persistence.dispose({ flush: false })
  assert.equal(source.listenerCount, 0)
  source.update({ version: 2, value: 'late' })
  assert.equal(scheduler.size, 0)

  pending.resolve()
  assert.deepEqual(await disposal, { ok: true, wrote: true })
  assert.equal(source.captures.length, 1)
})

test('dispose flushes the newest observed checkpoint by default', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const storage = createStore()
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  source.update({ version: 2, value: 'latest' })
  const result = await persistence.dispose()

  assert.deepEqual(result, { ok: true, wrote: true })
  assert.equal(source.listenerCount, 0)
  assert.equal(scheduler.size, 0)
  assert.deepEqual(storage.writes, [{
    checkpoint: { version: 2, value: 'latest' },
    scopeId: 'scope:a',
  }])
})

test('discard waits for a started write and then removes the same scope', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const pending = deferred()
  const events = []
  const storage = createStore({
    async remove(options) {
      events.push(['remove', options])
    },
    async write(options) {
      events.push(['write-start', options])
      await pending.promise
      events.push(['write-end', options])
    },
  })
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  scheduler.run()
  source.update({ version: 2, value: 'must-not-write' })
  const discarded = persistence.discard()
  assert.deepEqual(events.map(([event]) => event), ['write-start'])

  pending.resolve()
  assert.deepEqual(await discarded, { ok: true, removed: true })
  assert.deepEqual(events.map(([event]) => event), [
    'write-start',
    'write-end',
    'remove',
  ])
  assert.deepEqual(events[2][1], { scopeId: 'scope:a' })
  assert.equal(source.captures.length, 1)
})

test('discard removes after a disposal that is already waiting on a write', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const pending = deferred()
  const events = []
  const storage = createStore({
    async remove() {
      events.push('remove')
    },
    async write() {
      events.push('write-start')
      await pending.promise
      events.push('write-end')
    },
  })
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  scheduler.run()
  const disposal = persistence.dispose({ flush: false })
  const discarded = persistence.discard()
  pending.resolve()

  assert.deepEqual(await disposal, { ok: true, wrote: true })
  assert.deepEqual(await discarded, { ok: true, removed: true })
  assert.deepEqual(events, ['write-start', 'write-end', 'remove'])
})

test('discard cancels a queued initial write before removing', async () => {
  const scheduler = createScheduler()
  const source = createSource({ version: 2, value: 'initial' })
  const storage = createStore()
  const persistence = createAppletPersistence({
    scheduler,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  })

  assert.equal(scheduler.size, 1)
  assert.deepEqual(await persistence.discard(), {
    ok: true,
    removed: true,
  })
  assert.equal(scheduler.size, 0)
  assert.equal(storage.writes.length, 0)
  assert.deepEqual(storage.removals, [{ scopeId: 'scope:a' }])
})

test('validates its source, store, scheduler, and scope contracts', () => {
  const source = createSource({ version: 2 })
  const storage = createStore()

  assert.throws(() => createAppletPersistence({
    scopeId: '',
    source: source.source,
    store: storage.store,
  }), /non-empty scopeId/)
  assert.throws(() => createAppletPersistence({
    scopeId: 'scope:a',
    source: {},
    store: storage.store,
  }), /source requires subscribe, capture, and release/)
  assert.throws(() => createAppletPersistence({
    scopeId: 'scope:a',
    source: source.source,
    store: {},
  }), /store requires read, write, and remove/)
  assert.throws(() => createAppletPersistence({
    debounceMs: -1,
    scopeId: 'scope:a',
    source: source.source,
    store: storage.store,
  }), /debounceMs must be non-negative/)
})
