//! L1 · Subject interaction: inventory, doors and item transfer.
//!
//! This layer owns the interaction rules around subjects. It does not know
//! quests, flags, dialogue text, schedules or the renderer.

use crate::entity::{Entity, EntityKind};
use crate::store::EntityMut;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DoorInteraction {
    NoDoor,
    AlreadyOpen,
    Opened,
    Locked,
}

pub(crate) fn has_item(entity: &Entity, item: &str) -> bool {
    entity.inventory.iter().any(|s| s.item == item && s.count > 0)
}

pub(crate) fn give_item(entity: &mut Entity, item: &str, count: u32) {
    if count == 0 {
        return;
    }
    if let Some(stack) = entity.inventory.iter_mut().find(|s| s.item == item) {
        stack.count = stack.count.saturating_add(count);
    } else {
        entity.inventory.push(crate::entity::ItemStack {
            item: item.to_string(),
            count,
        });
    }
}

#[allow(dead_code)]
pub(crate) fn take_item(entity: &mut Entity, item: &str, count: u32) -> bool {
    if count == 0 {
        return false;
    }
    let Some(stack) = entity.inventory.iter_mut().find(|s| s.item == item) else {
        return false;
    };
    if stack.count < count {
        return false;
    }
    stack.count -= count;
    if stack.count == 0 {
        entity.inventory.retain(|s| s.count > 0);
    }
    true
}

/// Open a door without inventory/lock checks. Used by the ABI/command path.
#[cfg(test)]
pub(crate) fn force_open_door(target: &mut Entity) -> bool {
    let Some(door) = target.door.as_mut() else {
        return false;
    };
    door.open = true;
    true
}

/// Resolve an `Interact` against a door, including the locked_by item check.
#[cfg(test)]
pub(crate) fn interact_door(actor: &Entity, target: &mut Entity) -> DoorInteraction {
    let Some(door) = target.door.as_ref() else {
        return DoorInteraction::NoDoor;
    };
    if door.open {
        return DoorInteraction::AlreadyOpen;
    }
    let allowed = match &door.locked_by {
        None => true,
        Some(item) => has_item(actor, item),
    };
    if !allowed {
        return DoorInteraction::Locked;
    }
    if let Some(door) = target.door.as_mut() {
        door.open = true;
    }
    DoorInteraction::Opened
}

/// Validate and perform pickup into the actor inventory. Returns the item id.
#[cfg(test)]
pub(crate) fn pickup_item(actor: &mut Entity, target: &Entity) -> Result<String, String> {
    if target.kind != EntityKind::Item {
        return Err(format!("target 不是可拾取物品: {:?}", target.id));
    }
    let item = target.content_id.clone();
    give_item(actor, &item, 1);
    Ok(item)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::{Collider, Door, Entity, EntityKind, ItemStack, Transform};
    use crate::ids::EntityId;

    fn e(kind: EntityKind, inventory: Vec<ItemStack>) -> Entity {
        Entity {
            id: EntityId { index: 1, generation: 0 },
            content_id: "x".into(),
            persistent_id: Some("x".into()),
            kind,
            transform: Transform::new([0.0, 0.0, 0.0], 0.0),
            tags: vec![],
            health: 100,
            speed: 1.0,
            inventory,
            interactable: None,
            door: None,
            schedule: None,
            behavior: None,
            dialogue: None,
            collider: Some(Collider::Circle { radius: 0.35 }),
        }
    }

    #[test]
    fn inventory_roundtrip() {
        let mut actor = e(EntityKind::Player, vec![]);
        assert!(!has_item(&actor, "key"));
        give_item(&mut actor, "key", 2);
        assert!(has_item(&actor, "key"));
        assert!(take_item(&mut actor, "key", 1));
        assert!(has_item(&actor, "key"));
        assert!(take_item(&mut actor, "key", 1));
        assert!(!has_item(&actor, "key"));
    }

    #[test]
    fn locked_door_needs_item() {
        let actor = e(EntityKind::Player, vec![]);
        let mut door = e(EntityKind::Prop, vec![]);
        door.door = Some(Door { open: false, locked_by: Some("key".into()) });
        assert_eq!(interact_door(&actor, &mut door), DoorInteraction::Locked);
        assert_eq!(door.door.as_ref().unwrap().open, false);
    }

    #[test]
    fn unlocked_door_opens_once() {
        let actor = e(EntityKind::Player, vec![]);
        let mut door = e(EntityKind::Prop, vec![]);
        door.door = Some(Door { open: false, locked_by: None });
        assert_eq!(interact_door(&actor, &mut door), DoorInteraction::Opened);
        assert_eq!(interact_door(&actor, &mut door), DoorInteraction::AlreadyOpen);
    }
}

// --- mutable column views (runtime) ---

pub(crate) fn give_item_mut(entity: &mut EntityMut<'_>, item: &str, count: u32) {
    if count == 0 { return; }
    if let Some(stack) = entity.inventory.iter_mut().find(|s| s.item == item) {
        stack.count = stack.count.saturating_add(count);
    } else {
        entity.inventory.push(crate::entity::ItemStack { item: item.to_string(), count });
    }
}

pub(crate) fn force_open_door_mut(target: &mut EntityMut<'_>) -> bool {
    let Some(door) = target.door.as_mut() else { return false; };
    door.open = true;
    true
}

pub(crate) fn interact_door_mut(actor: &Entity, target: &mut EntityMut<'_>) -> DoorInteraction {
    let Some(door) = target.door.as_ref() else { return DoorInteraction::NoDoor; };
    if door.open { return DoorInteraction::AlreadyOpen; }
    let allowed = match &door.locked_by {
        None => true,
        Some(item) => has_item(actor, item),
    };
    if !allowed { return DoorInteraction::Locked; }
    if let Some(door) = target.door.as_mut() { door.open = true; }
    DoorInteraction::Opened
}

pub(crate) fn pickup_item_mut(actor: &mut EntityMut<'_>, target: &Entity) -> Result<String, String> {
    if target.kind != EntityKind::Item {
        return Err(format!("target 不是可拾取物品: {:?}", target.id));
    }
    let item = target.content_id.clone();
    give_item_mut(actor, &item, 1);
    Ok(item)
}
