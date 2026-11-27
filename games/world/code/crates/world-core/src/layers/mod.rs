//! Kernel layers.
//!
//! Dependency direction: `narrative` -> `agency` -> `subject` -> `spacetime`.
//! Lower layers never import upper layers. `World` is the composition root.

pub(crate) mod spacetime;
