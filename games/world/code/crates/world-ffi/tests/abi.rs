use std::ptr;
use world_core::{run_trace, Trace};
use world_ffi::*;
use world_pack::Pack;

fn demo() -> (Pack, Vec<u8>) {
    let root =
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.harbor");
    let pack = Pack::load_dir(root).unwrap();
    let bundle = pack.to_bundle_bytes().unwrap();
    (pack, bundle)
}

fn config() -> WorldConfig {
    WorldConfig {
        abi_version: WORLD_ABI_VERSION,
        struct_size: std::mem::size_of::<WorldConfig>() as u32,
        user_data_dir: ptr::null(),
        locale: ptr::null(),
        flags: 0,
    }
}

fn send(handle: *mut WorldHandle, json: &str) {
    let mut out_len = 0usize;
    let status = world_command(
        handle,
        json.as_ptr(),
        json.len(),
        ptr::null_mut(),
        0,
        &mut out_len,
    );
    assert_eq!(status, WORLD_OK, "command: {}", json);
}

#[test]
fn abi_reaches_same_hash_as_headless() {
    let (pack, bundle) = demo();
    let trace: Trace = serde_json::from_str(
        &std::fs::read_to_string(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../../../data/demo.harbor/tests/m0.trace.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let expected = run_trace(&pack, &trace, 60).unwrap().final_hash;

    let cfg = config();
    let handle = world_create(&cfg);
    assert!(!handle.is_null());
    assert_eq!(
        world_load_pack(handle, bundle.as_ptr(), bundle.len()),
        WORLD_OK
    );

    let mut assets_len = 0usize;
    assert_eq!(
        world_zone_assets(
            handle,
            c"zone.harbor".as_ptr(),
            ptr::null_mut(),
            0,
            &mut assets_len
        ),
        WORLD_ERR_BUFFER_TOO_SMALL
    );
    let mut assets_buf = vec![0u8; assets_len];
    assert_eq!(
        world_zone_assets(
            handle,
            c"zone.harbor".as_ptr(),
            assets_buf.as_mut_ptr(),
            assets_buf.len(),
            &mut assets_len
        ),
        WORLD_OK
    );
    let assets: Vec<String> = serde_json::from_slice(&assets_buf[..assets_len]).unwrap();
    assert!(assets.contains(&"mesh.keeper".to_string()));
    assert!(assets.contains(&"mesh.airlock".to_string()));

    let player = world_find_entity(handle, c"player".as_ptr());
    let door = world_find_entity(handle, c"demo.airlock".as_ptr());
    let key = world_find_entity(handle, c"item.keycard".as_ptr());
    assert_ne!(player, WORLD_ENTITY_NONE);
    assert_ne!(door, WORLD_ENTITY_NONE);
    assert_ne!(key, WORLD_ENTITY_NONE);

    let i = |id: u64| ((id & 0xFFFF_FFFF) as u32, (id >> 32) as u32);
    let (pi, pg) = i(player);
    let (di, dg) = i(door);
    let (ki, kg) = i(key);

    for tick in 1..=600u32 {
        if tick == 10 {
            send(handle, &format!("{{\"op\":\"interact\",\"actor\":{{\"index\":{pi},\"generation\":{pg}}},\"target\":{{\"index\":{di},\"generation\":{dg}}}}}"));
        }
        if tick == 20 {
            send(handle, &format!("{{\"op\":\"pickup\",\"actor\":{{\"index\":{pi},\"generation\":{pg}}},\"target\":{{\"index\":{ki},\"generation\":{kg}}}}}"));
        }
        if tick == 30 {
            send(handle, &format!("{{\"op\":\"interact\",\"actor\":{{\"index\":{pi},\"generation\":{pg}}},\"target\":{{\"index\":{di},\"generation\":{dg}}}}}"));
        }
        if tick == 40 {
            let keeper = world_find_entity(handle, c"demo.keeper".as_ptr());
            let (ai, ag) = i(keeper);
            send(handle, &format!("{{\"op\":\"talk\",\"actor\":{{\"index\":{pi},\"generation\":{pg}}},\"target\":{{\"index\":{ai},\"generation\":{ag}}}}}"));
        }
        let mut advanced = 0u32;
        assert_eq!(world_tick(handle, 16666, &mut advanced), WORLD_OK);
        assert_eq!(advanced, 1);
    }

    let actual = world_state_hash(handle);
    world_destroy(handle);
    assert_eq!(actual, expected, "C ABI 与 headless 哈希不一致");
}

#[test]
fn save_load_through_abi() {
    let (_pack, bundle) = demo();
    let cfg = config();
    let handle = world_create(&cfg);
    assert_eq!(
        world_load_pack(handle, bundle.as_ptr(), bundle.len()),
        WORLD_OK
    );
    for _ in 0..60 {
        let mut advanced = 0u32;
        assert_eq!(world_tick(handle, 16666, &mut advanced), WORLD_OK);
    }
    let before = world_state_hash(handle);
    let mut len = 0usize;
    assert_eq!(
        world_save(handle, ptr::null_mut(), 0, &mut len),
        WORLD_ERR_BUFFER_TOO_SMALL
    );
    let mut buf = vec![0u8; len];
    assert_eq!(
        world_save(handle, buf.as_mut_ptr(), buf.len(), &mut len),
        WORLD_OK
    );
    buf.truncate(len);
    for _ in 0..60 {
        let mut advanced = 0u32;
        assert_eq!(world_tick(handle, 16666, &mut advanced), WORLD_OK);
    }
    assert_eq!(world_load_save(handle, buf.as_ptr(), buf.len()), WORLD_OK);
    assert_eq!(world_state_hash(handle), before);
    world_destroy(handle);
}
