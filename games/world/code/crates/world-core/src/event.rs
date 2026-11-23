use crate::ids::EntityId;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EventEnvelope {
    pub seq: u64,
    pub tick: u64,
    pub kind: String,
    pub source: Option<EntityId>,
    pub data: Value,
}

impl EventEnvelope {
    pub fn kind(&self) -> &str {
        &self.kind
    }
}
