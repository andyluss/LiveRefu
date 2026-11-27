use crate::command::Command;
use crate::entity::{Collider, Door, Entity, EntityKind, Interactable, ItemStack, Transform};
use crate::event::EventEnvelope;
use crate::ids::EntityId;
use crate::rng::Rng;
use crate::layers::agency::Agency;
use crate::layers::narrative::Narrative;
use crate::layers::social::{event_json, Social, SocialEvent, SocialSnapshot};
use crate::layers::systems::{Systems, SystemsSnapshot};
use crate::store::{EntityMut, EntityStore, EntityView};
use crate::layers::spacetime::{Obstacle, Spacetime};
use crate::layers::subject::{self, DoorInteraction};
use crate::script::ScriptHost;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use world_pack::{
    parse_hhmm, ActionDef, ActorDef, ItemDef, ObjectiveDef, Pack, PropDef, RewardDef,
};

pub use crate::layers::narrative::QuestState;
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub social: Option<SocialSnapshot>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub systems: Option<SystemsSnapshot>,
}

pub struct World {
    pub(crate) spacetime: Spacetime,
    store: EntityStore,
    pub seed: u64,
    pub rng: Rng,
    pub events: Vec<EventEnvelope>,
    pub event_seq: u64,
    pending: Vec<Command>,
    pub player: EntityId,
    pub zone_id: String,
    agency: Agency,
    narrative: Narrative,
    social: Option<Social>,
    systems: Option<Systems>,
    loc: BTreeMap<String, String>,
    pub pack_id: String,
    pub pack_version: String,
    pub pack_hash: String,
    pub suspended: bool,
    pub timescale: f64,
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
            spacetime: Spacetime::new(tick_hz, start_minutes),
            store: EntityStore::default(),
            seed: pack.world.seed,
            rng: Rng::new(pack.world.seed),
            events: Vec::new(),
            event_seq: 0,
            pending: Vec::new(),
            player: EntityId::NONE,
            zone_id: pack.world.start_zone.clone(),
            agency: Agency::new(pack.schedules.clone()),
            narrative: Narrative::new(pack),
            social: pack.world.social.as_ref().map(Social::new),
            systems: pack.world.systems.as_ref().map(Systems::new),
            loc,
            pack_id: pack.manifest.id.clone(),
            pack_version: pack.manifest.version.clone(),
            pack_hash,
            suspended: false,
            timescale: 1.0,
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

        world.spacetime.tick_hz = tick_hz;
        world.spacetime.start_minutes = start_minutes;
        world.load_zone(pack, &pack.world.start_zone)?;
        if let Some(systems) = world.systems.as_mut() {
            systems.update(0, world.spacetime.clock_minutes);
        }
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
            .narrative
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

    /// 由宿主在内容包加载后注入脚本运行时；核心不依赖 QuickJS。
    pub fn set_script_host(&mut self, host: Box<dyn ScriptHost>) {
        self.narrative.set_script_host(host);
    }

    pub fn has_script_host(&self) -> bool {
        self.narrative.has_script_host()
    }

    /// 只把指定 kind 的事件交给脚本；用于高频内部事件（日程/寻路）避免全量上下文成本。
    /// 默认 None = 所有事件都交给脚本。
    pub fn set_script_event_filter<I, S>(&mut self, kinds: I)
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        self.narrative.set_script_event_filter(kinds);
    }

    fn load_zone(&mut self, pack: &Pack, zone_id: &str) -> Result<(), String> {
        let zone = pack
            .zones
            .get(zone_id)
            .ok_or_else(|| format!("区域不存在: {zone_id}"))?;
        self.spacetime.zone_bounds = Some((zone.bounds.min, zone.bounds.max));
        self.spacetime.nav = zone.nav.as_ref().and_then(|id| pack.navs.get(id)).cloned();
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

    fn spawn_entity(&mut self, entity: Entity) -> EntityId {
        self.store.spawn(entity)
    }

    fn despawn(&mut self, id: EntityId) -> Option<Entity> {
        self.store.despawn(id)
    }

    pub fn entity(&self, id: EntityId) -> Option<EntityView<'_>> {
        self.store.get(id)
    }

    pub fn entity_mut(&mut self, id: EntityId) -> Option<EntityMut<'_>> {
        self.store.get_mut(id)
    }

    pub fn entities(&self) -> impl Iterator<Item = EntityView<'_>> + '_ {
        self.store.iter()
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

    /// Public read-only tick counter; C ABI remains unchanged.
    pub fn tick(&self) -> u64 {
        self.spacetime.tick
    }

    pub fn advance(&mut self, frame_dt_us: u64) -> u32 {
        if self.suspended {
            return 0;
        }
        let (n, exhausted) = self
            .spacetime
            .accumulate(frame_dt_us, self.timescale, self.max_catchup);
        for _ in 0..n {
            self.tick_once();
        }
        if exhausted {
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
        self.spacetime.advance_tick();
        self.update_schedules();
        self.update_systems();
    }

    /// L0 owns the kinematic step; this method only supplies the body snapshot.
    fn apply_movement(&mut self) {
        let Some(player) = self.entity(self.player).map(Entity::from) else {
            return;
        };
        let obstacles: Vec<Obstacle> = self
            .store
            .obstacles(self.player)
            .into_iter()
            .map(|(position, collider, open)| Obstacle { position, collider, open })
            .collect();
        if let Some(position) = self.spacetime.apply_movement(&player, &obstacles) {
            if let Some(player) = self.entity_mut(self.player) {
                player.transform.position = position;
            }
        }
    }

    fn update_systems(&mut self) {
        let Some(systems) = self.systems.as_mut() else { return; };
        let events = systems.update(self.spacetime.tick, self.spacetime.clock_minutes);
        for (kind, data) in events {
            self.emit(kind, None, data);
        }
    }

    fn apply_social(&mut self, events: Vec<SocialEvent>) {
        for event in events {
            let (kind, data) = event_json(&event);
            self.emit(kind, None, data);
        }
    }

    fn update_schedules(&mut self) {
        let changes = self
            .agency
            .changes(self.spacetime.clock_minutes, self.store.schedules());
        for change in changes {
            if let Some(entity) = self.entity_mut(change.id) {
                *entity.behavior = Some(change.behavior.clone());
            }
            self.emit(
                "schedule_changed",
                Some(change.id),
                json!({"entity": change.content_id, "behavior": change.behavior}),
            );
        }
    }

    pub fn apply_command(&mut self, command: Command) -> Result<(), String> {
        match command {
            Command::Interact { actor, target } => self.command_interact(actor, target),
            Command::Talk { actor, target } => self.command_talk(actor, target),
            Command::Pickup { actor, target } => self.command_pickup(actor, target),
            Command::GiveItem { actor, item, count } => {
                let mut entity = self
                    .entity_mut(actor)
                    .ok_or_else(|| format!("actor 不存在: {actor}"))?;
                subject::give_item_mut(&mut entity, &item, count);
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
            Command::OpenDoor { target } => self.command_open_door(target),
            Command::SocialAction { actor, target, action } => {
                self.command_social(actor, target, &action)
            }
            Command::SetSystemPolicy { policy } => {
                let Some(systems) = self.systems.as_mut() else {
                    return Err("当前内容包未启用 L5 世界系统".to_string());
                };
                let (kind, data) = systems.set_policy(&policy)?;
                self.emit(kind, None, data);
                Ok(())
            }
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
            self.spacetime.move_intent = [x / len, z / len];
        } else {
            self.spacetime.move_intent = [x, z];
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
        let path = self
            .spacetime
            .find_path(from, [x, z])
            .ok_or_else(|| format!("区域 {} 没有导航网格或无法从 {from:?} 寻路到 ({x}, {z})", self.zone_id))?;
        self.spacetime.path_index = if path.len() > 1 { 1 } else { 0 };
        self.spacetime.path = path;
        self.spacetime.move_intent = [0.0, 0.0];
        Ok(())
    }

    fn command_open_door(&mut self, target: EntityId) -> Result<(), String> {
        let opened = self
            .entity_mut(target)
            .map(|mut entity| subject::force_open_door_mut(&mut entity))
            .unwrap_or(false);
        if !opened {
            return Err(format!("target 不是门: {target}"));
        }
        self.emit("door_opened", Some(target), json!({"target": target}));
        Ok(())
    }

    fn command_social(
        &mut self,
        actor: EntityId,
        target: Option<EntityId>,
        action: &str,
    ) -> Result<(), String> {
        let actor_id = self
            .entity(actor)
            .map(|e| e.content_id.to_string())
            .ok_or_else(|| format!("actor 不存在: {actor}"))?;
        let target_id = match target {
            Some(id) => Some(
                self.entity(id)
                    .map(|e| e.content_id.to_string())
                    .ok_or_else(|| format!("target 不存在: {id}"))?,
            ),
            None => None,
        };
        let Some(social) = self.social.as_mut() else {
            return Err("当前内容包未启用 L4 社会层".to_string());
        };
        let events = social.apply_action(&actor_id, target_id.as_deref(), action)?;
        self.apply_social(events);
        Ok(())
    }

    fn command_interact(&mut self, actor: EntityId, target: EntityId) -> Result<(), String> {
        let actor_entity = self
            .entity(actor)
            .map(Entity::from)
            .ok_or_else(|| format!("actor 不存在: {actor}"))?;
        let target_entity = self
            .entity(target)
            .map(Entity::from)
            .ok_or_else(|| format!("target 不存在: {target}"))?;

        self.emit(
            "interact",
            Some(actor),
            json!({"actor": actor_entity.content_id, "target": target_entity.content_id}),
        );

        if self.try_rules("interact", &actor_entity, &target_entity) {
            return Ok(());
        }

        let outcome = self
            .entity_mut(target)
            .map(|mut entity| subject::interact_door_mut(&actor_entity, &mut entity))
            .unwrap_or(DoorInteraction::NoDoor);
        match outcome {
            DoorInteraction::AlreadyOpen => {
                self.emit(
                    "toast",
                    Some(actor),
                    json!({"text": self.localize("loc:door.already_open")}),
                );
            }
            DoorInteraction::Opened => {
                self.emit(
                    "door_opened",
                    Some(target),
                    json!({"target": target_entity.content_id}),
                );
            }
            DoorInteraction::Locked => {
                let text = self.localize("loc:door.locked");
                self.emit("toast", Some(actor), json!({"text": text}));
            }
            DoorInteraction::NoDoor => {}
        }
        Ok(())
    }

    fn command_talk(&mut self, actor: EntityId, target: EntityId) -> Result<(), String> {
        let actor_entity = self
            .entity(actor)
            .map(Entity::from)
            .ok_or_else(|| format!("actor 不存在: {actor}"))?;
        let target_entity = self
            .entity(target)
            .map(Entity::from)
            .ok_or_else(|| format!("target 不存在: {target}"))?;

        self.emit(
            "talk",
            Some(actor),
            json!({"actor": actor_entity.content_id, "target": target_entity.content_id}),
        );
        let social_events = self
            .social
            .as_mut()
            .map(|social| social.record_talk(&actor_entity.content_id, &target_entity.content_id))
            .unwrap_or_default();
        self.apply_social(social_events);

        if let Some(dialogue_id) = &target_entity.dialogue {
            if let Some(dialogue) = self.narrative.dialogue(dialogue_id) {
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
            .map(Entity::from)
            .ok_or_else(|| format!("target 不存在: {target}"))?;
        let item = {
            let mut actor_entity = self
                .entity_mut(actor)
                .ok_or_else(|| format!("actor 不存在: {actor}"))?;
            subject::pickup_item_mut(&mut actor_entity, &target_entity)?
        };
        self.despawn(target);
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
        let rules = self.narrative.rules.clone();
        for rule in &rules {
            if rule.on != on {
                continue;
            }
            if let Some(expected) = &rule.target {
                if expected != &target.content_id {
                    continue;
                }
            }
            let passes = rule
                .when
                .iter()
                .all(|c| self.narrative.condition_ok(c, actor));
            let actions = if passes { &rule.then } else { &rule.otherwise };
            if !actions.is_empty() {
                let actions = actions.clone();
                self.run_actions(&actions, actor.id, target.id);
            }
            return true;
        }
        false
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
                    if let Some(mut entity) = self.entity_mut(actor) {
                        subject::give_item_mut(&mut entity, item, *count);
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
                        .map(|mut entity| subject::force_open_door_mut(&mut entity))
                        .unwrap_or(false);
                    if opened {
                        self.emit("door_opened", Some(target), json!({"target": target}));
                    }
                }
            }
        }
    }

    pub fn set_flag(&mut self, flag: &str, value: bool) {
        if self.narrative.set_flag(flag, value) {
            self.emit("flag_changed", None, json!({"flag": flag, "value": value}));
        }
    }

    pub fn start_quest(&mut self, quest: &str) -> Result<(), String> {
        if self.narrative.start_quest(quest)? {
            self.emit("quest_started", None, json!({"quest": quest}));
        }
        Ok(())
    }

    pub fn flags(&self) -> &BTreeMap<String, bool> {
        &self.narrative.flags
    }

    pub fn quests(&self) -> &BTreeMap<String, QuestState> {
        &self.narrative.quests
    }

    fn progress_quests(&mut self, event: &EventEnvelope) {
        let defs = self.narrative.quest_defs.clone();
        let mut completed = Vec::new();
        for (id, state) in self.narrative.quests.iter_mut() {
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
                            if let Some(mut player) = self.entity_mut(self.player) {
                                subject::give_item_mut(&mut player, item, *count);
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
            tick: self.spacetime.tick,
            kind: kind.to_string(),
            source,
            data,
        };
        self.event_seq = self.event_seq.saturating_add(1);
        self.events.push(event.clone());
        self.progress_quests(&event);
        self.run_scripts(&event);
    }

    fn script_context(&self, event: &EventEnvelope) -> Result<String, String> {
        let snapshot = self.snapshot();
        serde_json::to_string(&json!({
            "tick": self.spacetime.tick,
            "event": event,
            "flags": self.narrative.flags,
            "quests": self.narrative.quests,
            "entities": snapshot.entities,
            "player": snapshot.player,
            "zone_id": snapshot.zone_id,
        }))
        .map_err(|e| format!("脚本上下文序列化失败: {e}"))
    }

    fn run_scripts(&mut self, event: &EventEnvelope) {
        if !self.narrative.should_run_script(&event.kind) {
            return;
        }
        let context = match self.script_context(event) {
            Ok(value) => value,
            Err(error) => {
                self.last_error = Some(error);
                return;
            }
        };
        let Some(host) = self.narrative.script_host_mut() else {
            return;
        };
        match host.on_event(&context) {
            Ok(commands) => {
                let take = commands.len().min(128);
                self.pending.extend(commands.into_iter().take(take));
            }
            Err(error) => {
                self.last_error = Some(format!("script: {error}"));
                let seq = self.event_seq;
                self.event_seq = self.event_seq.saturating_add(1);
                self.events.push(EventEnvelope {
                    seq,
                    tick: self.spacetime.tick,
                    kind: "script_error".to_string(),
                    source: event.source,
                    data: json!({"error": error, "script_event": event.kind}),
                });
            }
        }
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
        let entities: Vec<Entity> = self.store.to_entities();
        Snapshot {
            tick: self.spacetime.tick,
            clock_minutes: self.spacetime.clock_minutes,
            seed: self.seed,
            rng_state: self.rng.state,
            flags: self.narrative.flags.clone(),
            quests: self.narrative.quests.clone(),
            entities,
            player: self.player,
            zone_id: self.zone_id.clone(),
            suspended: self.suspended,
            timescale_milli: (self.timescale * 1000.0).round() as i64,
            move_intent: self.spacetime.move_intent,
            path: self.spacetime.path.clone(),
            path_index: self.spacetime.path_index,
            social: self.social.as_ref().map(Social::snapshot),
            systems: self.systems.as_ref().map(Systems::snapshot),
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
        self.spacetime.tick = snap.tick;
        self.spacetime.clock_minutes = snap.clock_minutes;
        self.seed = snap.seed;
        self.rng.state = snap.rng_state;
        self.narrative.flags = snap.flags;
        self.narrative.quests = snap.quests;
        self.zone_id = snap.zone_id;
        self.suspended = snap.suspended;
        self.timescale = (snap.timescale_milli as f64) / 1000.0;
        self.spacetime.move_intent = snap.move_intent;
        self.spacetime.path = snap.path;
        self.spacetime.path_index = snap.path_index;
        self.events.clear();
        self.event_seq = 0;
        self.pending.clear();

        self.store.from_entities(snap.entities);
        self.player = snap.player;
        self.social = snap.social.map(Social::from_snapshot);
        self.systems = snap.systems.and_then(|state| {
            let mut systems = self.systems.take()?;
            systems.restore(state);
            Some(systems)
        });
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
            tick: self.spacetime.tick,
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

