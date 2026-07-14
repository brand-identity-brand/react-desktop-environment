# Code Style

## Organize by Software Architecture

The file structure should model the software architecture before it models the
technology used to implement it.

Top-level folders name important domain abstractions and responsibility
boundaries. They should answer what a group of code means in the system, not
whether the code happens to use React, hooks, SQL, Supabase, or another tool.

Prefer:

```text
window-manager/
  react/
compositor/
  createCompositor.js
  react/
ui/
```

Avoid technology-first top-level organization such as:

```text
react/
hooks/
database/
components/
```

Technology is implementation machinery. It may be used to organize code inside
an already named abstraction when that grouping is useful:

```text
important-abstraction/
  react/
  supabase/
```

If a group is important enough to be understood as its own abstraction or
public interface, give it a descriptive folder first. Implementation-specific
subfolders may then exist inside that boundary.

## Keep Boundaries Visible

Names and locations should reveal ownership:

- `window-manager` is a headless surface relationship engine;
- `window-manager/react` is its official React consumption interface;
- `compositor` consumes that interface, owns applications and windows, and
  coordinates their presentation;
- `ui` is the replaceable visual implementation of the compositor contract.

The headless window manager must not import React or render UI. Its optional
React interface depends on the headless manager, never the reverse. The
compositor must not import the default UI; consumers wire compatible UI into
the compositor.

Do not introduce a shared abstraction merely because two implementations use
the same technology. Extract one only when the software architecture identifies
a stable shared responsibility.

Responsibility-based names communicate intent better than technology-based
names. Use `compositor` for composition responsibilities rather than a generic
top-level `react` folder. Technology names may appear inside an already named
abstraction when they distinguish an implementation interface, as in
`window-manager/react`.

## State the Abstraction First

Every important abstraction begins by stating what it means in the framework.
Its `index.js` exports an `ABSTRACTION` string that describes the high-level
concept and its responsibility.

The statement must help a developer understand the framework before reading
its implementation. Describe meaning, ownership, relationships, and purpose.
Do not describe files, functions, libraries, syntax, or implementation tools.

Implementation details may change without changing the abstraction statement.
If the statement must change whenever code is reorganized, it is describing the
machinery rather than the concept.

## Preserve Record Ownership

Do not mutate, decorate, spread, or reshape objects returned by another
abstraction. Keep consumer-owned information in a consumer-owned record and
join the records through a stable key.

Prefer:

```js
const surface = managerSnapshot.surfaces[surfaceId]
const window = compositorSnapshot.windows[surfaceId]
```

Avoid:

```js
compositorSnapshot.windows[surfaceId] = {
  ...managerSnapshot.surfaces[surfaceId],
  zIndex: 10,
}
```

Returned snapshots are read-only by contract. State commands should replace
only changed records and preserve references to unchanged records. Do not use
full-record cloning or refreezing as a substitute for clear ownership and
structural sharing.

## Fail at Architectural Boundaries

Do not silently fall back when a requirement protects identity, relationships,
ownership, persistence, or another architectural invariant. A missing required
capability must fail immediately with a specific error.

Fallbacks are appropriate only when their behavior is intentionally equivalent.
They must not hide a broken environment or substitute weaker behavior near the
core of the system.
