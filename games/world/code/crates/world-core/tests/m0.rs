use std::path::PathBuf;
use world_core::{run_trace, Trace, World};
use world_pack::Pack;

fn demo_pack() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.harbor")
}

fn trace() -> Trace {
    let text = std::fs::read_to_string(demo_pack().join("tests/m0.trace.json")).unwrap();
    serde_json::from_str(&text).unwrap()
}

#[test]
fn determinism_two_runs_match() {
    let pack = Pack::load_dir(demo_pack()).unwrap();
    let a = run_trace(&pack, &trace(), 60).unwrap();
    let b = run_trace(&pack, &trace(), 60).unwrap();
    assert_eq!(a.final_hash, b.final_hash);
    assert_eq!(a.keyframes, b.keyframes);
    assert!(a.events.len() >= 10);
}

#[test]
fn save_load_roundtrip_preserves_hash() {
    let pack = Pack::load_dir(demo_pack()).unwrap();
    let hash = pack.hash().unwrap();
    let mut world = World::from_pack(&pack, hash).unwrap();
    for _ in 0..42 {
        world.tick_once();
    }
    let before = world.state_hash();
    let bytes = world.save_bytes().unwrap();
    let restored = World::load_bytes(&pack, &bytes).unwrap();
    assert_eq!(before, restored.state_hash());
}

#[test]
fn corrupt_save_is_rejected() {
    let pack = Pack::load_dir(demo_pack()).unwrap();
    let hash = pack.hash().unwrap();
    let mut world = World::from_pack(&pack, hash).unwrap();
    for _ in 0..5 {
        world.tick_once();
    }
    let bytes = world.save_bytes().unwrap();
    let mut text = String::from_utf8(bytes).unwrap();
    text = text.replacen("\"checksum\":", "\"checksum\": 1", 1);
    let result = World::load_bytes(&pack, text.as_bytes());
    assert!(result.is_err(), "篡改存档应被拒绝");
}

#[test]
fn different_ticks_different_hash() {
    let pack = Pack::load_dir(demo_pack()).unwrap();
    let a = run_trace(
        &pack,
        &Trace {
            ticks: 10,
            steps: vec![],
        },
        5,
    )
    .unwrap();
    let b = run_trace(
        &pack,
        &Trace {
            ticks: 20,
            steps: vec![],
        },
        5,
    )
    .unwrap();
    assert_ne!(a.final_hash, b.final_hash);
}

#[test]
fn tampered_checksum_is_rejected() {
    let pack = Pack::load_dir(demo_pack()).unwrap();
    let hash = pack.hash().unwrap();
    let mut world = World::from_pack(&pack, hash).unwrap();
    for _ in 0..5 {
        world.tick_once();
    }
    let bytes = world.save_bytes().unwrap();
    let mut value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let checksum = value["checksum"].as_u64().unwrap();
    value["checksum"] = serde_json::json!(checksum.wrapping_add(1));
    let tampered = serde_json::to_vec(&value).unwrap();
    let result = World::load_bytes(&pack, &tampered);
    let error = match result {
        Ok(_) => panic!("篡改 checksum 应被拒绝"),
        Err(error) => error,
    };
    assert!(error.contains("校验和"), "实际错误: {error}");
}

#[test]
fn movement_is_deterministic_and_blocked_by_closed_door() {
    use world_core::Command;
    let pack = Pack::load_dir(demo_pack()).unwrap();
    let hash = pack.hash().unwrap();
    let mut world = World::from_pack(&pack, hash).unwrap();
    let player = world.find_by_content_id("player").unwrap();
    let door = world.find_by_content_id("demo.airlock").unwrap();

    world.queue_command(Command::Move {
        actor: player,
        x: 0.0,
        z: 1.0,
    });
    for _ in 0..120 {
        world.tick_once();
    }
    let z = world.entity(player).unwrap().transform.position[2];
    assert!(z > 0.5, "玩家应向前移动，实际 z={z}");
    assert!(z < 5.6, "关闭的门应挡住玩家，实际 z={z}");

    world.entity_mut(door).unwrap().door.as_mut().unwrap().open = true;
    if let Some(player) = world.entity_mut(player) {
        player.transform.position = [0.0, 0.0, 0.0];
    }
    world.queue_command(Command::Move {
        actor: player,
        x: 0.0,
        z: 1.0,
    });
    for _ in 0..120 {
        world.tick_once();
    }
    let z = world.entity(player).unwrap().transform.position[2];
    assert!(z > 6.5, "打开的门不应挡住玩家，实际 z={z}");
}
