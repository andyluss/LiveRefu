use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PackManifest {
    pub schema: u32,
    pub id: String,
    pub version: String,
    pub core_api: String,
    pub kits: Vec<String>,
    pub entry: Entry,
    pub sim_profile: String,
    #[serde(default = "default_tick_hz")]
    pub tick_hz: u32,
    #[serde(default)]
    pub assets: Option<String>,
    #[serde(default)]
    pub loc: Vec<String>,
    #[serde(default)]
    pub requires: Vec<String>,
    #[serde(default)]
    pub optional: Vec<String>,
    #[serde(default)]
    pub conflicts: Vec<String>,
}

fn default_tick_hz() -> u32 {
    60
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub world: String,
    pub start_zone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorldDef {
    pub id: String,
    pub start_zone: String,
    pub start_time: String,
    pub seed: u64,
    pub player: PlayerSpawn,
    /// Optional L1 affordance distance. Omitted/None keeps legacy unlimited range.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub interaction_range: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub social: Option<SocialDef>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub systems: Option<SystemsDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct SocialDef {
    #[serde(default)]
    pub factions: BTreeMap<String, FactionDef>,
    #[serde(default)]
    pub relationships: Vec<RelationshipDef>,
    #[serde(default)]
    pub reputations: BTreeMap<String, i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct FactionDef {
    pub name: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub members: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct RelationshipDef {
    pub a: String,
    pub b: String,
    #[serde(default)]
    pub trust: i32,
    #[serde(default)]
    pub affinity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct SystemsDef {
    #[serde(default)]
    pub solar_kw: f32,
    #[serde(default)]
    pub wind_kw: f32,
    #[serde(default)]
    pub battery_kwh: f32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub initial_battery_kwh: Option<f32>,
    #[serde(default)]
    pub water_m3: f32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub initial_water_m3: Option<f32>,
    #[serde(default)]
    pub ai_count: u32,
    #[serde(default)]
    pub base_load_kw: f32,
    #[serde(default = "default_system_policy")]
    pub policy: String,
}

fn default_system_policy() -> String {
    "balance".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PlayerSpawn {
    pub at: [f32; 3],
    #[serde(default)]
    pub inventory: Vec<ItemStackDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ZoneDef {
    pub id: String,
    pub name: String,
    pub bounds: Bounds,
    #[serde(default)]
    pub nav: Option<String>,
    #[serde(default)]
    pub placements: Vec<Placement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Bounds {
    pub min: [f32; 3],
    pub max: [f32; 3],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Placement {
    #[serde(default)]
    pub actor: Option<String>,
    #[serde(default)]
    pub prop: Option<String>,
    #[serde(default)]
    pub item: Option<String>,
    pub at: [f32; 3],
    #[serde(default)]
    pub yaw: f32,
    pub persistent_id: String,
}

impl Placement {
    pub fn kind_count(&self) -> usize {
        self.actor.is_some() as usize + self.prop.is_some() as usize + self.item.is_some() as usize
    }

    pub fn content_id(&self) -> Option<&str> {
        self.actor
            .as_deref()
            .or(self.prop.as_deref())
            .or(self.item.as_deref())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActorDef {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub body: BodyDef,
    pub stats: StatsDef,
    #[serde(default)]
    pub brain: Option<BrainDef>,
    #[serde(default)]
    pub inventory: Option<InventoryDef>,
    #[serde(default)]
    pub dialogue: Option<String>,
    #[serde(default)]
    pub visual: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BodyDef {
    pub shape: String,
    #[serde(default)]
    pub radius: Option<f32>,
    #[serde(default)]
    pub height: Option<f32>,
    #[serde(default)]
    pub size: Option<[f32; 3]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StatsDef {
    pub health: i32,
    pub speed: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BrainDef {
    pub profile: String,
    #[serde(default)]
    pub schedule: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct InventoryDef {
    #[serde(default)]
    pub items: Vec<ItemStackDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ItemStackDef {
    pub item: String,
    #[serde(default = "default_count")]
    pub count: u32,
}

fn default_count() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PropDef {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub body: BodyDef,
    pub interactable: InteractableDef,
    #[serde(default)]
    pub locked_by: Option<String>,
    #[serde(default)]
    pub visual: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct InteractableDef {
    pub verbs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ItemDef {
    pub id: String,
    pub name: String,
    #[serde(default = "default_count")]
    pub stack: u32,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub visual: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RuleDef {
    pub id: String,
    pub on: String,
    #[serde(default)]
    pub target: Option<String>,
    #[serde(default)]
    pub when: Vec<ConditionDef>,
    #[serde(default)]
    pub then: Vec<ActionDef>,
    #[serde(rename = "else", default)]
    pub otherwise: Vec<ActionDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ConditionDef {
    HasItem { item: String },
    Flag { flag: String, value: bool },
    QuestActive { quest: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ActionDef {
    SetFlag { flag: String, value: bool },
    Toast { text: String },
    PlaySound { id: String },
    Emit { event: String },
    GiveItem { item: String, count: u32 },
    StartQuest { quest: String },
    OpenDoor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct QuestDef {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub auto_start: bool,
    pub objectives: Vec<ObjectiveDef>,
    #[serde(default)]
    pub rewards: Vec<RewardDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ObjectiveDef {
    Talk { target: String },
    Flag { flag: String, value: bool },
    Acquire { item: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RewardDef {
    Flag { flag: String, value: bool },
    Item { item: String, count: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DialogueDef {
    pub id: String,
    pub start: String,
    pub nodes: BTreeMap<String, DialogueNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DialogueNode {
    #[serde(default)]
    pub speaker: Option<String>,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub choices: Vec<Choice>,
    #[serde(default)]
    pub next: Option<String>,
    #[serde(default)]
    pub end: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Choice {
    pub text: String,
    pub next: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ScheduleDef {
    pub id: String,
    pub entries: Vec<ScheduleEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ScheduleEntry {
    pub from: String,
    pub to: String,
    pub behavior: String,
    #[serde(default)]
    pub at: Option<String>,
    /// Optional patrol/anchor point in zone X/Z coordinates.
    /// Existing packs omit it, so they keep their golden hashes and behavior.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<[f32; 2]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NavGridDef {
    pub id: String,
    pub zone: String,
    #[serde(default = "default_cell")]
    pub cell: f32,
    pub origin: [f32; 2],
    pub width: u32,
    pub height: u32,
    #[serde(default)]
    pub blocked: Vec<u32>,
}

fn default_cell() -> f32 {
    1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AssetDef {
    pub role: String,
    pub source: String,
    #[serde(default)]
    pub variants: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pack {
    pub manifest: PackManifest,
    pub world: WorldDef,
    pub zones: BTreeMap<String, ZoneDef>,
    pub actors: BTreeMap<String, ActorDef>,
    pub props: BTreeMap<String, PropDef>,
    pub items: BTreeMap<String, ItemDef>,
    pub rules: BTreeMap<String, RuleDef>,
    pub quests: BTreeMap<String, QuestDef>,
    pub dialogues: BTreeMap<String, DialogueDef>,
    pub schedules: BTreeMap<String, ScheduleDef>,
    pub navs: BTreeMap<String, NavGridDef>,
    pub assets: BTreeMap<String, AssetDef>,
    pub loc: BTreeMap<String, BTreeMap<String, String>>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub scripts: BTreeMap<String, String>,
}
