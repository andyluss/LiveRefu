use crate::types::*;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidationError {
    pub code: String,
    pub path: String,
    pub message: String,
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} [{}] {}", self.code, self.path, self.message)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ValidationReport {
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationError>,
}

impl ValidationReport {
    pub fn is_ok(&self) -> bool {
        self.errors.is_empty()
    }

    fn error(&mut self, code: &str, path: impl Into<String>, message: impl Into<String>) {
        self.errors.push(ValidationError {
            code: code.to_string(),
            path: path.into(),
            message: message.into(),
        });
    }

    fn warn(&mut self, code: &str, path: impl Into<String>, message: impl Into<String>) {
        self.warnings.push(ValidationError {
            code: code.to_string(),
            path: path.into(),
            message: message.into(),
        });
    }
}

pub fn validate_pack(pack: &Pack) -> ValidationReport {
    let mut r = ValidationReport::default();
    validate_manifest(pack, &mut r);
    validate_world(pack, &mut r);
    validate_zones(pack, &mut r);
    validate_actors(pack, &mut r);
    validate_props(pack, &mut r);
    validate_items(pack, &mut r);
    validate_rules(pack, &mut r);
    validate_quests(pack, &mut r);
    validate_dialogues(pack, &mut r);
    validate_schedules(pack, &mut r);
    validate_loc(pack, &mut r);
    r
}

fn validate_manifest(pack: &Pack, r: &mut ValidationReport) {
    let m = &pack.manifest;
    if m.schema != 1 {
        r.error(
            "E-SCHEMA-001",
            "pack.json",
            format!("manifest.schema 必须为 1，实际为 {}", m.schema),
        );
    }
    if m.id.trim().is_empty() {
        r.error("E-MANIFEST-001", "pack.json", "manifest.id 不能为空");
    }
    if m.version.trim().is_empty() {
        r.error("E-MANIFEST-001", "pack.json", "manifest.version 不能为空");
    }
    if m.core_api.trim().is_empty() {
        r.error("E-MANIFEST-001", "pack.json", "manifest.core_api 不能为空");
    }
    if !m.kits.iter().any(|k| k == "core") {
        r.error("E-MANIFEST-002", "pack.json", "kits 必须包含 core");
    }
    if ![30, 60, 120].contains(&m.tick_hz) {
        r.error(
            "E-VALUE-001",
            "pack.json",
            format!("tick_hz 必须是 30/60/120，实际为 {}", m.tick_hz),
        );
    }
    if m.sim_profile != "arcade" && m.sim_profile != "engine_physics" {
        r.error(
            "E-VALUE-001",
            "pack.json",
            format!(
                "sim_profile 必须是 arcade/engine_physics，实际为 {}",
                m.sim_profile
            ),
        );
    }
    if !pack.zones.contains_key(&m.entry.start_zone) {
        r.error(
            "E-REF-001",
            "pack.json",
            format!("entry.start_zone 引用了不存在的区域 {}", m.entry.start_zone),
        );
    }
    if m.entry.world.trim().is_empty() {
        r.error("E-MANIFEST-001", "pack.json", "entry.world 不能为空");
    }
}

fn validate_world(pack: &Pack, r: &mut ValidationReport) {
    let w = &pack.world;
    if w.id.trim().is_empty() {
        r.error(
            "E-MANIFEST-001",
            "world/harbor.world.json",
            "world.id 不能为空",
        );
    }
    if w.start_zone != pack.manifest.entry.start_zone {
        r.warn(
            "E-WORLD-001",
            "world/harbor.world.json",
            format!(
                "world.start_zone ({}) 与 manifest.entry.start_zone ({}) 不一致",
                w.start_zone, pack.manifest.entry.start_zone
            ),
        );
    }
    if !pack.zones.contains_key(&w.start_zone) {
        r.error(
            "E-REF-001",
            "world/harbor.world.json",
            format!("start_zone 引用了不存在的区域 {}", w.start_zone),
        );
    }
    if parse_hhmm(&w.start_time).is_none() {
        r.error(
            "E-TIME-001",
            "world/harbor.world.json",
            format!("start_time 必须是 HH:MM，实际为 {}", w.start_time),
        );
    }
    if !finite3(w.player.at) {
        r.error(
            "E-VALUE-001",
            "world/harbor.world.json",
            "player.at 必须是有限数值",
        );
    }
    for s in &w.player.inventory {
        validate_item_stack(pack, &s.item, s.count, "world/harbor.world.json", r);
    }
}

fn validate_zones(pack: &Pack, r: &mut ValidationReport) {
    let mut persistents: BTreeMap<String, String> = BTreeMap::new();
    for (id, z) in &pack.zones {
        if z.id != *id {
            r.error(
                "E-REF-003",
                format!("world/zones/{id}.json"),
                format!("zone.id ({}) 与索引键 ({id}) 不一致", z.id),
            );
        }
        if !finite3(z.bounds.min) || !finite3(z.bounds.max) {
            r.error(
                "E-VALUE-001",
                format!("world/zones/{id}.json"),
                "bounds 必须是有限数值",
            );
        } else if z.bounds.min[0] >= z.bounds.max[0]
            || z.bounds.min[1] >= z.bounds.max[1]
            || z.bounds.min[2] >= z.bounds.max[2]
        {
            r.error(
                "E-VALUE-001",
                format!("world/zones/{id}.json"),
                "bounds.min 必须严格小于 bounds.max",
            );
        }
        for (i, p) in z.placements.iter().enumerate() {
            let path = format!("world/zones/{id}.json#placements[{i}]");
            if p.kind_count() != 1 {
                r.error(
                    "E-SCHEMA-002",
                    &path,
                    "placement 必须且只能指定 actor/prop/item 之一",
                );
            }
            if !finite3(p.at) {
                r.error("E-VALUE-001", &path, "placement.at 必须是有限数值");
            }
            if let Some(content) = p.content_id() {
                let exists = if p.actor.is_some() {
                    pack.actors.contains_key(content)
                } else if p.prop.is_some() {
                    pack.props.contains_key(content)
                } else {
                    pack.items.contains_key(content)
                };
                if !exists {
                    r.error(
                        "E-REF-001",
                        &path,
                        format!("placement 引用了不存在的定义 {content}"),
                    );
                }
            }
            if p.persistent_id.trim().is_empty() {
                r.error("E-REF-002", &path, "persistent_id 不能为空");
            } else if let Some(prev) = persistents.insert(p.persistent_id.clone(), path.clone()) {
                r.error(
                    "E-REF-002",
                    &path,
                    format!("persistent_id {} 与 {} 重复", p.persistent_id, prev),
                );
            }
        }
    }
}

fn validate_actors(pack: &Pack, r: &mut ValidationReport) {
    for (id, a) in &pack.actors {
        let path = format!("world/actors/{id}.json");
        if a.id != *id {
            r.error(
                "E-REF-003",
                &path,
                format!("actor.id ({}) 与索引键 ({id}) 不一致", a.id),
            );
        }
        if !matches!(a.body.shape.as_str(), "capsule" | "aabb" | "sphere") {
            r.error(
                "E-VALUE-001",
                &path,
                format!("body.shape 不支持: {}", a.body.shape),
            );
        }
        if a.stats.health <= 0 {
            r.error("E-VALUE-001", &path, "stats.health 必须大于 0");
        }
        if !a.stats.speed.is_finite() || a.stats.speed < 0.0 {
            r.error("E-VALUE-001", &path, "stats.speed 必须是 >= 0 的有限数值");
        }
        if let Some(inv) = &a.inventory {
            for s in &inv.items {
                validate_item_stack(pack, &s.item, s.count, &path, r);
            }
        }
        if let Some(brain) = &a.brain {
            if let Some(schedule) = &brain.schedule {
                if !pack.schedules.contains_key(schedule) {
                    r.error(
                        "E-REF-001",
                        &path,
                        format!("brain.schedule 引用了不存在的日程 {schedule}"),
                    );
                }
            }
        }
        if let Some(dialogue) = &a.dialogue {
            if !pack.dialogues.contains_key(dialogue) {
                r.error(
                    "E-REF-001",
                    &path,
                    format!("dialogue 引用了不存在的对话 {dialogue}"),
                );
            }
        }
        if a.name.starts_with("loc:") && !pack.loc_has(&a.name) {
            r.error("E-LOC-001", &path, format!("缺少文案 {}", a.name));
        }
    }
}

fn validate_props(pack: &Pack, r: &mut ValidationReport) {
    for (id, p) in &pack.props {
        let path = format!("world/props/{id}.json");
        if p.id != *id {
            r.error(
                "E-REF-003",
                &path,
                format!("prop.id ({}) 与索引键 ({id}) 不一致", p.id),
            );
        }
        if !matches!(p.body.shape.as_str(), "capsule" | "aabb" | "sphere") {
            r.error(
                "E-VALUE-001",
                &path,
                format!("body.shape 不支持: {}", p.body.shape),
            );
        }
        if p.interactable.verbs.is_empty() {
            r.error("E-VALUE-001", &path, "interactable.verbs 不能为空");
        }
        if let Some(item) = &p.locked_by {
            if !pack.items.contains_key(item) {
                r.error(
                    "E-REF-001",
                    &path,
                    format!("locked_by 引用了不存在的物品 {item}"),
                );
            }
        }
        if p.name.starts_with("loc:") && !pack.loc_has(&p.name) {
            r.error("E-LOC-001", &path, format!("缺少文案 {}", p.name));
        }
    }
}

fn validate_items(pack: &Pack, r: &mut ValidationReport) {
    for (id, i) in &pack.items {
        let path = format!("world/items/{id}.json");
        if i.id != *id {
            r.error(
                "E-REF-003",
                &path,
                format!("item.id ({}) 与索引键 ({id}) 不一致", i.id),
            );
        }
        if i.stack == 0 {
            r.error("E-VALUE-001", &path, "stack 必须大于 0");
        }
        if i.name.starts_with("loc:") && !pack.loc_has(&i.name) {
            r.error("E-LOC-001", &path, format!("缺少文案 {}", i.name));
        }
    }
}

fn validate_rules(pack: &Pack, r: &mut ValidationReport) {
    for (id, rule) in &pack.rules {
        let path = format!("rules/{id}.json");
        if !matches!(rule.on.as_str(), "interact" | "talk" | "pickup") {
            r.error("E-RULE-001", &path, format!("on 不支持: {}", rule.on));
        }
        if let Some(target) = &rule.target {
            if !content_exists(pack, target) {
                r.error(
                    "E-REF-001",
                    &path,
                    format!("target 引用了不存在的内容 {target}"),
                );
            }
        }
        for c in &rule.when {
            validate_condition(pack, c, &path, r);
        }
        for a in rule.then.iter().chain(rule.otherwise.iter()) {
            validate_action(pack, a, &path, r);
        }
    }
}

fn validate_condition(pack: &Pack, c: &ConditionDef, path: &str, r: &mut ValidationReport) {
    match c {
        ConditionDef::HasItem { item } => {
            if !pack.items.contains_key(item) {
                r.error(
                    "E-REF-001",
                    path,
                    format!("has_item 引用了不存在的物品 {item}"),
                );
            }
        }
        ConditionDef::Flag { flag, .. } => {
            if flag.trim().is_empty() {
                r.error("E-VALUE-001", path, "flag 不能为空");
            }
        }
        ConditionDef::QuestActive { quest } => {
            if !pack.quests.contains_key(quest) {
                r.error(
                    "E-REF-001",
                    path,
                    format!("quest_active 引用了不存在的任务 {quest}"),
                );
            }
        }
    }
}

fn validate_action(pack: &Pack, a: &ActionDef, path: &str, r: &mut ValidationReport) {
    match a {
        ActionDef::SetFlag { flag, .. } => {
            if flag.trim().is_empty() {
                r.error("E-VALUE-001", path, "set_flag.flag 不能为空");
            }
        }
        ActionDef::Toast { text } => {
            if text.starts_with("loc:") && !pack.loc_has(text) {
                r.error("E-LOC-001", path, format!("缺少文案 {text}"));
            }
        }
        ActionDef::PlaySound { id } => {
            if id.trim().is_empty() {
                r.error("E-VALUE-001", path, "play_sound.id 不能为空");
            }
        }
        ActionDef::Emit { event } => {
            if event.trim().is_empty() {
                r.error("E-VALUE-001", path, "emit.event 不能为空");
            }
        }
        ActionDef::GiveItem { item, count } => {
            validate_item_stack(pack, item, *count, path, r);
        }
        ActionDef::StartQuest { quest } => {
            if !pack.quests.contains_key(quest) {
                r.error(
                    "E-REF-001",
                    path,
                    format!("start_quest 引用了不存在的任务 {quest}"),
                );
            }
        }
    }
}

fn validate_quests(pack: &Pack, r: &mut ValidationReport) {
    for (id, q) in &pack.quests {
        let path = format!("quests/{id}.json");
        if q.objectives.is_empty() {
            r.error("E-VALUE-001", &path, "objectives 不能为空");
        }
        if q.title.starts_with("loc:") && !pack.loc_has(&q.title) {
            r.error("E-LOC-001", &path, format!("缺少文案 {}", q.title));
        }
        for o in &q.objectives {
            match o {
                ObjectiveDef::Talk { target } => {
                    if !content_exists(pack, target) {
                        r.error("E-REF-001", &path, format!("talk 目标不存在 {target}"));
                    }
                }
                ObjectiveDef::Flag { flag, .. } => {
                    if flag.trim().is_empty() {
                        r.error("E-VALUE-001", &path, "flag 不能为空");
                    }
                }
                ObjectiveDef::Acquire { item } => {
                    if !pack.items.contains_key(item) {
                        r.error("E-REF-001", &path, format!("acquire 物品不存在 {item}"));
                    }
                }
            }
        }
        for reward in &q.rewards {
            match reward {
                RewardDef::Flag { flag, .. } => {
                    if flag.trim().is_empty() {
                        r.error("E-VALUE-001", &path, "reward.flag 不能为空");
                    }
                }
                RewardDef::Item { item, count } => {
                    validate_item_stack(pack, item, *count, &path, r);
                }
            }
        }
    }
}

fn validate_dialogues(pack: &Pack, r: &mut ValidationReport) {
    for (id, d) in &pack.dialogues {
        let path = format!("dialogue/{id}.json");
        if !d.nodes.contains_key(&d.start) {
            r.error("E-DLG-001", &path, format!("start 节点不存在: {}", d.start));
        }
        let mut reachable = BTreeSet::new();
        if d.nodes.contains_key(&d.start) {
            reachable.insert(d.start.clone());
        }
        for (node_id, node) in &d.nodes {
            if node.text.starts_with("loc:") && !pack.loc_has(&node.text) {
                r.error(
                    "E-LOC-001",
                    &path,
                    format!("节点 {node_id} 缺少文案 {}", node.text),
                );
            }
            if let Some(next) = &node.next {
                if !d.nodes.contains_key(next) {
                    r.error(
                        "E-DLG-001",
                        &path,
                        format!("节点 {node_id} 的 next 不存在: {next}"),
                    );
                } else if reachable.contains(node_id) {
                    reachable.insert(next.clone());
                }
            }
            for c in &node.choices {
                if !d.nodes.contains_key(&c.next) {
                    r.error(
                        "E-DLG-001",
                        &path,
                        format!("节点 {node_id} 的选项 next 不存在: {}", c.next),
                    );
                } else if reachable.contains(node_id) {
                    reachable.insert(c.next.clone());
                }
            }
            if node.end != Some(true) && node.next.is_none() && node.choices.is_empty() {
                r.warn(
                    "E-DLG-002",
                    &path,
                    format!("节点 {node_id} 既不是 end，也没有 next/choices"),
                );
            }
        }
        for node_id in d.nodes.keys() {
            if !reachable.contains(node_id) {
                r.warn(
                    "E-DLG-003",
                    &path,
                    format!("节点 {node_id} 从 start 不可达"),
                );
            }
        }
    }
}

fn validate_schedules(pack: &Pack, r: &mut ValidationReport) {
    for (id, s) in &pack.schedules {
        let path = format!("schedules/{id}.json");
        if s.entries.is_empty() {
            r.error("E-VALUE-001", &path, "entries 不能为空");
        }
        for (i, e) in s.entries.iter().enumerate() {
            if parse_hhmm(&e.from).is_none() || parse_hhmm(&e.to).is_none() {
                r.error(
                    "E-TIME-001",
                    &path,
                    format!("entries[{i}] 的 from/to 必须是 HH:MM"),
                );
            }
            if e.from == e.to {
                r.error(
                    "E-TIME-001",
                    &path,
                    format!("entries[{i}] 的 from/to 不能相同"),
                );
            }
            if e.behavior.trim().is_empty() {
                r.error(
                    "E-VALUE-001",
                    &path,
                    format!("entries[{i}].behavior 不能为空"),
                );
            }
        }
    }
}

fn validate_loc(pack: &Pack, r: &mut ValidationReport) {
    if pack.loc.is_empty() {
        r.warn("E-LOC-001", "loc/", "没有文案表；中文内容将无法显示");
        return;
    }
    if !pack.loc.contains_key("zh-CN") {
        r.warn("E-LOC-001", "loc/", "缺少 zh-CN 文案表");
    }
}

fn validate_item_stack(pack: &Pack, item: &str, count: u32, path: &str, r: &mut ValidationReport) {
    if !pack.items.contains_key(item) {
        r.error("E-REF-001", path, format!("物品不存在: {item}"));
    }
    if count == 0 {
        r.error(
            "E-VALUE-001",
            path,
            format!("物品 {item} 的 count 不能为 0"),
        );
    }
}

fn content_exists(pack: &Pack, id: &str) -> bool {
    pack.actors.contains_key(id) || pack.props.contains_key(id) || pack.items.contains_key(id)
}

fn finite3(v: [f32; 3]) -> bool {
    v.iter().all(|x| x.is_finite())
}

pub fn parse_hhmm(s: &str) -> Option<u32> {
    let (h, m) = s.split_once(':')?;
    if h.len() != 2 || m.len() != 2 {
        return None;
    }
    let h: u32 = h.parse().ok()?;
    let m: u32 = m.parse().ok()?;
    if h > 23 || m > 59 {
        return None;
    }
    Some(h * 60 + m)
}
