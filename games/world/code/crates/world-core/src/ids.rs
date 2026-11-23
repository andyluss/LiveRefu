use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub struct EntityId {
    pub index: u32,
    pub generation: u32,
}

impl EntityId {
    pub const NONE: EntityId = EntityId {
        index: u32::MAX,
        generation: u32::MAX,
    };

    pub fn new(index: u32, generation: u32) -> Self {
        Self { index, generation }
    }

    pub fn is_none(self) -> bool {
        self == Self::NONE
    }

    /// ABI 用的打包形式：低 32 位 index，高 32 位 generation。
    pub fn pack(self) -> u64 {
        ((self.generation as u64) << 32) | self.index as u64
    }

    pub fn unpack(v: u64) -> Self {
        Self {
            index: (v & 0xFFFF_FFFF) as u32,
            generation: (v >> 32) as u32,
        }
    }
}

impl std::fmt::Display for EntityId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}v{}", self.index, self.generation)
    }
}
