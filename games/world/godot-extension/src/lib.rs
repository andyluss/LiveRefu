//! M2 Godot GDExtension 最小适配器：只通过 world-abi 的 C ABI 驱动内核。
//! 这里不做玩法/渲染；先证明 Godot 能加载同一包并跑出同一哈希。

use godot::classes::{BoxMesh, CapsuleMesh, Mesh, MeshInstance3D, Node3D, SphereMesh, StandardMaterial3D};
use godot::prelude::*;
use std::collections::{HashMap, HashSet};
use world_abi::AbiWorld;

struct WorldExtension;

#[gdextension]
unsafe impl ExtensionLibrary for WorldExtension {}

#[derive(GodotClass)]
#[class(base = Node)]
struct WorldNode {
    base: Base<Node>,
    world: Option<AbiWorld>,
    views_root: Option<Gd<Node3D>>,
    views: HashMap<u64, Gd<MeshInstance3D>>,
}

#[godot_api]
impl INode for WorldNode {
    fn init(base: Base<Node>) -> Self {
        Self {
            base,
            world: None,
            views_root: None,
            views: HashMap::new(),
        }
    }
}

#[godot_api]
impl WorldNode {
    /// 从 GDScript 传入 `pack.data` 的完整字节。
    #[func]
    fn load_pack(&mut self, bytes: PackedByteArray) -> bool {
        let mut world = match AbiWorld::new() {
            Ok(world) => world,
            Err(error) => {
                godot_error!("world_create: {error}");
                return false;
            }
        };
        if let Err(error) = world.load_pack(bytes.as_slice()) {
            godot_error!("world_load_pack: {error}");
            return false;
        }
        self.world = Some(world);
        true
    }

    /// 固定一步；每次调用对应内核的一个 tick。
    #[func]
    fn tick(&mut self) -> i64 {
        let Some(world) = self.world.as_mut() else {
            godot_error!("WorldNode: load_pack not called");
            return -1;
        };
        match world.tick(1_000_000 / 60) {
            Ok(ticks) => ticks as i64,
            Err(error) => {
                godot_error!("world_tick: {error}");
                -1
            }
        }
    }

    fn entity_pair(&self, actor: &GString, target: &GString) -> Option<(u64, u64)> {
        let world = self.world.as_ref()?;
        Some((
            world.find_entity(actor.to_string().as_str())?,
            world.find_entity(target.to_string().as_str())?,
        ))
    }

    fn send_pair(&mut self, op: &str, actor: &GString, target: &GString) -> bool {
        let Some((a, t)) = self.entity_pair(actor, target) else {
            godot_error!("entity not found: {actor} -> {target}");
            return false;
        };
        let json = format!(
            "{{\"op\":\"{op}\",\"actor\":{{\"index\":{},\"generation\":{}}},\"target\":{{\"index\":{},\"generation\":{}}}}}",
            a & 0xFFFF_FFFF,
            a >> 32,
            t & 0xFFFF_FFFF,
            t >> 32
        );
        match self.world.as_mut() {
            Some(world) => match world.command(&json) {
                Ok(()) => true,
                Err(error) => {
                    godot_error!("world_command: {error}");
                    false
                }
            },
            None => false,
        }
    }

    #[func]
    fn interact(&mut self, actor: GString, target: GString) -> bool {
        self.send_pair("interact", &actor, &target)
    }

    #[func]
    fn pickup(&mut self, actor: GString, target: GString) -> bool {
        self.send_pair("pickup", &actor, &target)
    }

    #[func]
    fn talk(&mut self, actor: GString, target: GString) -> bool {
        self.send_pair("talk", &actor, &target)
    }

    fn make_mesh(flags: u32) -> Gd<Mesh> {
        match flags & 0xFF {
            1 | 2 => {
                let mut mesh = CapsuleMesh::new_gd();
                mesh.set_radius(0.35);
                mesh.set_height(1.4);
                mesh.upcast()
            }
            3 => {
                let mut mesh = BoxMesh::new_gd();
                mesh.set_size(Vector3::new(1.0, 1.2, 1.0));
                mesh.upcast()
            }
            _ => {
                let mut mesh = SphereMesh::new_gd();
                mesh.set_radius(0.3);
                mesh.set_height(0.6);
                mesh.upcast()
            }
        }
    }

    fn ensure_views_root(&mut self) -> Gd<Node3D> {
        if let Some(root) = &self.views_root {
            return root.clone();
        }
        let root = Node3D::new_alloc();
        self.base_mut().add_child(&root);
        self.views_root = Some(root.clone());
        root
    }

    /// 把 C ABI transform 快照同步为 Godot 节点；按 EntityId 做池化/回收。
    #[func]
    fn sync_views(&mut self) -> i64 {
        let transforms = match self
            .world
            .as_mut()
            .and_then(|world| world.copy_transforms().ok())
        {
            Some(values) => values,
            None => return -1,
        };
        let mut root = self.ensure_views_root();
        let mut alive = HashSet::new();
        for pod in transforms {
            let key = ((pod.generation as u64) << 32) | pod.index as u64;
            alive.insert(key);
            if !self.views.contains_key(&key) {
                let mut node = MeshInstance3D::new_alloc();
                node.set_mesh(&Self::make_mesh(pod.flags));
                let mut material = StandardMaterial3D::new_gd();
                let hue = match pod.flags & 0xFF {
                    1 => 0.58,
                    2 => 0.33,
                    3 => 0.10,
                    _ => 0.78,
                };
                material.set_albedo(Color::from_hsv(hue, 0.55, 0.85));
                node.set_material_override(&material);
                root.add_child(&node);
                self.views.insert(key, node);
            }
            if let Some(node) = self.views.get_mut(&key) {
                node.set_position(Vector3::new(
                    pod.position[0],
                    pod.position[1],
                    pod.position[2],
                ));
                node.set_quaternion(Quaternion::new(
                    pod.rotation[0],
                    pod.rotation[1],
                    pod.rotation[2],
                    pod.rotation[3],
                ));
                node.set_scale(Vector3::new(pod.scale[0], pod.scale[1], pod.scale[2]));
            }
        }
        let stale: Vec<u64> = self
            .views
            .keys()
            .copied()
            .filter(|key| !alive.contains(key))
            .collect();
        for key in stale {
            if let Some(mut node) = self.views.remove(&key) {
                node.queue_free();
            }
        }
        self.views.len() as i64
    }

    #[func]
    fn view_count(&self) -> i64 {
        self.views.len() as i64
    }

    #[func]
    fn player_position(&mut self) -> Vector3 {
        let Some(world) = self.world.as_mut() else {
            return Vector3::ZERO;
        };
        let Some(player) = world.find_entity("player") else {
            return Vector3::ZERO;
        };
        let index = (player & 0xFFFF_FFFF) as u32;
        let generation = (player >> 32) as u32;
        for pod in world.copy_transforms().unwrap_or_default() {
            if pod.index == index && pod.generation == generation {
                return Vector3::new(pod.position[0], pod.position[1], pod.position[2]);
            }
        }
        Vector3::ZERO
    }

    #[func]
    fn set_move(&mut self, x: f32, z: f32) -> bool {
        let Some(player) = self
            .world
            .as_ref()
            .and_then(|world| world.find_entity("player"))
        else {
            return false;
        };
        let json = format!(
            "{{\"op\":\"move\",\"actor\":{{\"index\":{},\"generation\":{}}},\"x\":{x},\"z\":{z}}}",
            player & 0xFFFF_FFFF,
            player >> 32
        );
        match self.world.as_mut() {
            Some(world) => world.command(&json).is_ok(),
            None => false,
        }
    }

    #[func]
    fn state_hash(&self) -> i64 {
        self.world
            .as_ref()
            .map(|world| world.state_hash() as i64)
            .unwrap_or(-1)
    }

    #[func]
    fn state_hash_hex(&self) -> GString {
        let hash = self.state_hash() as u64;
        GString::from(format!("0x{hash:016x}").as_str())
    }

    #[func]
    fn poll_events(&mut self) -> GString {
        match self
            .world
            .as_mut()
            .and_then(|world| world.poll_events().ok())
        {
            Some(events) => GString::from(events.as_str()),
            None => GString::from(""),
        }
    }

    #[func]
    fn save(&mut self) -> PackedByteArray {
        match self.world.as_mut().and_then(|world| world.save().ok()) {
            Some(bytes) => PackedByteArray::from(bytes.as_slice()),
            None => PackedByteArray::new(),
        }
    }

    #[func]
    fn load_save(&mut self, bytes: PackedByteArray) -> bool {
        match self.world.as_mut() {
            Some(world) => match world.load_save(bytes.as_slice()) {
                Ok(()) => true,
                Err(error) => {
                    godot_error!("world_load_save: {error}");
                    false
                }
            },
            None => false,
        }
    }
}
