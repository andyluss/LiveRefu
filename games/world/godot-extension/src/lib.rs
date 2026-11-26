//! M2 Godot GDExtension 最小适配器：只通过 world-abi 的 C ABI 驱动内核。
//! 这里不做玩法/渲染；先证明 Godot 能加载同一包并跑出同一哈希。

use godot::classes::multi_mesh::TransformFormat;
use godot::classes::{BoxMesh, CapsuleMesh, Mesh, MeshInstance3D, MultiMesh, MultiMeshInstance3D, Node3D, PackedScene, SphereMesh, StandardMaterial3D};
use godot::prelude::*;
use std::collections::{HashMap, HashSet};
use world_abi::{AbiWorld, WorldTransformPod};

struct WorldExtension;

#[gdextension]
unsafe impl ExtensionLibrary for WorldExtension {}

#[derive(GodotClass)]
#[class(base = Node)]
struct WorldNode {
    base: Base<Node>,
    world: Option<AbiWorld>,
    views_root: Option<Gd<Node3D>>,
    views: HashMap<u64, Gd<Node3D>>,
    visual_scenes: HashMap<String, Gd<PackedScene>>,
    prev_transforms: HashMap<u64, WorldTransformPod>,
    target_transforms: HashMap<u64, WorldTransformPod>,
    multimesh: Option<Gd<MultiMesh>>,
    multimesh_node: Option<Gd<MultiMeshInstance3D>>,
    multimesh_kinds: u32,
    multimesh_capacity: i32,
    multimesh_count: i64,
}

#[godot_api]
impl INode for WorldNode {
    fn init(base: Base<Node>) -> Self {
        Self {
            base,
            world: None,
            views_root: None,
            views: HashMap::new(),
            visual_scenes: HashMap::new(),
            prev_transforms: HashMap::new(),
            target_transforms: HashMap::new(),
            multimesh: None,
            multimesh_node: None,
            multimesh_kinds: 0,
            multimesh_capacity: 0,
            multimesh_count: 0,
        }
    }
}

#[godot_api]
impl WorldNode {
    /// 从 GDScript 传入 `pack.data` 的完整字节。
    #[func]
    fn load_pack(&mut self, bytes: PackedByteArray) -> bool {
        self.clear_views();
        self.visual_scenes.clear();
        self.prev_transforms.clear();
        self.target_transforms.clear();
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
        let before = if self.target_transforms.is_empty() {
            world.copy_transforms().unwrap_or_default()
        } else {
            self.target_transforms.values().copied().collect::<Vec<_>>()
        };
        match world.tick(1_000_000 / 60) {
            Ok(ticks) => {
                let after = world.copy_transforms().unwrap_or_default();
                self.prev_transforms = before
                    .into_iter()
                    .map(|pod| (((pod.generation as u64) << 32) | pod.index as u64, pod))
                    .collect();
                self.target_transforms = after
                    .into_iter()
                    .map(|pod| (((pod.generation as u64) << 32) | pod.index as u64, pod))
                    .collect();
                ticks as i64
            }
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

    fn interpolated_transform(
        pod: &WorldTransformPod,
        prev: Option<&WorldTransformPod>,
        alpha: f32,
    ) -> Transform3D {
        let a = alpha.clamp(0.0, 1.0);
        let (position, rotation, scale) = if let Some(prev) = prev {
            (
                Vector3::new(prev.position[0], prev.position[1], prev.position[2]).lerp(
                    Vector3::new(pod.position[0], pod.position[1], pod.position[2]),
                    a,
                ),
                Quaternion::new(prev.rotation[0], prev.rotation[1], prev.rotation[2], prev.rotation[3])
                    .slerp(
                        Quaternion::new(pod.rotation[0], pod.rotation[1], pod.rotation[2], pod.rotation[3]),
                        a,
                    ),
                Vector3::new(prev.scale[0], prev.scale[1], prev.scale[2]).lerp(
                    Vector3::new(pod.scale[0], pod.scale[1], pod.scale[2]),
                    a,
                ),
            )
        } else {
            (
                Vector3::new(pod.position[0], pod.position[1], pod.position[2]),
                Quaternion::new(pod.rotation[0], pod.rotation[1], pod.rotation[2], pod.rotation[3]),
                Vector3::new(pod.scale[0], pod.scale[1], pod.scale[2]),
            )
        };
        Transform3D::new(
            Basis::from_quaternion(rotation) * Basis::from_scale(scale),
            position + Vector3::new(0.0, 0.6, 0.0),
        )
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

    fn make_fallback_view(flags: u32) -> Gd<Node3D> {
        let mut node = MeshInstance3D::new_alloc();
        node.set_mesh(&Self::make_mesh(flags));
        let mut material = StandardMaterial3D::new_gd();
        let hue = match flags & 0xFF {
            1 => 0.58,
            2 => 0.33,
            3 => 0.10,
            _ => 0.78,
        };
        material.set_albedo(Color::from_hsv(hue, 0.55, 0.85));
        node.set_material_override(&material);
        node.upcast()
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

    /// 由 GDScript 把 logical asset source 注册为 PackedScene；view pool 优先使用它。
    #[func]
    fn register_visual(&mut self, source: GString, scene: Gd<PackedScene>) -> bool {
        self.visual_scenes.insert(source.to_string(), scene);
        true
    }

    /// 按 kind mask 批量渲染静态实体；capacity 为实例上限。
    #[func]
    fn enable_multimesh(&mut self, kind_flags: i64, capacity: i64) -> bool {
        self.disable_multimesh();
        let mut mesh = BoxMesh::new_gd();
        mesh.set_size(Vector3::new(1.0, 1.2, 1.0));
        let mut multimesh = MultiMesh::new_gd();
        multimesh.set_transform_format(TransformFormat::TRANSFORM_3D);
        multimesh.set_mesh(&mesh);
        multimesh.set_instance_count(capacity.clamp(1, 100_000) as i32);
        multimesh.set_visible_instance_count(0);
        let mut node = MultiMeshInstance3D::new_alloc();
        node.set_multimesh(&multimesh);
        self.ensure_views_root().add_child(&node);
        self.multimesh = Some(multimesh);
        self.multimesh_node = Some(node);
        self.multimesh_kinds = kind_flags as u32;
        self.multimesh_capacity = capacity.clamp(1, 100_000) as i32;
        self.multimesh_count = 0;
        true
    }

    #[func]
    fn disable_multimesh(&mut self) {
        self.multimesh = None;
        if let Some(node) = self.multimesh_node.take() {
            node.free();
        }
        self.multimesh_kinds = 0;
        self.multimesh_capacity = 0;
        self.multimesh_count = 0;
    }

    #[func]
    fn multimesh_count(&self) -> i64 {
        self.multimesh_count
    }

    /// 把 C ABI transform 快照同步为 Godot 节点；按 EntityId 做池化/回收。
    #[func]
    fn sync_views(&mut self) -> i64 {
        self.sync_views_at(1.0)
    }

    /// 在 fixed tick 之间按 alpha 插值；play 场景使用。
    #[func]
    fn sync_views_at(&mut self, alpha: f32) -> i64 {
        let transforms = if self.target_transforms.is_empty() {
            match self
                .world
                .as_mut()
                .and_then(|world| world.copy_transforms().ok())
            {
                Some(values) => values,
                None => return -1,
            }
        } else {
            self.target_transforms.values().copied().collect()
        };
        let mut root = self.ensure_views_root();
        let mut alive = HashSet::new();
        let mut multimesh_count = 0i32;
        let use_multimesh = self.multimesh.is_some() && self.multimesh_kinds != 0;
        for pod in transforms {
            let key = ((pod.generation as u64) << 32) | pod.index as u64;
            let kind_bit = 1u32 << (pod.flags & 0xFF);
            if use_multimesh && (self.multimesh_kinds & kind_bit) != 0 {
                if multimesh_count < self.multimesh_capacity {
                    let prev = self.prev_transforms.get(&key);
                    let transform = Self::interpolated_transform(&pod, prev, alpha);
                    if let Some(multimesh) = self.multimesh.as_mut() {
                        multimesh.set_instance_transform(multimesh_count, transform);
                    }
                    multimesh_count += 1;
                }
                continue;
            }
            alive.insert(key);
            if !self.views.contains_key(&key) {
                let visual = self
                    .world
                    .as_mut()
                    .and_then(|world| world.entity_visual_source(pod.index, pod.generation).ok())
                    .unwrap_or_default();
                let node: Gd<Node3D> = if let Some(scene) = self.visual_scenes.get(&visual) {
                    match scene.instantiate().and_then(|node| node.try_cast::<Node3D>().ok()) {
                        Some(node) => node,
                        None => Self::make_fallback_view(pod.flags),
                    }
                } else {
                    Self::make_fallback_view(pod.flags)
                };
                if node.get_parent().is_none() {
                    root.add_child(&node);
                }
                self.views.insert(key, node);
            }
            if let Some(node) = self.views.get_mut(&key) {
                let prev = self.prev_transforms.get(&key);
                let a = alpha.clamp(0.0, 1.0);
                let pos = if let Some(prev) = prev {
                    Vector3::new(prev.position[0], prev.position[1], prev.position[2]).lerp(
                        Vector3::new(pod.position[0], pod.position[1], pod.position[2]),
                        a,
                    )
                } else {
                    Vector3::new(pod.position[0], pod.position[1], pod.position[2])
                };
                let rot = if let Some(prev) = prev {
                    Quaternion::new(prev.rotation[0], prev.rotation[1], prev.rotation[2], prev.rotation[3])
                        .slerp(
                            Quaternion::new(pod.rotation[0], pod.rotation[1], pod.rotation[2], pod.rotation[3]),
                            a,
                        )
                } else {
                    Quaternion::new(pod.rotation[0], pod.rotation[1], pod.rotation[2], pod.rotation[3])
                };
                node.set_position(pos);
                node.set_quaternion(rot);
                node.set_scale(if let Some(prev) = prev {
                    Vector3::new(prev.scale[0], prev.scale[1], prev.scale[2]).lerp(
                        Vector3::new(pod.scale[0], pod.scale[1], pod.scale[2]),
                        a,
                    )
                } else {
                    Vector3::new(pod.scale[0], pod.scale[1], pod.scale[2])
                });
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
        if let Some(multimesh) = self.multimesh.as_mut() {
            multimesh.set_visible_instance_count(multimesh_count);
        }
        self.multimesh_count = multimesh_count as i64;
        self.views.len() as i64
    }

    #[func]
    fn unregister_visual(&mut self, source: GString) -> bool {
        self.visual_scenes.remove(source.to_string().as_str()).is_some()
    }

    #[func]
    fn clear_visuals(&mut self) {
        self.visual_scenes.clear();
    }

    #[func]
    fn clear_views(&mut self) {
        self.disable_multimesh();
        for (_, node) in self.views.drain() {
            node.free();
        }
        if let Some(root) = self.views_root.take() {
            root.free();
        }
        self.prev_transforms.clear();
        self.target_transforms.clear();
    }

    #[func]
    fn view_count(&self) -> i64 {
        self.views.len() as i64
    }

    #[func]
    fn entity_position(&mut self, content_id: GString) -> Vector3 {
        let Some(world) = self.world.as_mut() else {
            return Vector3::ZERO;
        };
        let Some(entity) = world.find_entity(content_id.to_string().as_str()) else {
            return Vector3::ZERO;
        };
        let index = (entity & 0xFFFF_FFFF) as u32;
        let generation = (entity >> 32) as u32;
        for pod in world.copy_transforms().unwrap_or_default() {
            if pod.index == index && pod.generation == generation {
                return Vector3::new(pod.position[0], pod.position[1], pod.position[2]);
            }
        }
        Vector3::ZERO
    }

    #[func]
    fn entity_visual(&mut self, content_id: GString) -> GString {
        let Some(world) = self.world.as_mut() else {
            return GString::from("");
        };
        let Some(id) = world.find_entity(content_id.to_string().as_str()) else {
            return GString::from("");
        };
        let index = (id & 0xFFFF_FFFF) as u32;
        let generation = (id >> 32) as u32;
        match world.entity_visual_source(index, generation) {
            Ok(source) => GString::from(source.as_str()),
            Err(_) => GString::from(""),
        }
    }

    #[func]
    fn ui_state(&mut self) -> GString {
        match self.world.as_mut().and_then(|world| world.ui_state().ok()) {
            Some(text) => GString::from(text.as_str()),
            None => GString::from("{}"),
        }
    }

    #[func]
    fn zone_assets(&mut self, zone: GString) -> GString {
        match self.world.as_mut().and_then(|world| world.zone_assets(zone.to_string().as_str()).ok()) {
            Some(text) => GString::from(text.as_str()),
            None => GString::from("[]"),
        }
    }

    #[func]
    fn zone_status(&self, zone: GString) -> i64 {
        self.world
            .as_ref()
            .map(|world| world.zone_status(zone.to_string().as_str()) as i64)
            .unwrap_or(0)
    }

    #[func]
    fn activate_zone(&mut self, zone: GString) -> bool {
        match self.world.as_mut() {
            Some(world) => world.activate_zone(zone.to_string().as_str()).is_ok(),
            None => false,
        }
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

    fn send_move(&mut self, x: f32, z: f32) -> bool {
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
    fn set_move(&mut self, x: f32, z: f32) -> bool {
        self.send_move(x, z)
    }

    /// 2D 俯视输入：屏幕 x/y 映射到世界 x/z。
    #[func]
    fn set_move_2d(&mut self, x: f32, y: f32) -> bool {
        self.send_move(x, y)
    }

    /// 2.5D 等距输入：屏幕 x/y 映射到世界 x±z。
    #[func]
    fn set_move_iso(&mut self, x: f32, y: f32) -> bool {
        self.send_move(x - y, x + y)
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
