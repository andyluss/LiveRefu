use std::path::PathBuf;
use world_pack::Pack;

fn world_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

#[test]
fn demo_pack_is_valid() {
    let pack = Pack::load_dir(world_root().join("data/demo.harbor")).unwrap();
    let report = pack.validate();
    assert!(report.is_ok(), "{:?}", report.errors);
}

#[test]
fn invalid_fixtures_have_stable_codes() {
    let cases = [
        ("bad_schema", "E-SCHEMA-001"),
        ("missing_ref", "E-REF-001"),
        ("duplicate_persistent", "E-REF-002"),
        ("bad_time", "E-TIME-001"),
        ("dialogue_next", "E-DLG-001"),
        ("missing_loc", "E-LOC-001"),
    ];
    for (name, code) in cases {
        let pack = Pack::load_dir(world_root().join("test/fixtures/invalid").join(name)).unwrap();
        let report = pack.validate();
        assert!(!report.is_ok(), "{name} 应该校验失败");
        assert!(
            report.errors.iter().any(|e| e.code == code),
            "{name} 应包含 {code}，实际 {:?}",
            report.errors.iter().map(|e| &e.code).collect::<Vec<_>>()
        );
    }
}
