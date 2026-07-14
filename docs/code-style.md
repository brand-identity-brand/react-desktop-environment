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
desktop-environment/
desktop-environment/ui/
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

- `window-manager` is a headless external state manager;
- `desktop-environment` consumes window-manager state and implements desktop
  behavior;
- `desktop-environment/ui` contains the desktop's visual components.

The window manager must not import React or render UI. React components,
component resolution, and outlet-like rendering mechanisms belong to the
consumer that uses them.

Do not introduce a shared abstraction merely because two implementations use
the same technology. Extract one only when the software architecture identifies
a stable shared responsibility.
