use crate::ids::EntityId;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EntityKind {
    Player,
    Actor,
    Prop,
    Item,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Transform {
    pub position: [f32; 3],
    pub yaw: f32,
}

impl Transform {
    pub fn new(position: [f32; 3], yaw: f32) -> Self {
        Self { position, yaw }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ItemStack {
    pub item: String,
    pub count: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Interactable {
    pub verbs: Vec<String>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(tag = "shape", rename_all = "snake_case")]
pub enum Collider {
    /// 2D 俯视用的轴对齐矩形（x/z 半尺寸）。
    Aabb { half: [f32; 2] },
    /// 2D 俯视用的圆。
    Circle { radius: f32 },
}

impl Collider {
    pub fn radius(&self) -> f32 {
        match self {
            Collider::Aabb { half } => half[0].max(half[1]),
            Collider::Circle { radius } => *radius,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Door {
    pub open: bool,
    pub locked_by: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Entity {
    pub id: EntityId,
    pub content_id: String,
    pub persistent_id: Option<String>,
    pub kind: EntityKind,
    pub transform: Transform,
    pub tags: Vec<String>,
    pub health: i32,
    pub speed: f32,
    pub inventory: Vec<ItemStack>,
    pub interactable: Option<Interactable>,
    pub door: Option<Door>,
    pub schedule: Option<String>,
    pub behavior: Option<String>,
    pub dialogue: Option<String>,
    #[serde(default)]
    pub collider: Option<Collider>,
}
