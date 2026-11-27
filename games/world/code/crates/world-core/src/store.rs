//! Component columns for entities.
//!
//! Runtime state is stored in per-component columns (SoA). The public `Entity`
//! struct is retained as the snapshot/C-ABI DTO so `Snapshot` JSON and the
//! golden state hash stay byte-for-byte compatible.

use crate::entity::{
    Collider, Door, Entity, EntityKind, Interactable, ItemStack, Transform,
};
use crate::ids::EntityId;

#[derive(Clone, Debug)]
struct EntityCore {
    id: EntityId,
    content_id: String,
    persistent_id: Option<String>,
    kind: EntityKind,
    tags: Vec<String>,
    health: i32,
}

/// Read-only, flattened view over one entity's component columns.
pub struct EntityView<'a> {
    pub id: EntityId,
    pub content_id: &'a str,
    pub persistent_id: &'a Option<String>,
    pub kind: EntityKind,
    pub tags: &'a Vec<String>,
    pub health: i32,
    pub transform: &'a Transform,
    pub collider: &'a Option<Collider>,
    pub speed: f32,
    pub inventory: &'a Vec<ItemStack>,
    pub interactable: &'a Option<Interactable>,
    pub door: &'a Option<Door>,
    pub schedule: &'a Option<String>,
    pub behavior: &'a Option<String>,
    pub dialogue: &'a Option<String>,
}

/// Mutable, flattened view over one entity's component columns.
pub struct EntityMut<'a> {
    pub id: EntityId,
    pub content_id: &'a mut String,
    pub persistent_id: &'a mut Option<String>,
    pub kind: EntityKind,
    pub tags: &'a mut Vec<String>,
    pub health: &'a mut i32,
    pub transform: &'a mut Transform,
    pub collider: &'a mut Option<Collider>,
    pub speed: &'a mut f32,
    pub inventory: &'a mut Vec<ItemStack>,
    pub interactable: &'a mut Option<Interactable>,
    pub door: &'a mut Option<Door>,
    pub schedule: &'a mut Option<String>,
    pub behavior: &'a mut Option<String>,
    pub dialogue: &'a mut Option<String>,
}

#[derive(Default)]
pub(crate) struct EntityStore {
    core: Vec<Option<EntityCore>>,
    transform: Vec<Option<Transform>>,
    collider: Vec<Option<Collider>>,
    speed: Vec<Option<f32>>,
    inventory: Vec<Option<Vec<ItemStack>>>,
    interactable: Vec<Option<Interactable>>,
    door: Vec<Option<Door>>,
    schedule: Vec<Option<String>>,
    behavior: Vec<Option<String>>,
    dialogue: Vec<Option<String>>,
    generation: Vec<u32>,
    free: Vec<u32>,
}

impl EntityStore {


    pub fn get(&self, id: EntityId) -> Option<EntityView<'_>> {
        self.view(id.index as usize)
    }

    pub fn get_mut(&mut self, id: EntityId) -> Option<EntityMut<'_>> {
        let i = id.index as usize;
        if *self.generation.get(i)? != id.generation {
            return None;
        }
        let core = self.core.get_mut(i)?.as_mut()?;
        Some(EntityMut {
            id: core.id,
            content_id: &mut core.content_id,
            persistent_id: &mut core.persistent_id,
            kind: core.kind,
            tags: &mut core.tags,
            health: &mut core.health,
            transform: self.transform.get_mut(i)?.as_mut()?,
            collider: self.collider.get_mut(i)?,
            speed: self.speed.get_mut(i)?.as_mut()?,
            inventory: self.inventory.get_mut(i)?.as_mut()?,
            interactable: self.interactable.get_mut(i)?,
            door: self.door.get_mut(i)?,
            schedule: self.schedule.get_mut(i)?,
            behavior: self.behavior.get_mut(i)?,
            dialogue: self.dialogue.get_mut(i)?,
        })
    }

    pub fn iter(&self) -> impl Iterator<Item = EntityView<'_>> + '_ {
        (0..self.core.len()).filter_map(|i| self.view(i))
    }

    pub fn spawn(&mut self, mut entity: Entity) -> EntityId {
        let index = if let Some(index) = self.free.pop() {
            let slot = index as usize;
            self.generation[slot] = self.generation[slot].wrapping_add(1);
            index
        } else {
            let index = self.generation.len() as u32;
            self.generation.push(0);
            self.core.push(None);
            self.transform.push(None);
            self.collider.push(None);
            self.speed.push(None);
            self.inventory.push(None);
            self.interactable.push(None);
            self.door.push(None);
            self.schedule.push(None);
            self.behavior.push(None);
            self.dialogue.push(None);
            index
        };
        let i = index as usize;
        let id = EntityId::new(index, self.generation[i]);
        entity.id = id;
        self.core[i] = Some(EntityCore {
            id,
            content_id: entity.content_id,
            persistent_id: entity.persistent_id,
            kind: entity.kind,
            tags: entity.tags,
            health: entity.health,
        });
        self.transform[i] = Some(entity.transform);
        self.collider[i] = entity.collider;
        self.speed[i] = Some(entity.speed);
        self.inventory[i] = Some(entity.inventory);
        self.interactable[i] = entity.interactable;
        self.door[i] = entity.door;
        self.schedule[i] = entity.schedule;
        self.behavior[i] = entity.behavior;
        self.dialogue[i] = entity.dialogue;
        id
    }

    pub fn despawn(&mut self, id: EntityId) -> Option<Entity> {
        let i = id.index as usize;
        if *self.generation.get(i)? != id.generation {
            return None;
        }
        let core = self.core.get_mut(i)?.take()?;
        let entity = Entity {
            id: core.id,
            content_id: core.content_id,
            persistent_id: core.persistent_id,
            kind: core.kind,
            transform: self.transform[i].take()?,
            tags: core.tags,
            health: core.health,
            speed: self.speed[i].take()?,
            inventory: self.inventory[i].take().unwrap_or_default(),
            interactable: self.interactable[i].take(),
            door: self.door[i].take(),
            schedule: self.schedule[i].take(),
            behavior: self.behavior[i].take(),
            dialogue: self.dialogue[i].take(),
            collider: self.collider[i].take(),
        };
        self.generation[i] = self.generation[i].wrapping_add(1);
        self.free.push(id.index);
        Some(entity)
    }

    pub fn to_entities(&self) -> Vec<Entity> {
        let mut entities: Vec<Entity> = self.iter().map(Entity::from).collect();
        entities.sort_by_key(|e| e.id);
        entities
    }

    pub fn from_entities(&mut self, entities: Vec<Entity>) {
        *self = Self::default();
        let Some(max_index) = entities.iter().map(|e| e.id.index).max() else {
            return;
        };
        let n = max_index as usize + 1;
        self.core.resize_with(n, || None);
        self.transform.resize_with(n, || None);
        self.collider.resize_with(n, || None);
        self.speed.resize_with(n, || None);
        self.inventory.resize_with(n, || None);
        self.interactable.resize_with(n, || None);
        self.door.resize_with(n, || None);
        self.schedule.resize_with(n, || None);
        self.behavior.resize_with(n, || None);
        self.dialogue.resize_with(n, || None);
        self.generation.resize(n, 0);
        for entity in entities {
            let i = entity.id.index as usize;
            self.generation[i] = entity.id.generation;
            self.core[i] = Some(EntityCore {
                id: entity.id,
                content_id: entity.content_id,
                persistent_id: entity.persistent_id,
                kind: entity.kind,
                tags: entity.tags,
                health: entity.health,
            });
            self.transform[i] = Some(entity.transform);
            self.collider[i] = entity.collider;
            self.speed[i] = Some(entity.speed);
            self.inventory[i] = Some(entity.inventory);
            self.interactable[i] = entity.interactable;
            self.door[i] = entity.door;
            self.schedule[i] = entity.schedule;
            self.behavior[i] = entity.behavior;
            self.dialogue[i] = entity.dialogue;
        }
        for i in 0..n {
            if self.core[i].is_none() {
                self.free.push(i as u32);
            }
        }
    }

    fn view(&self, i: usize) -> Option<EntityView<'_>> {
        let core = self.core.get(i)?.as_ref()?;
        if *self.generation.get(i)? != core.id.generation {
            return None;
        }
        Some(EntityView {
            id: core.id,
            content_id: &core.content_id,
            persistent_id: &core.persistent_id,
            kind: core.kind,
            tags: &core.tags,
            health: core.health,
            transform: self.transform.get(i)?.as_ref()?,
            collider: self.collider.get(i)?,
            speed: *self.speed.get(i)?.as_ref()?,
            inventory: self.inventory.get(i)?.as_ref()?,
            interactable: self.interactable.get(i)?,
            door: self.door.get(i)?,
            schedule: self.schedule.get(i)?,
            behavior: self.behavior.get(i)?,
            dialogue: self.dialogue.get(i)?,
        })
    }
}

impl From<EntityView<'_>> for Entity {
    fn from(v: EntityView<'_>) -> Self {
        Entity {
            id: v.id,
            content_id: v.content_id.to_string(),
            persistent_id: v.persistent_id.clone(),
            kind: v.kind,
            transform: v.transform.clone(),
            tags: v.tags.clone(),
            health: v.health,
            speed: v.speed,
            inventory: v.inventory.clone(),
            interactable: v.interactable.clone(),
            door: v.door.clone(),
            schedule: v.schedule.clone(),
            behavior: v.behavior.clone(),
            dialogue: v.dialogue.clone(),
            collider: v.collider.clone(),
        }
    }
}

pub(crate) struct ScheduleView<'a> {
    pub id: EntityId,
    pub content_id: &'a str,
    pub schedule: &'a str,
    pub behavior: Option<&'a str>,
}

impl EntityStore {
    /// Hot-path view for kinematics: avoids materializing full EntityView columns.


    /// Allocation-free hot path: caller reuses its obstacle buffer.
    pub(crate) fn for_each_obstacle<F>(&self, exclude: EntityId, mut f: F)
    where
        F: FnMut([f32; 3], Option<Collider>, bool),
    {
        for i in 0..self.core.len() {
            let Some(core) = self.core[i].as_ref() else { continue; };
            if core.id == exclude || core.kind == EntityKind::Item { continue; }
            let Some(transform) = self.transform[i].as_ref() else { continue; };
            let open = self.door[i].as_ref().map(|d| d.open).unwrap_or(false);
            f(transform.position, self.collider[i].clone(), open);
        }
    }

    pub(crate) fn schedules(&self) -> impl Iterator<Item = ScheduleView<'_>> + '_ {
        (0..self.core.len()).filter_map(|i| {
            let core = self.core[i].as_ref()?;
            Some(ScheduleView {
                id: core.id,
                content_id: &core.content_id,
                schedule: self.schedule[i].as_deref()?,
                behavior: self.behavior[i].as_deref(),
            })
        })
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::{Collider, EntityKind, Transform};

    fn entity(content_id: &str) -> Entity {
        Entity {
            id: EntityId::NONE,
            content_id: content_id.into(),
            persistent_id: Some(content_id.into()),
            kind: EntityKind::Actor,
            transform: Transform::new([1.0, 0.0, 2.0], 0.5),
            tags: vec!["test".into()],
            health: 100,
            speed: 3.0,
            inventory: vec![],
            interactable: None,
            door: None,
            schedule: Some("schedule.test".into()),
            behavior: None,
            dialogue: None,
            collider: Some(Collider::Circle { radius: 0.35 }),
        }
    }

    #[test]
    fn columns_roundtrip_and_generation() {
        let mut store = EntityStore::default();
        let id = store.spawn(entity("npc"));
        assert_eq!(store.iter().count(), 1);
        assert_eq!(store.get(id).unwrap().transform.position, [1.0, 0.0, 2.0]);
        {
            let mut view = store.get_mut(id).unwrap();
            *view.behavior = Some("work".into());
            view.inventory.push(ItemStack { item: "key".into(), count: 1 });
        }
        let dtos = store.to_entities();
        assert_eq!(dtos[0].behavior.as_deref(), Some("work"));
        assert_eq!(dtos[0].inventory.len(), 1);
        assert!(store.despawn(id).is_some());
        assert_eq!(store.iter().count(), 0);
        assert!(store.get(id).is_none());
    }
}
