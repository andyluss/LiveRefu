use std::path::PathBuf;
use world_core::{Command, World};
use world_pack::Pack;

fn pack() -> Pack {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.solarfarm");
    Pack::load_dir(root).expect("solarfarm pack")
}

#[test]
fn l4_l5_snapshot_talk_and_policy() {
    let pack = pack();
    let hash = pack.hash().unwrap();
    let mut world = World::from_pack(&pack, hash).unwrap();
    let initial = world.snapshot();
    assert!(initial.social.is_some());
    assert!(initial.systems.is_some());

    let player = world.find_by_content_id("player").unwrap();
    let mayor = world.find_by_content_id("demo.solarfarm.mayor").unwrap();
    world.queue_command(Command::Talk { actor: player, target: mayor });
    world.tick_once();
    let snap = world.snapshot();
    let social = snap.social.unwrap();
    assert!(social.relationships.values().any(|r| r.interactions == 1));
    assert!(social.reputation.get("player").copied().unwrap_or(0) > 0);

    world.queue_command(Command::SetSystemPolicy { policy: "irrigate".into() });
    world.tick_once();
    assert_eq!(world.snapshot().systems.unwrap().policy, "irrigate");

    let before = world.state_hash();
    let bytes = world.save_bytes().unwrap();
    let restored = World::load_bytes(&pack, &bytes).unwrap();
    assert_eq!(before, restored.state_hash());
}

#[test]
fn legacy_pack_omits_l4_l5_state() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.harbor");
    let pack = Pack::load_dir(root).unwrap();
    let world = World::from_pack(&pack, pack.hash().unwrap()).unwrap();
    let snap = world.snapshot();
    assert!(snap.social.is_none());
    assert!(snap.systems.is_none());
    let json = serde_json::to_string(&snap).unwrap();
    assert!(!json.contains("\"social\""));
    assert!(!json.contains("\"systems\""));
}
