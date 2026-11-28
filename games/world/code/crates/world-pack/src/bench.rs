//! 真实 5k 基准内容生成器（开发/性能用途，不进入正式内容包）。
//!
//! 场景刻意覆盖：静态碰撞 Prop、带日程的 Actor、可拾取 Item、规则、任务、
//! 对话、10 个日程、2 个 ScriptHost 脚本、导航网格。所有内容由 seed 确定性生成。

use super::*;
use std::collections::BTreeMap;

pub const REAL5K_ID: &str = "bench.real5k";
pub const REAL5K_ZONE: &str = "zone.real5k";
pub const REAL5K_NAV: &str = "nav.real5k";
pub const REAL5K_PROP: &str = "bench.prop";
pub const REAL5K_ITEM: &str = "bench.item";
pub const REAL5K_ACTOR_PREFIX: &str = "bench.actor.";
pub const REAL5K_DIALOGUE_PREFIX: &str = "bench.dialogue.";
pub const REAL5K_SCHEDULE_PREFIX: &str = "bench.schedule.";

const PROP_COUNT: usize = 2_999;
const ACTOR_COUNT: usize = 1_500;
const V2_ACTOR_COUNT: usize = 4;
const ITEM_COUNT: usize = 500;
const ZONE_HALF: f32 = 120.0;
const NAV_CELL: f32 = 1.0;

pub fn real5k(seed: u64) -> Pack {
    real5k_with(seed, false)
}

/// v2: 150 actors have a schedule target and speed, so the benchmark includes
/// sustained NPC path-following in addition to the v1 mixed load.
pub fn real5k_v2(seed: u64) -> Pack {
    real5k_with(seed, true)
}

fn real5k_with(seed: u64, v2: bool) -> Pack {
    let mut placements = Vec::with_capacity(PROP_COUNT + ACTOR_COUNT + ITEM_COUNT);

    // 2999 个静态 Prop：留出中央区域和 z=0 走廊，保证玩家初始可达。
    let mut props = 0usize;
    'prop_loop: for iz in -80..=80 {
        for ix in -80..=80 {
            let x = ix as f32 * 1.5;
            let z = iz as f32 * 1.5;
            if x.abs() < 8.0 && z.abs() < 8.0 {
                continue;
            }
            if z.abs() < 2.0 {
                continue;
            }
            placements.push(Placement {
                actor: None,
                prop: Some(REAL5K_PROP.to_string()),
                item: None,
                at: [x, 0.0, z],
                yaw: 0.0,
                persistent_id: format!("prop.{props}"),
            });
            props += 1;
            if props >= PROP_COUNT {
                break 'prop_loop;
            }
        }
    }

    // 1500 个 Actor，均匀分布在半径 30..90 的环上。
    let mut actor_defs = (0..10)
        .map(|i| {
            let id = format!("{REAL5K_ACTOR_PREFIX}{i}");
            let def = ActorDef {
                id: id.clone(),
                name: format!("5k Actor {i}"),
                tags: vec!["bench".to_string(), "scheduled".to_string()],
                body: BodyDef {
                    shape: "capsule".to_string(),
                    radius: Some(0.35),
                    height: Some(1.7),
                    size: None,
                },
                stats: StatsDef {
                    health: 100,
                    speed: 0.0,
                },
                brain: Some(BrainDef {
                    profile: "bench".to_string(),
                    schedule: Some(format!("{REAL5K_SCHEDULE_PREFIX}{i}")),
                }),
                inventory: None,
                dialogue: Some(format!("{REAL5K_DIALOGUE_PREFIX}{i}")),
                visual: None,
            };
            (id, def)
        })
        .collect::<BTreeMap<_, _>>();
    if v2 {
        let mut def = actor_defs
            .get("bench.actor.0")
            .expect("actor.0 exists")
            .clone();
        def.id = "bench.actor.v2".to_string();
        def.stats.speed = 1.0;
        def.brain = Some(BrainDef {
            profile: "bench".to_string(),
            schedule: Some("bench.schedule.v2".to_string()),
        });
        actor_defs.insert(def.id.clone(), def);
    }

    for i in 0..ACTOR_COUNT {
        let angle = (i as f32 / ACTOR_COUNT as f32) * std::f32::consts::TAU;
        let radius = 30.0 + (i % 20) as f32 * 3.0;
        let x = angle.cos() * radius;
        let z = angle.sin() * radius;
        let actor_id = if v2 && i < V2_ACTOR_COUNT {
            "bench.actor.v2".to_string()
        } else {
            format!("{REAL5K_ACTOR_PREFIX}{}", i % 10)
        };
        placements.push(Placement {
            actor: Some(actor_id),
            prop: None,
            item: None,
            at: [x, 0.0, z],
            yaw: angle,
            persistent_id: format!("actor.{i}"),
        });
    }

    // 500 个可拾取 Item，放在中央与内环之间。
    for i in 0..ITEM_COUNT {
        let angle = (i as f32 / ITEM_COUNT as f32) * std::f32::consts::TAU;
        let radius = 10.0 + (i % 10) as f32 * 0.8;
        placements.push(Placement {
            actor: None,
            prop: None,
            item: Some(REAL5K_ITEM.to_string()),
            at: [angle.cos() * radius, 0.0, angle.sin() * radius],
            yaw: 0.0,
            persistent_id: format!("item.{i}"),
        });
    }

    let zone = ZoneDef {
        id: REAL5K_ZONE.to_string(),
        name: "5k Benchmark Zone".to_string(),
        bounds: Bounds {
            min: [-ZONE_HALF, 0.0, -ZONE_HALF],
            max: [ZONE_HALF, 20.0, ZONE_HALF],
        },
        nav: Some(REAL5K_NAV.to_string()),
        placements,
    };
    let mut zones = BTreeMap::new();
    zones.insert(zone.id.clone(), zone);

    let mut props_map = BTreeMap::new();
    props_map.insert(
        REAL5K_PROP.to_string(),
        PropDef {
            id: REAL5K_PROP.to_string(),
            name: "5k Static Prop".to_string(),
            tags: vec!["bench".to_string()],
            body: BodyDef {
                shape: "aabb".to_string(),
                radius: None,
                height: Some(1.2),
                size: Some([1.0, 1.2, 1.0]),
            },
            interactable: InteractableDef {
                verbs: vec!["interact".to_string()],
            },
            locked_by: None,
            visual: None,
        },
    );

    let mut items = BTreeMap::new();
    items.insert(
        REAL5K_ITEM.to_string(),
        ItemDef {
            id: REAL5K_ITEM.to_string(),
            name: "5k Sample".to_string(),
            stack: 1,
            tags: vec!["bench".to_string()],
            visual: None,
        },
    );

    let mut dialogues = BTreeMap::new();
    for i in 0..10 {
        let id = format!("{REAL5K_DIALOGUE_PREFIX}{i}");
        let mut nodes = BTreeMap::new();
        nodes.insert(
            "start".to_string(),
            DialogueNode {
                speaker: None,
                text: format!("Bench dialogue {i}"),
                choices: vec![],
                next: None,
                end: Some(true),
            },
        );
        dialogues.insert(
            id.clone(),
            DialogueDef {
                id,
                start: "start".to_string(),
                nodes,
            },
        );
    }

    let mut schedules = BTreeMap::new();
    for i in 0..10 {
        let id = format!("{REAL5K_SCHEDULE_PREFIX}{i}");
        let entries = [
            ("08:00", "08:10", "shift.a"),
            ("08:10", "08:20", "shift.b"),
            ("08:20", "08:30", "shift.c"),
            ("08:30", "08:40", "shift.a"),
            ("08:40", "08:50", "shift.b"),
            ("08:50", "09:00", "shift.c"),
            ("09:00", "09:10", "shift.a"),
            ("09:10", "09:20", "shift.b"),
        ]
        .iter()
        .map(|(from, to, behavior)| ScheduleEntry {
            from: (*from).to_string(),
            to: (*to).to_string(),
            behavior: (*behavior).to_string(),
            at: None,
            target: None,
        })
        .collect();
        schedules.insert(id.clone(), ScheduleDef { id, entries });
    }
    if v2 {
        schedules.insert(
            "bench.schedule.v2".to_string(),
            ScheduleDef {
                id: "bench.schedule.v2".to_string(),
                entries: vec![ScheduleEntry {
                    from: "00:00".to_string(),
                    to: "23:59".to_string(),
                    behavior: "patrol".to_string(),
                    at: Some(REAL5K_ZONE.to_string()),
                    target: Some([40.0, 0.0]),
                }],
            },
        );
    }

    let mut rules = BTreeMap::new();
    for i in 0..20 {
        rules.insert(
            format!("bench.rule.{i}"),
            RuleDef {
                id: format!("bench.rule.{i}"),
                on: "interact".to_string(),
                target: Some(REAL5K_PROP.to_string()),
                when: vec![],
                then: vec![
                    ActionDef::SetFlag {
                        flag: format!("flag.bench.rule.{i}"),
                        value: true,
                    },
                    ActionDef::Toast {
                        text: format!("bench rule {i}"),
                    },
                ],
                otherwise: vec![],
            },
        );
    }

    let mut quests = BTreeMap::new();
    for i in 0..20 {
        let id = format!("bench.quest.{i}");
        quests.insert(
            id.clone(),
            QuestDef {
                id,
                title: format!("5k Quest {i}"),
                auto_start: i == 0,
                objectives: vec![ObjectiveDef::Flag {
                    flag: "flag.bench.rule.0".to_string(),
                    value: true,
                }],
                rewards: vec![],
            },
        );
    }

    let mut navs = BTreeMap::new();
    navs.insert(
        REAL5K_NAV.to_string(),
        NavGridDef {
            id: REAL5K_NAV.to_string(),
            zone: REAL5K_ZONE.to_string(),
            cell: NAV_CELL,
            origin: [-ZONE_HALF, -ZONE_HALF],
            width: (ZONE_HALF * 2.0 / NAV_CELL) as u32,
            height: (ZONE_HALF * 2.0 / NAV_CELL) as u32,
            blocked: vec![],
        },
    );

    let manifest = PackManifest {
        schema: 1,
        id: REAL5K_ID.to_string(),
        version: "0.1.0".to_string(),
        core_api: ">=0.1 <0.2".to_string(),
        kits: vec![
            "core".to_string(),
            "interaction".to_string(),
            "inventory".to_string(),
            "quest".to_string(),
            "dialogue".to_string(),
            "director".to_string(),
            "save_profile".to_string(),
        ],
        entry: Entry {
            world: "world/bench.world.json".to_string(),
            start_zone: REAL5K_ZONE.to_string(),
        },
        sim_profile: "arcade".to_string(),
        tick_hz: 60,
        assets: None,
        loc: vec![],
        requires: vec![],
        optional: vec![],
        conflicts: vec![],
    };

    let world = WorldDef {
        id: "world.real5k".to_string(),
        start_zone: REAL5K_ZONE.to_string(),
        start_time: "08:00".to_string(),
        seed,
        player: PlayerSpawn {
            at: [0.0, 0.0, 0.0],
            inventory: vec![],
        },
        interaction_range: None,
        social: None,
        systems: None,
    };

    let mut loc = BTreeMap::new();
    let mut zh = BTreeMap::new();
    zh.insert("bench.title".to_string(), "真实 5k 基准".to_string());
    loc.insert("zh-CN".to_string(), zh);

    let mut scripts = BTreeMap::new();
    scripts.insert(
        "bench_pulse_a".to_string(),
        "function onEvent(ctx) { if (ctx.event.kind !== 'bench.pulse') return []; return [{op:'set_flag', flag:'flag.bench.pulse_a', value:true}]; }".to_string(),
    );
    scripts.insert(
        "bench_pulse_b".to_string(),
        "function onEvent(ctx) { if (ctx.event.kind !== 'bench.pulse') return []; return [{op:'set_flag', flag:'flag.bench.pulse_b', value:true}]; }".to_string(),
    );

    Pack {
        manifest,
        world,
        zones,
        actors: actor_defs,
        props: props_map,
        items,
        rules,
        quests,
        dialogues,
        schedules,
        navs,
        assets: BTreeMap::new(),
        loc,
        scripts,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn real5k_pack_is_valid_and_has_4999_placements() {
        let pack = real5k(42);
        assert_eq!(pack.zones[REAL5K_ZONE].placements.len(), 4_999);
        assert_eq!(pack.scripts.len(), 2);
        assert_eq!(pack.navs.len(), 1);
        assert_eq!(pack.schedules.len(), 10);
        assert_eq!(pack.rules.len(), 20);
        assert_eq!(pack.quests.len(), 20);
        let report = pack.validate();
        assert!(report.is_ok(), "{:?}", report.errors);
    }
}
