//! L2 · Agency: schedules and behavior intent.
//!
//! The layer owns schedule definitions and decides behavior from world time.
//! It does not mutate entities or know about quests/dialogue.

use crate::store::ScheduleView;
use crate::ids::EntityId;
use std::collections::BTreeMap;
use world_pack::{parse_hhmm, ScheduleDef};

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct BehaviorChange {
    pub id: EntityId,
    pub content_id: String,
    pub behavior: String,
}

#[derive(Clone, Debug)]
pub(crate) struct Agency {
    schedules: BTreeMap<String, ScheduleDef>,
}

impl Agency {
    pub fn new(schedules: BTreeMap<String, ScheduleDef>) -> Self {
        Self { schedules }
    }

    /// Compute deterministic behavior changes for the current clock minute.
    pub fn changes<'a>(
        &self,
        minute: u32,
        entities: impl Iterator<Item = ScheduleView<'a>>,
    ) -> Vec<BehaviorChange> {
        let mut updates = Vec::new();
        for entity in entities {
            let schedule_id = entity.schedule;
            let Some(schedule) = self.schedules.get(schedule_id) else {
                continue;
            };
            let Some(behavior) = behavior_at(schedule, minute) else {
                continue;
            };
            if entity.behavior != Some(behavior.as_str()) {
                updates.push(BehaviorChange {
                    id: entity.id,
                    content_id: entity.content_id.to_string(),
                    behavior,
                });
            }
        }
        updates
    }
}

fn behavior_at(schedule: &ScheduleDef, minute: u32) -> Option<String> {
    for entry in &schedule.entries {
        let from = parse_hhmm(&entry.from)?;
        let to = parse_hhmm(&entry.to)?;
        let inside = if from <= to {
            minute >= from && minute < to
        } else {
            minute >= from || minute < to
        };
        if inside {
            return Some(entry.behavior.clone());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::{Collider, Entity, EntityKind, Transform};
    use crate::store::EntityStore;
    use world_pack::{ScheduleDef, ScheduleEntry};

    fn actor(behavior: Option<&str>) -> Entity {
        Entity {
            id: EntityId { index: 7, generation: 0 },
            content_id: "npc".into(),
            persistent_id: Some("npc".into()),
            kind: EntityKind::Actor,
            transform: Transform::new([0.0, 0.0, 0.0], 0.0),
            tags: vec![],
            health: 100,
            speed: 1.0,
            inventory: vec![],
            interactable: None,
            door: None,
            schedule: Some("schedule.day".into()),
            behavior: behavior.map(str::to_string),
            dialogue: None,
            collider: Some(Collider::Circle { radius: 0.35 }),
        }
    }

    fn schedule() -> ScheduleDef {
        ScheduleDef {
            id: "schedule.day".into(),
            entries: vec![
                ScheduleEntry { from: "08:00".into(), to: "18:00".into(), behavior: "work".into(), at: None },
                ScheduleEntry { from: "18:00".into(), to: "08:00".into(), behavior: "rest".into(), at: None },
            ],
        }
    }

    #[test]
    fn plans_behavior_once() {
        let mut map = BTreeMap::new();
        map.insert("schedule.day".into(), schedule());
        let agency = Agency::new(map);
        let mut store = EntityStore::default();
        let id = store.spawn(actor(None));
        let _ = store.get(id);
        let changes = agency.changes(9 * 60, store.schedules());
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].behavior, "work");
        let mut store2 = EntityStore::default();
        let id2 = store2.spawn(actor(Some("work")));
        let _ = store2.get(id2);
        assert!(agency.changes(9 * 60, store2.schedules()).is_empty());
    }

    #[test]
    fn handles_overnight_windows() {
        let mut map = BTreeMap::new();
        map.insert("schedule.day".into(), schedule());
        let agency = Agency::new(map);
        let mut store = EntityStore::default();
        let id = store.spawn(actor(None));
        let _ = store.get(id);
        assert_eq!(agency.changes(23 * 60, store.schedules())[0].behavior, "rest");
        assert_eq!(agency.changes(2 * 60, store.schedules())[0].behavior, "rest");
    }
}
