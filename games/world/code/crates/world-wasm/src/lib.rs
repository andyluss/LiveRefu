//! M1 Web 预览的 wasm 门面：把 `World` 包成 JS 可调的对象。
//! 只暴露预览需要的能力；真正的引擎适配器仍走 C ABI。

use std::collections::BTreeMap;
use wasm_bindgen::prelude::*;
use world_core::{Command, Trace, World};
use world_pack::Pack;
use world_script::{attach_script_host, run_trace_with_scripts};

#[wasm_bindgen]
pub struct PreviewWorld {
    pack_json: String,
    pack: Pack,
    world: World,
}

#[wasm_bindgen]
impl PreviewWorld {
    #[wasm_bindgen(constructor)]
    pub fn new(pack_json: &str) -> Result<PreviewWorld, JsValue> {
        let pack = Pack::from_bundle_bytes(pack_json.as_bytes())
            .map_err(|e| JsValue::from_str(&format!("内容包解析失败: {e}")))?;
        let report = pack.validate();
        if !report.is_ok() {
            let message = report
                .errors
                .iter()
                .map(|e| e.to_string())
                .collect::<Vec<_>>()
                .join("; ");
            return Err(JsValue::from_str(&format!("内容包校验失败: {message}")));
        }
        let hash = pack
            .hash()
            .map_err(|e| JsValue::from_str(&format!("包哈希失败: {e}")))?;
        let mut world = World::from_pack(&pack, hash)
            .map_err(|e| JsValue::from_str(&format!("世界创建失败: {e}")))?;
        attach_script_host(&mut world, &pack)
            .map_err(|e| JsValue::from_str(&format!("脚本宿主失败: {e}")))?;
        Ok(Self {
            pack_json: pack_json.to_string(),
            pack,
            world,
        })
    }

    pub fn reset(&mut self) -> Result<(), JsValue> {
        let pack = Pack::from_bundle_bytes(self.pack_json.as_bytes())
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let hash = pack.hash().map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.pack = pack;
        let mut world = World::from_pack(&self.pack, hash).map_err(|e| JsValue::from_str(&e))?;
        attach_script_host(&mut world, &self.pack)
            .map_err(|e| JsValue::from_str(&format!("脚本宿主失败: {e}")))?;
        self.world = world;
        Ok(())
    }

    pub fn tick(&mut self, frame_dt_us: f64) -> u32 {
        self.world.advance(frame_dt_us.max(0.0) as u64)
    }

    pub fn pause(&mut self, paused: bool) {
        self.world.suspended = paused;
    }

    pub fn interact(&mut self, actor: &str, target: &str) -> Result<(), JsValue> {
        let actor = self.find(actor)?;
        let target = self.find(target)?;
        self.world
            .queue_command(Command::Interact { actor, target });
        Ok(())
    }

    pub fn set_system_policy(&mut self, policy: &str) -> Result<(), JsValue> {
        self.world.queue_command(Command::SetSystemPolicy {
            policy: policy.to_string(),
        });
        Ok(())
    }

    pub fn social_action(
        &mut self,
        actor: &str,
        target: &str,
        action: &str,
    ) -> Result<(), JsValue> {
        let actor_id = self
            .world
            .find_by_content_id(actor)
            .ok_or_else(|| JsValue::from_str("actor not found"))?;
        let target_id = self
            .world
            .find_by_content_id(target)
            .ok_or_else(|| JsValue::from_str("target not found"))?;
        self.world.queue_command(Command::SocialAction {
            actor: actor_id,
            target: Some(target_id),
            action: action.to_string(),
        });
        Ok(())
    }

    pub fn choose_dialogue(
        &mut self,
        dialogue: &str,
        node: &str,
        choice: usize,
    ) -> Result<(), JsValue> {
        self.world.queue_command(Command::ChooseDialogue {
            dialogue: dialogue.to_string(),
            node: node.to_string(),
            choice,
        });
        Ok(())
    }

    pub fn talk(&mut self, actor: &str, target: &str) -> Result<(), JsValue> {
        let actor = self.find(actor)?;
        let target = self.find(target)?;
        self.world.queue_command(Command::Talk { actor, target });
        Ok(())
    }

    pub fn pickup(&mut self, actor: &str, target: &str) -> Result<(), JsValue> {
        let actor = self.find(actor)?;
        let target = self.find(target)?;
        self.world.queue_command(Command::Pickup { actor, target });
        Ok(())
    }

    pub fn move_to(&mut self, x: f32, z: f32) -> Result<(), JsValue> {
        let player = self.find("player")?;
        self.world.queue_command(Command::MoveTo {
            actor: player,
            x,
            z,
        });
        Ok(())
    }

    pub fn set_move(&mut self, x: f32, z: f32) -> Result<(), JsValue> {
        let player = self.find("player")?;
        self.world.queue_command(Command::Move {
            actor: player,
            x,
            z,
        });
        Ok(())
    }

    pub fn command(&mut self, command_json: &str) -> Result<(), JsValue> {
        let command: Command = serde_json::from_str(command_json)
            .map_err(|e| JsValue::from_str(&format!("命令解析失败: {e}")))?;
        self.world.queue_command(command);
        Ok(())
    }

    /// 返回 `{ pack_id, pack_hash, final_hash, state: Snapshot, names, loc }`。
    pub fn state(&self) -> Result<String, JsValue> {
        let mut names: BTreeMap<String, String> = BTreeMap::new();
        for (id, actor) in &self.pack.actors {
            names.insert(id.clone(), actor.name.clone());
        }
        for (id, prop) in &self.pack.props {
            names.insert(id.clone(), prop.name.clone());
        }
        for (id, item) in &self.pack.items {
            names.insert(id.clone(), item.name.clone());
        }
        let mut quest_titles: BTreeMap<String, String> = BTreeMap::new();
        for (id, quest) in &self.pack.quests {
            quest_titles.insert(id.clone(), quest.title.clone());
        }
        let mut zones: BTreeMap<String, serde_json::Value> = BTreeMap::new();
        for (id, zone) in &self.pack.zones {
            zones.insert(
                id.clone(),
                serde_json::json!({"name": zone.name, "bounds": zone.bounds}),
            );
        }
        let value = serde_json::json!({
            "pack_id": self.pack.manifest.id,
            "pack_hash": self.world.pack_hash,
            "final_hash": format!("0x{:016x}", self.world.state_hash()),
            "state": self.world.snapshot(),
            "nav": self.world.nav_grid(),
            "names": names,
            "quest_titles": quest_titles,
            "zones": zones,
            "assets": self.pack.zone_assets(&self.world.zone_id),
            "loc": self.pack.default_locale(),
        });
        serde_json::to_string(&value)
            .map_err(|e| JsValue::from_str(&format!("状态序列化失败: {e}")))
    }

    pub fn poll_events(&mut self) -> String {
        let events = self.world.drain_events();
        serde_json::to_string(&events).unwrap_or_else(|_| "[]".to_string())
    }

    /// 用给定 trace 跑一遍独立世界，返回最终哈希；不改当前预览状态。
    pub fn replay(&self, trace_json: &str) -> Result<String, JsValue> {
        let trace: Trace = serde_json::from_str(trace_json)
            .map_err(|e| JsValue::from_str(&format!("trace 解析失败: {e}")))?;
        let result = run_trace_with_scripts(&self.pack, &trace, 60)
            .map_err(|e| JsValue::from_str(&format!("回放失败: {e}")))?;
        Ok(format!("0x{:016x}", result.final_hash))
    }
}

impl PreviewWorld {
    fn find(&self, content_id: &str) -> Result<world_core::EntityId, JsValue> {
        self.world
            .find_by_content_id(content_id)
            .ok_or_else(|| JsValue::from_str(&format!("找不到实体: {content_id}")))
    }
}
