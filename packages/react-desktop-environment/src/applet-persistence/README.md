# Applet checkpoint recovery

This storage-neutral boundary mirrors complete Root Applet checkpoints for
opaque host-selected scopes. Storage and lifecycle integrations remain with
the consumer; the live runtime is the state authority.

The storage-neutral entry does not own IndexedDB, SQLite, AsyncStorage, React,
GraphQL, service workers, or Applet presentation. Distribution assembly and
lifecycle integrations remain with their distribution. The separately
imported [IndexedDB adapter](./indexed-db/README.md) is a Chromium storage
adapter shared by Web and a later Electron host. The live Applet runtime
remains the only state authority; a store is a recovery mirror.

See [Applet runtime](../applet-engine/README.md) for the
runtime identities; host-facing save and departure behavior remain with the consumer.

## Public API

~~~js
import {
  createAppletPersistence,
  resolveInitialAppletCheckpoint,
} from 'react-desktop-environment/applet-persistence'
~~~

Chromium hosts can import the separate storage adapter without adding browser
technology to this entry:

~~~js
import {
  createIndexedDbAppletStore,
} from 'react-desktop-environment/applet-persistence/indexed-db'
~~~

The package works with the complete Root Applet `surfaceState[]` checkpoint.
Each Surface entry carries its own Window, Application, and Applet-state
segments; there is no second checkpoint object or parallel collection.

## Initial checkpoint resolution

The host resolves one checkpoint before creating its runtime:

~~~js
const initial = await resolveInitialAppletCheckpoint({
  scopeId: scopeId,
  localStore,
  globalCheckpoint: globalCheckpoint,
  onError,
})
~~~

The resolver accepts the direct Surface-state array. It does not create an
AppletEngine, rewrite entries, remove relationships, or manufacture registered
defaults. The one live AppletEngine receives the selected array and each
current owner adopts the values it recognizes.

A host continuing its exact prepared replacement supplies the optional
`preparedCheckpoint` array. The resolver selects that whole array before
reading the ordinary mirror and returns `origin: 'prepared'`. An empty prepared
array is selected unchanged: it lets the runtime supply registered defaults
for that prepared subject without falling through to another checkpoint.
The host owns whether a preparation belongs to this continuation and when it
is adopted or cancelled; no transition or storage identity enters the array.
An explicitly supplied non-array prepared value is rejected.

With `preparedCheckpoint` omitted or `undefined`, ordinary recovery is
whole-checkpoint selection, never a merge:

1. a nonempty local checkpoint array;
2. a nonempty supplied global checkpoint array; or
3. `undefined`, which tells the host to create registered defaults.

For those ordinary candidates, `null` and `[]` both supply no saved state.
Reading the local store or selecting a non-array ordinary candidate may fail
without preventing fallback.
`onError` receives `{ error, operation, origin, scopeId }` for those failures.
Resolution does not write to the local store.

When prepared or ordinary local recovery wins, the result also carries the
direct global array as `cleanCheckpoint`, or `null` when the host
supplies no saved state. Prepared recovery therefore does not become the
global clean baseline. The resolver does not transform either array.

## Runtime persistence

After the host creates a runtime, it binds that runtime's checkpoint source to
the same local store:

~~~js
const persistence = createAppletPersistence({
  scopeId: scopeId,
  source: engine.checkpoint,
  store: localStore,
  debounceMs: 300,
  onError,
})
~~~

The checkpoint source contract is:

~~~text
subscribe(listener) -> synchronous unsubscribe function
capture()            -> { snapshot }
release(capture)     -> synchronous completion
~~~

The storage adapter contract is:

~~~text
read({ scopeId })              -> Promise<checkpoint | null>
write({ scopeId, checkpoint }) -> Promise<void>
remove({ scopeId })            -> Promise<void>
~~~

Every storage operation may be asynchronous. IndexedDB, SQLite, AsyncStorage,
a native file, or a test double can implement the same contract. The adapter
unwraps any physical record envelope before returning its checkpoint from
`read`, and owns its schema, transactions, timestamps, quotas, and
database-specific error translation.

One controller is permanently scoped to one identity and one checkpoint
source. A host switching scope or runtime disposes the old controller and
creates another instead of changing the meaning of an in-flight operation.

The controller schedules one initial write, then debounces source change
notifications. Writes never overlap. Changes arriving during a write are
coalesced into one follow-up capture of the newest runtime state. Every capture
is released exactly once after its write succeeds or fails.

~~~js
await persistence.flush()
~~~

Finish the controller with one terminal action:

~~~js
await persistence.dispose({ flush: true })
~~~

Or permanently remove this local checkpoint instead:

~~~js
await persistence.discard()
~~~

`flush()` persists through the source revision visible when it was called.
`dispose()` is terminal, unsubscribes first, and optionally flushes before
finishing. `discard()` is terminal, does not capture queued state, waits for an
already-started write, and then removes the stored checkpoint so that an older
write cannot recreate it. Discard is the stronger terminal action: if disposal
has already started, discard waits for it and still removes the checkpoint.

These methods return explicit results:

~~~text
{ ok: true, wrote: boolean }
{ ok: true, removed: true }
{ ok: false, error }
~~~

Automatic write failures are reported through `onError` and do not create
unhandled promise rejections. They do not spin-retry; the next source change or
explicit `flush()` retries the current state. Errors thrown by `onError` are
ignored so diagnostics cannot become a second persistence failure.

Local writes deliberately never mark a Root Applet checkpoint clean. The
[Applet checkpoint contract](../applet-engine/README.md#surface-state-and-root-checkpoints)
owns baseline initialization, lifetime default supply, and exact explicit-save
replacement. Local persistence only mirrors the live runtime.

Distribution lifecycle events such as browser visibility, Electron shutdown,
or Expo backgrounding are adapters around `flush()` and remain outside this
package.

## Verification

~~~sh
npm test --workspace react-desktop-environment -- applet-persistence
~~~
