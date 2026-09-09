//! 真实数据集成测试：用主项目《明日频道》现成的 schema 契约去校验其数据表。
//!
//! 这验证的是：本 Ry 校验器是**忠实**的契约检查器 —— 对主项目既有合法数据必须**零误报**，
//! 同时证明它有能力覆盖这些真实 schema 用到的子集（type/enum/min/max/minLength/minItems/
//! required/properties/items/additionalProperties/pattern）。

use data_validator::{ValidationError, validate_table};
use serde_json::Value;
use std::path::PathBuf;

/// 从本 crate 定位主项目数据目录(LiveRefu/projects/tomorrows-channel/data)。
fn real_data_dirs() -> (PathBuf, PathBuf) {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let root = manifest.join("../../../"); // data-validator -> LiveRefu 根
    (
        root.join("projects/tomorrows-channel/data/schema"),
        root.join("projects/tomorrows-channel/data/tables"),
    )
}

#[test]
fn real_project_tables_all_pass() {
    let (schema_dir, data_dir) = real_data_dirs();
    let mut checked = 0usize;

    let mut entries: Vec<PathBuf> = std::fs::read_dir(&data_dir)
        .expect("数据目录应存在")
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.is_file() && p.extension().is_some_and(|x| x == "json"))
        .collect();
    entries.sort();

    for data_file in entries {
        let base = data_file
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();
        let schema_path = schema_dir.join(format!("{base}.schema.json"));
        if !schema_path.is_file() {
            continue; // 无对应 schema 的表跳过
        }
        let schema: Value =
            serde_json::from_str(&std::fs::read_to_string(&schema_path).unwrap()).unwrap();
        let data: Value =
            serde_json::from_str(&std::fs::read_to_string(&data_file).unwrap()).unwrap();
        let errors: Vec<ValidationError> = validate_table(&schema, &data, &base);
        assert!(
            errors.is_empty(),
            "表 `{base}` 应通过契约校验, 但发现违规: {errors:#?}"
        );
        checked += 1;
    }

    // 主项目现有 5 张表(meta/timer/channel/mixer_track/content_card), 至少应校验到 5 张
    assert!(checked >= 5, "至少应校验 5 张表, 实际 {checked}");
}
