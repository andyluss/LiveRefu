use crate::command::Command;
use crate::ids::EntityId;
use crate::world::World;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Trace {
    pub ticks: u64,
    #[serde(default)]
    pub steps: Vec<TraceStep>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TraceStep {
    pub tick: u64,
    pub command: TraceCommand,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum TraceCommand {
    Interact {
        actor: String,
        target: String,
    },
    Talk {
        actor: String,
        target: String,
    },
    ChooseDialogue {
        dialogue: String,
        node: String,
        choice: usize,
    },
    SocialAction {
        actor: String,
        target: String,
        action: String,
    },
    Pickup {
        actor: String,
        target: String,
    },
    GiveItem {
        actor: String,
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
        actor: Option<String>,
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
        actor: String,
        x: f32,
        z: f32,
    },
    MoveTo {
        actor: String,
        x: f32,
        z: f32,
    },
}

impl TraceCommand {
    pub fn resolve(&self, world: &World) -> Result<Command, String> {
        Ok(match self {
            TraceCommand::Interact { actor, target } => Command::Interact {
                actor: find(world, actor)?,
                target: find(world, target)?,
            },
            TraceCommand::Talk { actor, target } => Command::Talk {
                actor: find(world, actor)?,
                target: find(world, target)?,
            },
            TraceCommand::ChooseDialogue {
                dialogue,
                node,
                choice,
            } => Command::ChooseDialogue {
                dialogue: dialogue.clone(),
                node: node.clone(),
                choice: *choice,
            },
            TraceCommand::SocialAction {
                actor,
                target,
                action,
            } => Command::SocialAction {
                actor: find(world, actor)?,
                target: Some(find(world, target)?),
                action: action.clone(),
            },
            TraceCommand::Pickup { actor, target } => Command::Pickup {
                actor: find(world, actor)?,
                target: find(world, target)?,
            },
            TraceCommand::GiveItem { actor, item, count } => Command::GiveItem {
                actor: find(world, actor)?,
                item: item.clone(),
                count: *count,
            },
            TraceCommand::SetFlag { flag, value } => Command::SetFlag {
                flag: flag.clone(),
                value: *value,
            },
            TraceCommand::StartQuest { quest } => Command::StartQuest {
                quest: quest.clone(),
            },
            TraceCommand::Toast { actor, text } => Command::Toast {
                actor: actor.as_deref().map(|id| find(world, id)).transpose()?,
                text: text.clone(),
            },
            TraceCommand::PlaySound { id } => Command::PlaySound { id: id.clone() },
            TraceCommand::Emit { event } => Command::Emit {
                event: event.clone(),
            },
            TraceCommand::ActivateZone { zone } => Command::ActivateZone { zone: zone.clone() },
            TraceCommand::Move { actor, x, z } => Command::Move {
                actor: find(world, actor)?,
                x: *x,
                z: *z,
            },
            TraceCommand::MoveTo { actor, x, z } => Command::MoveTo {
                actor: find(world, actor)?,
                x: *x,
                z: *z,
            },
        })
    }
}

fn find(world: &World, content_id: &str) -> Result<EntityId, String> {
    world
        .find_by_content_id(content_id)
        .ok_or_else(|| format!("trace 中引用了不存在的内容实体: {content_id}"))
}
