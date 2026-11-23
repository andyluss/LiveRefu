use crate::command::Command;
use crate::entity::{Collider, Door, Entity, EntityKind, Interactable, ItemStack, Transform};
use crate::event::EventEnvelope;
use crate::ids::EntityId;
use crate::nav;
use crate::rng::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use world_pack::{
    parse_hhmm, ActionDef, ActorDef, ConditionDef, DialogueDef, ItemDef, ObjectiveDef, Pack,
    PropDef, QuestDef, RewardDef, RuleDef, ScheduleDef,
};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct QuestState {
    pub active: bool,
    pub completed: bool,
    pub progress: BTreeMap<String, u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Snapshot {
    pub tick: u64,
    pub clock_minutes: u32,
    pub seed: u64,
    pub rng_state: u64,
    pub flags: BTreeMap<String, bool>,
    pub quests: BTreeMap<String, QuestState>,
    pub entities: Vec<Entity>,
    pub player: EntityId,
    pub zone_id: String,
    pub suspended: bool,
    pub timescale_milli: i64,
    #[serde(default)]
    pub move_intent: [f32; 2],
    #[serde(default)]
    pub path: Vec<[f32; 2]>,
    #[serde(default)]
    pub path_index: usize,
}

#[derive(Clone, Debug)]
struct Slot {
    generation: u32,
    entity: Option<Entity>,
}

pub struct World {
    pub tick: u64,
    pub tick_hz: u32,
    pub start_minutes: u32,
    pub clock_minutes: u32,
    pub seed: u64,
    pub rng: Rng,
    slots: Vec<Slot>,
    free: Vec<u32>,
    pub flags: BTreeMap<String, bool>,
    pub quests: BTreeMap<String, QuestState>,
    pub events: Vec<EventEnvelope>,
    pub event_seq: u64,
    pending: Vec<Command>,
    pub player: EntityId,
    pub zone_id: String,
    rules: Vec<RuleDef>,
    schedules: BTreeMap<String, ScheduleDef>,
    quest_defs: BTreeMap<String, QuestDef>,
    dialogues: BTreeMap<String, DialogueDef>,
    loc: BTreeMap<String, String>,
    pub pack_id: String,
    pub pack_version: String,
    pub pack_hash: String,
    pub suspended: bool,
    pub timescale: f64,
    pub move_intent: [f32; 2],
    pub path: Vec<[f32; 2]>,
    pub path_index: usize,
    nav: Option<world_pack::NavGridDef>,
    zone_bounds: Option<([f32; 3], [f32; 3])>,
    accumulator_us: u64,
    pub max_catchup: u32,
    pub overrun_count: u32,
    pub last_error: Option<String>,
}

impl World {
    pub fn from_pack(pack: &Pack, pack_hash: String) -> Result<Self, String> {
        let tick_hz = pack.manifest.tick_hz;
        let start_minutes = parse_hhmm(&pack.world.start_time)
            .ok_or_else(|| "start_time 不是 HH:MM".to_string())?;
        let loc = pack.default_locale().clone();
        let mut world = Self {
            tick: 0,
            tick_hz,
            start_minutes,
            clock_minutes: start_minutes,
            seed: pack.world.seed,
            rng: Rng::new(pack.world.seed),
            slots: Vec::new(),
            free: Vec::new(),
            flags: BTreeMap::new(),
            quests: BTreeMap::new(),
            events: Vec::new(),
            event_seq: 0,
            pending: Vec::new(),
            player: EntityId::NONE,
            zone_id: pack.world.start_zone.clone(),
            rules: pack.rules.values().cloned().collect(),
            schedules: pack.schedules.clone(),
            quest_defs: pack.quests.clone(),
            dialogues: pack.dialogues.clone(),
            loc,
            pack_id: pack.manifest.id.clone(),
            pack_version: pack.manifest.version.clone(),
            pack_hash,
            suspended: false,
            timescale: 1.0,
            move_intent: [0.0, 0.0],
            path: Vec::new(),
            path_index: 0,
            nav: None,
            zone_bounds: None,
            accumulator_us: 0,
            max_catchup: 4,
            overrun_count: 0,
            last_error: None,
        };

        let player = world.spawn_entity(Entity {
            id: EntityId::NONE,
            content_id: "player".to_string(),
            persistent_id: Some("player".to_string()),
            kind: EntityKind::Player,
            transform: Transform::new(pack.world.player.at, 0.0),
            tags: vec!["player".to_string()],
            health: 100,
            speed: 4.0,
            inventory: pack
                .world
                .player
                .inventory
                .iter()
                .map(|s| ItemStack {
                    item: s.item.clone(),
                    count: s.count,
                })
                .collect(),
            interactable: None,
            door: None,
            schedule: None,
            behavior: None,
            dialogue: None,
            collider: Some(Collider::Circle { radius: 0.35 }),
        });
        world.player = player;

        world.load_zone(pack, &pack.world.start_zone)?;
        world.emit(
            "world_started",
            None,
            json!({"pack_id": world.pack_id, "tick_hz": tick_hz}),
        );
        world.emit(
            "zone_activated",
            None,
            json!({"zone": world.zone_id.clone()}),
        );

        let auto: Vec<String> = world
            .quest_defs
            .iter()
            .filter(|(_, q)| q.auto_start)
            .map(|(id, _)| id.clone())
            .collect();
        for quest in auto {
            world.start_quest(&quest)?;
        }

        Ok(world)
    }

    fn load_zone(&mut self, pack: &Pack, zone_id: &str) -> Result<(), String> {
        let zone = pack
            .zones
            .get(zone_id)
            .ok_or_else(|| format!("区域不存在: {zone_id}"))?;
        self.zone_bounds = Some((zone.bounds.min, zone.bounds.max));
        self.nav = zone.nav.as_ref().and_then(|id| pack.navs.get(id)).cloned();
        for p in &zone.placements {
            let transform = Transform::new(p.at, p.yaw);
            let entity = if let Some(id) = &p.actor {
                let def: &ActorDef = pack
                    .actors
                    .get(id)
                    .ok_or_else(|| format!("角色不存在: {id}"))?;
                Entity {
                    id: EntityId::NONE,
                    content_id: def.id.clone(),
                    persistent_id: Some(p.persistent_id.clone()),
                    kind: EntityKind::Actor,
                    transform,
                    tags: def.tags.clone(),
                    health: def.stats.health,
                    speed: def.stats.speed,
                    inventory: def
                        .inventory
                        .as_ref()
                        .map(|inv| {
                            inv.items
                                .iter()
                                .map(|s| ItemStack {
                                    item: s.item.clone(),
                                    count: s.count,
                                })
                                .collect()
                        })
                        .unwrap_or_default(),
                    interactable: Some(Interactable {
                        verbs: vec!["talk".to_string()],
                    }),
                    door: None,
                    schedule: def.brain.as_ref().and_then(|b| b.schedule.clone()),
                    behavior: None,
                    dialogue: def.dialogue.clone(),
                    collider: Some(Collider::Circle {
                        radius: def.body.radius.unwrap_or(0.35),
                    }),
                }
            } else if let Some(id) = &p.prop {
                let def: &PropDef = pack
                    .props
                    .get(id)
                    .ok_or_else(|| format!("道具不存在: {id}"))?;
                Entity {
                    id: EntityId::NONE,
                    content_id: def.id.clone(),
                    persistent_id: Some(p.persistent_id.clone()),
                    kind: EntityKind::Prop,
                    transform,
                    tags: def.tags.clone(),
                    health: 1,
                    speed: 0.0,
                    inventory: Vec::new(),
                    interactable: Some(Interactable {
                        verbs: def.interactable.verbs.clone(),
                    }),
                    door: Some(Door {
                        open: false,
                        locked_by: def.locked_by.clone(),
                    }),
                    schedule: None,
                    behavior: None,
                    dialogue: None,
                    collider: Some(Collider::Aabb {
                        half: [
                            def.body.size.map(|s| s[0]).unwrap_or(1.0) * 0.5,
                            def.body.size.map(|s| s[2]).unwrap_or(1.0) * 0.5,
                        ],
                    }),
                }
            } else if let Some(id) = &p.item {
                let def: &ItemDef = pack
                    .items
                    .get(id)
                    .ok_or_else(|| format!("物品不存在: {id}"))?;
                Entity {
                    id: EntityId::NONE,
                    content_id: def.id.clone(),
                    persistent_id: Some(p.persistent_id.clone()),
                    kind: EntityKind::Item,
                    transform,
                    tags: def.tags.clone(),
                    health: 1,
                    speed: 0.0,
                    inventory: Vec::new(),
                    interactable: Some(Interactable {
                        verbs: vec!["pickup".to_string()],
                    }),
                    door: None,
                    schedule: None,
                    behavior: None,
                    dialogue: None,
                    collider: None,
                }
            } else {
                return Err("placement 未指定 actor/prop/item".to_string());
            };
            self.spawn_entity(entity);
        }
        self.zone_id = zone_id.to_string();
        Ok(())
    }

    fn spawn_entity(&mut self, mut entity: Entity) -> EntityId {
        let index = if let Some(index) = self.free.pop() {
            let slot = &mut self.slots[index as usize];
            slot.generation = slot.generation.wrapping_add(1);
            index
        } else {
            let index = self.slots.len() as u32;
            self.slots.push(Slot {
                generation: 0,
                entity: None,
            });
            index
        };
        let generation = self.slots[index as usize].generation;
        let id = EntityId::new(index, generation);
        entity.id = id;
        self.slots[index as usize].entity = Some(entity);
        id
    }

    fn despawn(&mut self, id: EntityId) -> Option<Entity> {
        let slot = self.slots.get_mut(id.index as usize)?;
        if slot.generation != id.generation {
            return None;
        }
        let entity = slot.entity.take()?;
        slot.generation = slot.generation.wrapping_add(1);
        self.free.push(id.index);
        Some(entity)
    }

    pub fn entity(&self, id: EntityId) -> Option<&Entity> {
        let slot = self.slots.get(id.index as usize)?;
        if slot.generation != id.generation {
            return None;
        }
        slot.entity.as_ref()
    }

    pub fn entity_mut(&mut self, id: EntityId) -> Option<&mut Entity> {
        let slot = self.slots.get_mut(id.index as usize)?;
        if slot.generation != id.generation {
            return None;
        }
        slot.entity.as_mut()
    }

    pub fn entities(&self) -> impl Iterator<Item = &Entity> {
        self.slots.iter().filter_map(|s| s.entity.as_ref())
    }

    pub fn find_by_content_id(&self, content_id: &str) -> Option<EntityId> {
        self.entities()
            .find(|e| e.content_id == content_id)
            .map(|e| e.id)
    }

    pub fn find_by_persistent_id(&self, persistent_id: &str) -> Option<EntityId> {
        self.entities()
            .find(|e| e.persistent_id.as_deref() == Some(persistent_id))
            .map(|e| e.id)
    }

    pub fn localize(&self, text: &str) -> String {
        if let Some(key) = text.strip_prefix("loc:") {
            self.loc
                .get(key)
                .cloned()
                .unwrap_or_else(|| text.to_string())
        } else {
            text.to_string()
        }
    }

    pub fn queue_command(&mut self, command: Command) {
        self.pending.push(command);
    }

    pub fn advance(&mut self, frame_dt_us: u64) -> u32 {
        if self.suspended {
            return 0;
        }
        let scaled = (frame_dt_us as f64 * self.timescale).max(0.0) as u64;
        self.accumulator_us = self.accumulator_us.saturating_add(scaled);
        let tick_us = 1_000_000u64 / self.tick_hz.max(1) as u64;
        let mut n = 0;
        while self.accumulator_us >= tick_us && n < self.max_catchup {
            self.tick_once();
            self.accumulator_us -= tick_us;
            n += 1;
        }
        if n == self.max_catchup && self.accumulator_us >= tick_us {
            self.accumulator_us = 0;
            self.overrun_count += 1;
        }
        n
    }

    pub fn tick_once(&mut self) {
        let commands = std::mem::take(&mut self.pending);
        for command in commands {
            if let Err(error) = self.apply_command(command) {
                self.last_error = Some(error.clone());
                self.emit("command_rejected", None, json!({"error": error}));
            }
        }

        self.apply_movement();
        self.tick = self.tick.saturating_add(1);
        let seconds = self.tick.saturating_mul(60) / self.tick_hz.max(1) as u64;
        self.clock_minutes = (self.start_minutes + (seconds / 60) as u32) % 1440;
        self.update_schedules();
    }

    fn apply_movement(&mut self) {
        let [x, z] = self.move_intent;
        let len = (x * x + z * z).sqrt();
        if len > 1e-6 {
            self.path.clear();
            self.path_index = 0;
            let Some(player) = self.entity(self.player) else {
                return;
            };
            let speed = player.speed.max(0.0);
            if speed <= 0.0 {
                return;
            }
            let step = speed / self.tick_hz.max(1) as f32;
            let magnitude = len.min(1.0);
            let dx = (x / len) * step * magnitude;
            let dz = (z / len) * step * magnitude;
            self.try_move_player(dx, 0.0);
            self.try_move_player(0.0, dz);
            return;
        }

        if self.path.is_empty() {
            return;
        }
        while self.path_index < self.path.len() {
            let waypoint = self.path[self.path_index];
            let Some(player) = self.entity(self.player) else {
                self.path.clear();
                return;
            };
            let dx = waypoint[0] - player.transform.position[0];
            let dz = waypoint[1] - player.transform.position[2];
            if dx * dx + dz * dz <= 0.04 {
                self.path_index += 1;
            } else {
                break;
            }
        }
        if self.path_index >= self.path.len() {
            self.path.clear();
            self.path_index = 0;
            return;
        }
        let waypoint = self.path[self.path_index];
        let Some(player) = self.entity(self.player) else {
            self.path.clear();
            return;
        };
        let speed = player.speed.max(0.0);
        if speed <= 0.0 {
            return;
        }
        let dx = waypoint[0] - player.transform.position[0];
        let dz = waypoint[1] - player.transform.position[2];
        let distance = (dx * dx + dz * dz).sqrt();
        if distance <= 1e-6 {
            self.path_index += 1;
            return;
        }
        let step = (speed / self.tick_hz.max(1) as f32).min(distance);
        let moved_x = self.try_move_player(dx / distance * step, 0.0);
        let moved_z = self.try_move_player(0.0, dz / distance * step);
        if !moved_x && !moved_z {
            self.path.clear();
            self.path_index = 0;
        }
    }

    fn try_move_player(&mut self, dx: f32, dz: f32) -> bool {
        let Some(player) = self.entity(self.player) else {
            return false;
        };
        let radius = player
            .collider
            .as_ref()
            .map(|c| c.radius())
            .unwrap_or(0.35)
            .max(0.05);
        let mut next = [
            player.transform.position[0] + dx,
            player.transform.position[2] + dz,
        ];

        if let Some((min, max)) = self.zone_bounds {
            next[0] = next[0].clamp(min[0] + radius, max[0] - radius);
            next[1] = next[1].clamp(min[2] + radius, max[2] - radius);
        }

        let obstacles: Vec<([f32; 3], Option<Collider>, bool)> = self
            .entities()
            .filter(|e| e.id != self.player && e.kind != EntityKind::Item)
            .map(|e| {
                (
                    e.transform.position,
                    e.collider.clone(),
                    e.door.as_ref().map(|d| d.open).unwrap_or(false),
                )
            })
            .collect();

        let blocked = obstacles.iter().any(|(position, collider, open)| {
            if *open {
                return false;
            }
            match collider {
                Some(Collider::Aabb { half }) => {
                    circle_aabb_overlap(next, radius, [position[0], position[2]], *half)
                }
                Some(Collider::Circle { radius: other }) => {
                    let ddx = next[0] - position[0];
                    let ddz = next[1] - position[2];
                    (ddx * ddx + ddz * ddz).sqrt() < radius + other
                }
                None => false,
            }
        });

        if !blocked {
            if let Some(player) = self.entity_mut(self.player) {
                player.transform.position[0] = next[0];
                player.transform.position[2] = next[1];
            }
            return true;
        }
        false
    }

    fn update_schedules(&mut self) {
        let minute = self.clock_minutes;
        let mut updates: Vec<(EntityId, String, String)> = Vec::new();
        for entity in self.entities() {
            let Some(schedule_id) = &entity.schedule else {
                continue;
            };
            let Some(schedule) = self.schedules.get(schedule_id) else {
                continue;
            };
            let behavior = behavior_at(schedule, minute);
            if let Some(behavior) = behavior {
                if entity.behavior.as_deref() != Some(behavior.as_str()) {
                    updates.push((entity.id, entity.content_id.clone(), behavior));
                }
            }
        }
        for (id, content_id, behavior) in updates {
            if let Some(entity) = self.entity_mut(id) {
                entity.behavior = Some(behavior.clone());
            }
            self.emit(
                "schedule_changed",
                Some(id),
                json!({"entity": content_id, "behavior": behavior}),
            );
        }
    }

    pub fn apply_command(&mut self, command: Command) -> Result<(), String> {
        match command {
            Command::Interact { actor, target } => self.command_interact(actor, target),
            Command::Talk { actor, target } => self.command_talk(actor, target),
            Command::Pickup { actor, target } => self.command_pickup(actor, target),
            Command::GiveItem { actor, item, count } => {
                let entity = self
                    .entity_mut(actor)
                    .ok_or_else(|| format!("actor 不存在: {actor}"))?;
                entity.give_item(&item, count);
                self.emit(
                    "item_acquired",
                    Some(actor),
                    json!({"item": item, "count": count}),
                );
                Ok(())
            }
            Command::SetFlag { flag, value } => {
                self.set_flag(&flag, value);
                Ok(())
            }
            Command::StartQuest { quest } => self.start_quest(&quest),
            Command::Toast { actor, text } => {
                let text = self.localize(&text);
                self.emit("toast", actor, json!({"text": text}));
                Ok(())
            }
            Command::PlaySound { id } => {
                self.emit("sound", None, json!({"id": id}));
                Ok(())
            }
            Command::Emit { event } => {
                self.emit(&event, None, json!({}));
                Ok(())
            }
            Command::ActivateZone { zone } => {
                self.zone_id = zone.clone();
                self.emit("zone_activated", None, json!({"zone": zone}));
                Ok(())
            }
            Command::Move { actor, x, z } => self.command_move(actor, x, z),
            Command::MoveTo { actor, x, z } => self.command_move_to(actor, x, z),
        }
    }

    fn command_move(&mut self, actor: EntityId, x: f32, z: f32) -> Result<(), String> {
        if !x.is_finite() || !z.is_finite() {
            return Err("move 输入必须是有限数值".to_string());
        }
        if self.entity(actor).is_none() {
            return Err(format!("actor 不存在: {actor}"));
        }
        let len = (x * x + z * z).sqrt();
        if len > 1.0 {
            self.move_intent = [x / len, z / len];
        } else {
            self.move_intent = [x, z];
        }
        Ok(())
    }

    fn command_move_to(&mut self, actor: EntityId, x: f32, z: f32) -> Result<(), String> {
        if !x.is_finite() || !z.is_finite() {
            return Err("move_to 输入必须是有限数值".to_string());
        }
        let entity = self
            .entity(actor)
            .ok_or_else(|| format!("actor 不存在: {actor}"))?;
        let from = [entity.transform.position[0], entity.transform.position[2]];
        let nav = self
            .nav
            .as_ref()
            .ok_or_else(|| format!("区域 {} 没有导航网格", self.zone_id))?;
        let path = nav::find_path(nav, from, [x, z])
            .ok_or_else(|| format!("无法从 {from:?} 寻路到 ({x}, {z})"))?;
        self.path_index = if path.len() > 1 { 1 } else { 0 };
        self.path = path;
        self.move_intent = [0.0, 0.0];
        Ok(())
    }

    fn command_interact(&mut self, actor: EntityId, target: EntityId) -> Result<(), String> {
        let actor_entity = self
            .entity(actor)
            .cloned()
            .ok_or_else(|| format!("actor 不存在: {actor}"))?;
        let target_entity = self
            .entity(target)
            .cloned()
            .ok_or_else(|| format!("target 不存在: {target}"))?;

        self.emit(
            "interact",
            Some(actor),
            json!({"actor": actor_entity.content_id, "target": target_entity.content_id}),
        );

        if self.try_rules("interact", &actor_entity, &target_entity) {
            return Ok(());
        }

        if let Some(door) = &target_entity.door {
            if door.open {
                self.emit(
                    "toast",
                    Some(actor),
                    json!({"text": self.localize("loc:door.already_open")}),
                );
                return Ok(());
            }
            let allowed = match &door.locked_by {
                None => true,
                Some(item) => actor_entity.has_item(item),
            };
            if allowed {
                if let Some(entity) = self.entity_mut(target) {
                    if let Some(door) = &mut entity.door {
                        door.open = true;
                    }
                }
                self.emit(
                    "door_opened",
                    Some(target),
                    json!({"target": target_entity.content_id}),
                );
            } else {
                let text = self.localize("loc:door.locked");
                self.emit("toast", Some(actor), json!({"text": text}));
            }
        }
        Ok(())
    }

    fn command_talk(&mut self, actor: EntityId, target: EntityId) -> Result<(), String> {
        let actor_entity = self
            .entity(actor)
            .cloned()
            .ok_or_else(|| format!("actor 不存在: {actor}"))?;
        let target_entity = self
            .entity(target)
            .cloned()
            .ok_or_else(|| format!("target 不存在: {target}"))?;

        self.emit(
            "talk",
            Some(actor),
            json!({"actor": actor_entity.content_id, "target": target_entity.content_id}),
        );

        if let Some(dialogue_id) = &target_entity.dialogue {
            if let Some(dialogue) = self.dialogues.get(dialogue_id) {
                if let Some(node) = dialogue.nodes.get(&dialogue.start) {
                    let text = self.localize(&node.text);
                    self.emit(
                        "dialogue_started",
                        Some(target),
                        json!({
                            "dialogue": dialogue_id,
                            "node": dialogue.start,
                            "speaker": node.speaker,
                            "text": text,
                            "choices": node.choices.iter().map(|c| json!({
                                "text": self.localize(&c.text),
                                "next": c.next
                            })).collect::<Vec<_>>()
                        }),
                    );
                }
            }
        }
        Ok(())
    }

    fn command_pickup(&mut self, actor: EntityId, target: EntityId) -> Result<(), String> {
        let target_entity = self
            .entity(target)
            .cloned()
            .ok_or_else(|| format!("target 不存在: {target}"))?;
        if target_entity.kind != EntityKind::Item {
            return Err(format!("target 不是可拾取物品: {target}"));
        }
        self.despawn(target);
        let item = target_entity.content_id.clone();
        let actor_entity = self
            .entity_mut(actor)
            .ok_or_else(|| format!("actor 不存在: {actor}"))?;
        actor_entity.give_item(&item, 1);
        self.emit(
            "item_acquired",
            Some(actor),
            json!({"item": item, "count": 1, "source": target_entity.persistent_id}),
        );
        self.emit(
            "entity_despawned",
            None,
            json!({"content_id": target_entity.content_id, "entity": target.pack()}),
        );
        Ok(())
    }

    fn try_rules(&mut self, on: &str, actor: &Entity, target: &Entity) -> bool {
        let rules = self.rules.clone();
        for rule in &rules {
            if rule.on != on {
                continue;
            }
            if let Some(expected) = &rule.target {
                if expected != &target.content_id {
                    continue;
                }
            }
            let passes = rule.when.iter().all(|c| self.condition_ok(c, actor));
            let actions = if passes { &rule.then } else { &rule.otherwise };
            if !actions.is_empty() {
                let actions = actions.clone();
                self.run_actions(&actions, actor.id, target.id);
            }
            return true;
        }
        false
    }

    fn condition_ok(&self, condition: &ConditionDef, actor: &Entity) -> bool {
        match condition {
            ConditionDef::HasItem { item } => actor.has_item(item),
            ConditionDef::Flag { flag, value } => {
                self.flags.get(flag).copied().unwrap_or(false) == *value
            }
            ConditionDef::QuestActive { quest } => {
                self.quests.get(quest).map(|q| q.active).unwrap_or(false)
            }
        }
    }

    fn run_actions(&mut self, actions: &[ActionDef], actor: EntityId, target: EntityId) {
        for action in actions {
            match action {
                ActionDef::SetFlag { flag, value } => self.set_flag(flag, *value),
                ActionDef::Toast { text } => {
                    let text = self.localize(text);
                    self.emit("toast", Some(actor), json!({"text": text}));
                }
                ActionDef::PlaySound { id } => {
                    self.emit("sound", Some(target), json!({"id": id}));
                }
                ActionDef::Emit { event } => {
                    self.emit(event, Some(target), json!({}));
                }
                ActionDef::GiveItem { item, count } => {
                    if let Some(entity) = self.entity_mut(actor) {
                        entity.give_item(item, *count);
                    }
                    self.emit(
                        "item_acquired",
                        Some(actor),
                        json!({"item": item, "count": count}),
                    );
                }
                ActionDef::StartQuest { quest } => {
                    let _ = self.start_quest(quest);
                }
                ActionDef::OpenDoor => {
                    let opened = self
                        .entity_mut(target)
                        .and_then(|entity| entity.door.as_mut())
                        .map(|door| {
                            door.open = true;
                        })
                        .is_some();
                    if opened {
                        self.emit("door_opened", Some(target), json!({"target": target}));
                    }
                }
            }
        }
    }

    pub fn set_flag(&mut self, flag: &str, value: bool) {
        let old = self.flags.insert(flag.to_string(), value).unwrap_or(false);
        if old != value {
            self.emit("flag_changed", None, json!({"flag": flag, "value": value}));
        }
    }

    pub fn start_quest(&mut self, quest: &str) -> Result<(), String> {
        if !self.quest_defs.contains_key(quest) {
            return Err(format!("任务不存在: {quest}"));
        }
        if let Some(state) = self.quests.get(quest) {
            if state.active || state.completed {
                return Ok(());
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
        self.emit("quest_started", None, json!({"quest": quest}));
        Ok(())
    }

    fn progress_quests(&mut self, event: &EventEnvelope) {
        let defs = self.quest_defs.clone();
        let mut completed = Vec::new();
        for (id, state) in self.quests.iter_mut() {
            if !state.active || state.completed {
                continue;
            }
            let Some(def) = defs.get(id) else {
                continue;
            };
            for objective in &def.objectives {
                let key = objective_key(objective);
                if state.progress.get(&key).copied().unwrap_or(0) >= 1 {
                    continue;
                }
                if objective_matches(objective, event) {
                    state.progress.insert(key, 1);
                }
            }
            let done = def
                .objectives
                .iter()
                .all(|o| state.progress.get(&objective_key(o)).copied().unwrap_or(0) >= 1);
            if done {
                state.active = false;
                state.completed = true;
                completed.push(id.clone());
            }
        }

        for id in completed {
            self.emit("quest_completed", None, json!({"quest": id}));
            if let Some(def) = defs.get(&id).cloned() {
                for reward in &def.rewards {
                    match reward {
                        RewardDef::Flag { flag, value } => self.set_flag(flag, *value),
                        RewardDef::Item { item, count } => {
                            if let Some(player) = self.entity_mut(self.player) {
                                player.give_item(item, *count);
                            }
                            self.emit(
                                "item_acquired",
                                Some(self.player),
                                json!({"item": item, "count": count}),
                            );
                        }
                    }
                }
            }
        }
    }

    pub fn emit(&mut self, kind: &str, source: Option<EntityId>, data: Value) {
        let event = EventEnvelope {
            seq: self.event_seq,
            tick: self.tick,
            kind: kind.to_string(),
            source,
            data,
        };
        self.event_seq = self.event_seq.saturating_add(1);
        self.events.push(event.clone());
        self.progress_quests(&event);
    }

    pub fn drain_events(&mut self) -> Vec<EventEnvelope> {
        std::mem::take(&mut self.events)
    }

    pub fn events_json_lines(&self) -> String {
        let mut out = String::new();
        for event in &self.events {
            if let Ok(line) = serde_json::to_string(event) {
                out.push_str(&line);
                out.push('\n');
            }
        }
        out
    }

    pub fn snapshot(&self) -> Snapshot {
        let mut entities: Vec<Entity> = self.entities().cloned().collect();
        entities.sort_by_key(|e| e.id);
        Snapshot {
            tick: self.tick,
            clock_minutes: self.clock_minutes,
            seed: self.seed,
            rng_state: self.rng.state,
            flags: self.flags.clone(),
            quests: self.quests.clone(),
            entities,
            player: self.player,
            zone_id: self.zone_id.clone(),
            suspended: self.suspended,
            timescale_milli: (self.timescale * 1000.0).round() as i64,
            move_intent: self.move_intent,
            path: self.path.clone(),
            path_index: self.path_index,
        }
    }

    pub fn state_hash(&self) -> u64 {
        let snap = self.snapshot();
        let bytes = serde_json::to_vec(&snap).unwrap_or_default();
        let hash = xxhash_rust::xxh3::xxh3_64(&bytes);
        if hash == 0 {
            1
        } else {
            hash
        }
    }

    fn restore_snapshot(&mut self, snap: Snapshot) -> Result<(), String> {
        self.tick = snap.tick;
        self.clock_minutes = snap.clock_minutes;
        self.seed = snap.seed;
        self.rng.state = snap.rng_state;
        self.flags = snap.flags;
        self.quests = snap.quests;
        self.zone_id = snap.zone_id;
        self.suspended = snap.suspended;
        self.timescale = (snap.timescale_milli as f64) / 1000.0;
        self.move_intent = snap.move_intent;
        self.path = snap.path;
        self.path_index = snap.path_index;
        self.events.clear();
        self.event_seq = 0;
        self.pending.clear();
        self.slots.clear();
        self.free.clear();

        let max_index = snap.entities.iter().map(|e| e.id.index).max();
        if let Some(max_index) = max_index {
            self.slots.resize_with((max_index + 1) as usize, || Slot {
                generation: 0,
                entity: None,
            });
            for entity in snap.entities {
                let index = entity.id.index as usize;
                let generation = entity.id.generation;
                if index >= self.slots.len() {
                    return Err("存档实体索引越界".to_string());
                }
                self.slots[index] = Slot {
                    generation,
                    entity: Some(entity),
                };
            }
        }
        self.player = snap.player;
        if self.entity(self.player).is_none() {
            return Err("存档缺少 player 实体".to_string());
        }
        Ok(())
    }

    pub fn save_bytes(&self) -> Result<Vec<u8>, String> {
        let mut envelope = SaveEnvelope {
            format_version: 1,
            core_version: env!("CARGO_PKG_VERSION").to_string(),
            pack_id: self.pack_id.clone(),
            pack_version: self.pack_version.clone(),
            pack_hash: self.pack_hash.clone(),
            seed: self.seed,
            tick: self.tick,
            snapshot: self.snapshot(),
            checksum: 0,
        };
        let bytes = serde_json::to_vec(&envelope).map_err(|e| format!("存档序列化失败: {e}"))?;
        envelope.checksum = xxhash_rust::xxh3::xxh3_64(&bytes);
        serde_json::to_vec_pretty(&envelope).map_err(|e| format!("存档序列化失败: {e}"))
    }

    pub fn load_bytes(pack: &Pack, bytes: &[u8]) -> Result<Self, String> {
        let envelope: SaveEnvelope =
            serde_json::from_slice(bytes).map_err(|e| format!("存档解析失败: {e}"))?;
        if envelope.format_version != 1 {
            return Err(format!("不支持的存档格式版本: {}", envelope.format_version));
        }
        let expected_hash = pack.hash().map_err(|e| e.to_string())?;
        if envelope.pack_id != pack.manifest.id
            || envelope.pack_version != pack.manifest.version
            || envelope.pack_hash != expected_hash
        {
            return Err("存档与内容包不匹配".to_string());
        }
        let checksum = envelope.checksum;
        let mut probe = envelope.clone();
        probe.checksum = 0;
        let probe_bytes = serde_json::to_vec(&probe).map_err(|e| format!("存档校验失败: {e}"))?;
        let actual = xxhash_rust::xxh3::xxh3_64(&probe_bytes);
        if actual != checksum {
            return Err("存档校验和错误（文件损坏或被修改）".to_string());
        }
        let mut world = Self::from_pack(pack, expected_hash)?;
        world.restore_snapshot(envelope.snapshot)?;
        Ok(world)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SaveEnvelope {
    pub format_version: u32,
    pub core_version: String,
    pub pack_id: String,
    pub pack_version: String,
    pub pack_hash: String,
    pub seed: u64,
    pub tick: u64,
    pub snapshot: Snapshot,
    pub checksum: u64,
}

fn objective_key(objective: &ObjectiveDef) -> String {
    match objective {
        ObjectiveDef::Talk { target } => format!("talk:{target}"),
        ObjectiveDef::Flag { flag, .. } => format!("flag:{flag}"),
        ObjectiveDef::Acquire { item } => format!("acquire:{item}"),
    }
}

fn objective_matches(objective: &ObjectiveDef, event: &EventEnvelope) -> bool {
    match objective {
        ObjectiveDef::Talk { target } => {
            event.kind == "talk" && data_str(event, "target").as_deref() == Some(target)
        }
        ObjectiveDef::Flag { flag, value } => {
            event.kind == "flag_changed"
                && data_str(event, "flag").as_deref() == Some(flag)
                && data_bool(event, "value") == Some(*value)
        }
        ObjectiveDef::Acquire { item } => {
            event.kind == "item_acquired" && data_str(event, "item").as_deref() == Some(item)
        }
    }
}

fn data_str(event: &EventEnvelope, key: &str) -> Option<String> {
    event
        .data
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

fn data_bool(event: &EventEnvelope, key: &str) -> Option<bool> {
    event.data.get(key).and_then(|v| v.as_bool())
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

fn circle_aabb_overlap(point: [f32; 2], radius: f32, center: [f32; 2], half: [f32; 2]) -> bool {
    let dx = (point[0] - center[0]).abs() - half[0];
    let dz = (point[1] - center[1]).abs() - half[1];
    let nx = dx.max(0.0);
    let nz = dz.max(0.0);
    nx * nx + nz * nz < radius * radius
}
