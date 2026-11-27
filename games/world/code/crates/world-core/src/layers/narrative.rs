//! L3 · Narrative: flags, quests, dialogue, conditions and scripts.
//!
//! Narrative observes lower-layer facts and emits commands/events. It never
//! mutates transforms, colliders, inventory or doors directly.

use crate::entity::Entity;
use crate::layers::subject;
use crate::script::ScriptHost;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use world_pack::{ConditionDef, DialogueDef, Pack, QuestDef, RuleDef};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct QuestState {
    pub active: bool,
    pub completed: bool,
    pub progress: BTreeMap<String, u32>,
}

pub(crate) struct Narrative {
    pub(crate) flags: BTreeMap<String, bool>,
    pub(crate) quests: BTreeMap<String, QuestState>,
    pub(crate) rules: Vec<RuleDef>,
    pub(crate) quest_defs: BTreeMap<String, QuestDef>,
    pub(crate) dialogues: BTreeMap<String, DialogueDef>,
    script_host: Option<Box<dyn ScriptHost>>,
    script_event_filter: Option<BTreeSet<String>>,
}

impl Narrative {
    pub fn new(pack: &Pack) -> Self {
        Self {
            flags: BTreeMap::new(),
            quests: BTreeMap::new(),
            rules: pack.rules.values().cloned().collect(),
            quest_defs: pack.quests.clone(),
            dialogues: pack.dialogues.clone(),
            script_host: None,
            script_event_filter: None,
        }
    }

    /// Returns true when the value actually changed.
    pub fn set_flag(&mut self, flag: &str, value: bool) -> bool {
        let old = self.flags.insert(flag.to_string(), value).unwrap_or(false);
        old != value
    }

    /// Returns true when a new quest was started.
    pub fn start_quest(&mut self, quest: &str) -> Result<bool, String> {
        if !self.quest_defs.contains_key(quest) {
            return Err(format!("任务不存在: {quest}"));
        }
        if let Some(state) = self.quests.get(quest) {
            if state.active || state.completed {
                return Ok(false);
            }
        }
        self.quests.insert(
            quest.to_string(),
            QuestState {
                active: true,
                completed: false,
                progress: BTreeMap::new(),
            },
        );
        Ok(true)
    }

    pub fn condition_ok(&self, condition: &ConditionDef, actor: &Entity) -> bool {
        match condition {
            ConditionDef::HasItem { item } => subject::has_item(actor, item),
            ConditionDef::Flag { flag, value } => {
                self.flags.get(flag).copied().unwrap_or(false) == *value
            }
            ConditionDef::QuestActive { quest } => {
                self.quests.get(quest).map(|q| q.active).unwrap_or(false)
            }
        }
    }

    pub fn dialogue(&self, id: &str) -> Option<&DialogueDef> {
        self.dialogues.get(id)
    }

    pub fn set_script_host(&mut self, host: Box<dyn ScriptHost>) {
        self.script_host = Some(host);
    }

    pub fn has_script_host(&self) -> bool {
        self.script_host.is_some()
    }

    pub fn set_script_event_filter<I, S>(&mut self, kinds: I)
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        self.script_event_filter = Some(kinds.into_iter().map(Into::into).collect());
    }

    pub fn should_run_script(&self, event_kind: &str) -> bool {
        if event_kind == "script_error" {
            return false;
        }
        self.script_event_filter
            .as_ref()
            .map(|filter| filter.contains(event_kind))
            .unwrap_or(true)
    }

    pub fn script_host_mut(&mut self) -> Option<&mut Box<dyn ScriptHost>> {
        self.script_host.as_mut()
    }
}
