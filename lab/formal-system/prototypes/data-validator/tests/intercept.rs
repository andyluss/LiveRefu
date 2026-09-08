//! 拦截测试：故意构造**非法**数据, 断言校验器必须抓住它们。
//!
//! 这是实验 A 的可验收行为：非法(越界/类型错/枚举越界/未知字段)必须被拒绝,
//! 而不是放行。这正是"AI 产出的数据契约错误在机器判定前就被拦住"的证明。

use data_validator::validate_table;
use serde_json::json;

#[test]
fn intercept_out_of_range() {
    // meta 表: focus_max 超过 maximum 240
    let schema = json!({
        "type":"object",
        "required":["pomodoro_work","focus_max"],
        "properties":{
            "pomodoro_work":{"type":"integer","minimum":1,"maximum":120},
            "focus_max":{"type":"integer","minimum":5,"maximum":240}
        }
    });
    let errors = validate_table(
        &schema,
        &json!({"pomodoro_work":25,"focus_max":1000}),
        "meta.json",
    );
    assert!(
        errors.iter().any(|e| e.message.contains("maximum")),
        "越上界的 focus_max 应被抓到, 实际: {errors:#?}"
    );
}

#[test]
fn intercept_pattern_violation() {
    // channel 表: channel_id 含大写, 违反 snake_case pattern
    let schema = json!({
        "type":"array",
        "items":{"type":"object","required":["channel_id"],"properties":{
            "channel_id":{"type":"string","pattern":"^[a-z][a-z0-9_]*$"}
        }}
    });
    let errors = validate_table(
        &schema,
        &json!([{"channel_id":"Tape_Warm"}]),
        "channel.json",
    );
    assert!(
        errors.iter().any(|e| e.message.contains("pattern")),
        "违反 pattern 的 channel_id 应被抓到, 实际: {errors:#?}"
    );
}

#[test]
fn intercept_enum_violation() {
    // content_card 表: rarity 为枚举外的值
    let schema = json!({
        "type":"array",
        "items":{"type":"object","required":["rarity"],"properties":{
            "rarity":{"enum":["common","rare","cult"]}
        }}
    });
    let errors = validate_table(
        &schema,
        &json!([{"rarity":"legendary"}]),
        "content_card.json",
    );
    assert!(
        errors.iter().any(|e| e.message.contains("枚举")),
        "枚举越界的 rarity 应被抓到, 实际: {errors:#?}"
    );
}

#[test]
fn intercept_unknown_field() {
    // channel 表: items 声明 additionalProperties=false, 未知键必须被拒
    let schema = json!({
        "type":"array",
        "items":{"type":"object","additionalProperties":false,
            "required":["channel_id"],
            "properties":{"channel_id":{"type":"string"}}
        }
    });
    let errors = validate_table(
        &schema,
        &json!([{"channel_id":"tape_warm","hacker":"x"}]),
        "channel.json",
    );
    assert!(
        errors.iter().any(|e| e.message.contains("未知字段")),
        "additionalProperties=false 下的未知字段应被抓到, 实际: {errors:#?}"
    );
}
