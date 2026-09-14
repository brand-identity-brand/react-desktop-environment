# IndexedDB Applet persistence

This explicit browser-technology subpath adapts IndexedDB to the
[storage-neutral Applet persistence contract](../README.md). Web and a later
Chromium-based Electron renderer can consume the same adapter while retaining
separate origin- and profile-scoped physical databases.

~~~js
import {
  createIndexedDbAppletStore,
} from 'react-desktop-environment/applet-persistence/indexed-db'

const localStore = createIndexedDbAppletStore({ databaseName: 'my-application-checkpoints' })
~~~

The adapter uses the native `globalThis.indexedDB` factory by default. A host
or test can supply another compatible factory through the `indexedDB` option.
An unavailable factory rejects storage operations so checkpoint resolution can
report the failure and fall back to the supplied global checkpoint or defaults.

The `databaseName` option selects the host's physical database. Hosts migrating
existing records retain their existing name; the adapter opens the same
version-one schema and reads its records unchanged. Omission uses the package
default below.

## Physical schema

Database `react-desktop-environment-applet-persistence` version 1 contains one
`checkpoints` object store keyed by `scopeId`. Each record is:

~~~js
{
  scopeId,
  checkpoint,
}
~~~

`scopeId` is an opaque identity supplied by the host. The stored
checkpoint remains the complete Root Applet checkpoint owned by
[Applet runtime](../../applet-engine/README.md#surface-state-and-root-checkpoints).
The physical database version belongs to this adapter; it does not version,
validate, merge, or modify the runtime checkpoint.

Writes replace one complete scoped record in a read-write transaction. Reads
unwrap that record, and removals delete only that scope. Each operation settles
after its transaction commits or aborts.
