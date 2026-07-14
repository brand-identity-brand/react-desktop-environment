export const ABSTRACTION = `
The compositor gives presentation meaning to applications and surfaces.

It brings application content, surface relationships, and desktop state together
into a coherent environment. It determines what is presented, where related
surfaces belong, and which capabilities are available to the presentation.

The compositor owns the desktop experience as a whole while remaining separate
from its visual appearance. It allows a replaceable interface to present and
control that experience without owning its meaning or state.

The compositor is the director and facilitator between the window manager and
the interface. Like a manufacturer assembling independently sourced parts into
a complete system, its greatest value is how it coordinates the capabilities it
receives and makes them meaningful together.

An interface may use as many or as few compositor capabilities as it needs. The
compositor remains valid when some capabilities are unused; the interface simply
does not provide the features associated with them.
`
