use crate::ids::EntityId;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum Command {
    Interact {
        actor: EntityId,
        target: EntityId,
    },
    Talk {
        actor: EntityId,
        target: EntityId,
    },
    Pickup {
        actor: EntityId,
        target: EntityId,
    },
    GiveItem {
        actor: EntityId,
        item: String,
        count: u32,
    },
    SetFlag {
        flag: String,
        value: bool,
    },
    StartQuest {
        quest: String,
    },
    Toast {
        #[serde(default)]
        actor: Option<EntityId>,
        text: String,
    },
    PlaySound {
        id: String,
    },
    Emit {
        event: String,
    },
    ActivateZone {
        zone: String,
    },
    Move {
        actor: EntityId,
        x: f32,
        z: f32,
    },
    MoveTo {
        actor: EntityId,
        x: f32,
        z: f32,
    },
    OpenDoor {
        target: EntityId,
    },
}
