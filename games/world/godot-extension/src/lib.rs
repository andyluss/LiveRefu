//! M2 Godot GDExtension 最小适配器：只通过 world-abi 的 C ABI 驱动内核。
//! 这里不做玩法/渲染；先证明 Godot 能加载同一包并跑出同一哈希。

use godot::prelude::*;
use world_abi::AbiWorld;

struct WorldExtension;

#[gdextension]
unsafe impl ExtensionLibrary for WorldExtension {}

#[derive(GodotClass)]
#[class(base = Node)]
struct WorldNode {
    base: Base<Node>,
    world: Option<AbiWorld>,
}

#[godot_api]
impl INode for WorldNode {
    fn init(base: Base<Node>) -> Self {
        Self { base, world: None }
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
        Some((world.find_entity(actor.to_string().as_str())?, world.find_entity(target.to_string().as_str())?))
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
        match self.world.as_mut().and_then(|world| world.poll_events().ok()) {
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
