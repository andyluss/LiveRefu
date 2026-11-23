use serde::{Deserialize, Serialize};

/// SplitMix64：小、快、状态可序列化；M0 只要求可复现，不要求密码学强度。
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Rng {
    pub seed: u64,
    pub state: u64,
}

impl Rng {
    pub fn new(seed: u64) -> Self {
        Self { seed, state: seed }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    pub fn next_u32(&mut self) -> u32 {
        (self.next_u64() >> 32) as u32
    }

    pub fn next_f32(&mut self) -> f32 {
        // [0, 1)
        (self.next_u32() as f32) / (u32::MAX as f32 + 1.0)
    }
}
