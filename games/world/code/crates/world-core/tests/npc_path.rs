use std::path::PathBuf;
use world_core::World;
use world_pack::Pack;

fn solar_pack() -> Pack {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.solarfarm");
    Pack::load_dir(root).expect("solarfarm pack")
}

#[test]
fn scheduled_npc_walks_to_target_and_survives_save() {
    let pack = solar_pack();
    let hash = pack.hash().unwrap();
    let mut world = World::from_pack(&pack, hash).unwrap();
    world.tick_once();
    let npc = world.find_by_content_id("demo.solarfarm.botanist").unwrap();
    let before = world.entity(npc).unwrap().transform.position;
    assert!(
        !world.snapshot().npc_paths.is_empty(),
        "targeted schedule should create at least one NPC path"
    );

    for _ in 0..90 {
        world.tick_once();
    }
    let after = world.entity(npc).unwrap().transform.position;
    let moved = (after[0] - before[0]).abs() + (after[2] - before[2]).abs();
    assert!(moved > 0.1, "NPC should move along nav path, moved={moved}");

    let snapshot_hash = world.state_hash();
    let saved = world.save_bytes().unwrap();
    let restored = World::load_bytes(&pack, &saved).unwrap();
    assert_eq!(snapshot_hash, restored.state_hash());
    let restored_npc = restored
        .find_by_content_id("demo.solarfarm.botanist")
        .unwrap();
    let restored_pos = restored.entity(restored_npc).unwrap().transform.position;
    assert_eq!(after, restored_pos);
}

#[test]
fn legacy_harbor_has_no_npc_paths_and_keeps_golden_hash() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.harbor");
    let pack = Pack::load_dir(root).unwrap();
    let mut world = World::from_pack(&pack, pack.hash().unwrap()).unwrap();
    world.tick_once();
    let snap = world.snapshot();
    assert!(snap.npc_paths.is_empty());
    let json = serde_json::to_string(&snap).unwrap();
    assert!(!json.contains("\"npc_paths\""));
}
