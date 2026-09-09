//! 数据契约校验引擎(JSON Schema 子集) —— 实验 A 的验证底座。
//!
//! 本引擎把"数据契约"变成**机器可判定**的检查：给定一个 JSON Schema 子集与一份数据，
//! 递归校验类型 / 必填 / 枚举 / 数值范围 / 长度 / 数组大小 / 未知字段 / 正则，
//! 收集并返回**所有**违规（而非提前停止），供上层以非零退出拒绝。
//!
//! 支持的关键字：
//!   `type`(object/array/string/integer/number/boolean/null)、`enum`、`const`
//!   `minimum`/`maximum`「数值范围」
//!   `minLength`/`maxLength`「字符串长度(按码点)」
//!   `minItems`/`maxItems`「数组长度」
//!   `required`/`properties`/`additionalProperties`「对象」
//!   `items`「数组元素(schema)」
//!   `pattern`「正则(经 `regex` 编译)」
//!
//! 明示**不校验**的关键字（诚实边界，避免虚假声称）：
//!   `allOf` / `anyOf` / `oneOf` / `if` / `then` / `else` / `$defs` / `$ref` / `format`
//!   `default` / `$schema` / `$id` / `title` / `description` / `unit` / `$comment`。
//!   这些要么是元数据，要么是条件/引用语义；MVP 只覆盖主项目表格实际用到的可判定子集。
//!   注：`content_card.schema.json` 的 `allOf`(条件必填) 不在本引擎覆盖内，与工具
//!   [`check_data.py`](../../../../tools/check_data.py) 行为一致；现有表格数据不依赖它。

use regex::Regex;
use serde_json::Value;

/// 一条校验违规：定位到具体路径 + 说明。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidationError {
    /// 违规发生处，如 `channel.json[0].channel_id`；根为空字符串。
    pub path: String,
    /// 违规说明。
    pub message: String,
}

impl ValidationError {
    fn new(path: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            message: message.into(),
        }
    }
}

/// 递归校验 `value` 是否符合 `schema`，把违规追加到 `errors`。
///
/// - `path` 标记当前值在数据里的位置，用于精确定位。
/// - 类型不符时在报出一条类型错误后即返回（避免继续按错误类型做无意义校验）。
pub fn validate_value(
    value: &Value,
    schema: &Value,
    path: &str,
    errors: &mut Vec<ValidationError>,
) {
    // ---- 类型 ----
    if let Some(st) = schema.get("type").and_then(|v| v.as_str())
        && !type_ok(st, value)
    {
        errors.push(ValidationError::new(
            path,
            format!("type 应为 {st}, 实为 {}", type_name(value)),
        ));
        return;
    }

    // ---- 枚举 ----
    if let Some(enum_schema) = schema.get("enum").and_then(|v| v.as_array())
        && !enum_schema.iter().any(|e| e == value)
    {
        errors.push(ValidationError::new(path, format!("值 {value} 不在枚举内")));
        return;
    }

    // ---- 常量 ----
    if let Some(const_schema) = schema.get("const")
        && const_schema != value
    {
        errors.push(ValidationError::new(
            path,
            format!("值应为 const {const_schema}, 实为 {value}"),
        ));
        return;
    }

    // ---- 数值范围 ----
    if value.is_number()
        && let Some(n) = value.as_f64()
    {
        if let Some(lo) = schema.get("minimum").and_then(|v| v.as_f64())
            && n < lo
        {
            errors.push(ValidationError::new(path, format!("{n} < minimum {lo}")));
        }
        if let Some(hi) = schema.get("maximum").and_then(|v| v.as_f64())
            && n > hi
        {
            errors.push(ValidationError::new(path, format!("{n} > maximum {hi}")));
        }
    }

    // ---- 字符串长度 / 正则 ----
    if value.is_string()
        && let Some(s) = value.as_str()
    {
        let len = s.chars().count() as u64; // 按 Unicode 码点计(JSON Schema 2020-12 口径)
        if let Some(min) = schema.get("minLength").and_then(|v| v.as_u64())
            && len < min
        {
            errors.push(ValidationError::new(
                path,
                format!("长度 {len} < minLength {min}"),
            ));
        }
        if let Some(max) = schema.get("maxLength").and_then(|v| v.as_u64())
            && len > max
        {
            errors.push(ValidationError::new(
                path,
                format!("长度 {len} > maxLength {max}"),
            ));
        }
        if let Some(pattern) = schema.get("pattern").and_then(|v| v.as_str()) {
            match Regex::new(pattern) {
                Ok(re) => {
                    if !re.is_match(s) {
                        errors.push(ValidationError::new(
                            path,
                            format!("不匹配 pattern `{pattern}`"),
                        ));
                    }
                }
                // schema 的正则本身不合法 → 记为 schema 错误(而非数据错误)
                Err(e) => errors.push(ValidationError::new(
                    path,
                    format!("schema pattern 非法: {e}"),
                )),
            }
        }
    }

    // ---- 数组 ----
    if value.is_array() {
        let arr = value.as_array().expect("is_array 已保证真");
        if let Some(min) = schema.get("minItems").and_then(|v| v.as_u64())
            && (arr.len() as u64) < min
        {
            errors.push(ValidationError::new(
                path,
                format!("数组长度 {} < minItems {min}", arr.len()),
            ));
        }
        if let Some(max) = schema.get("maxItems").and_then(|v| v.as_u64())
            && (arr.len() as u64) > max
        {
            errors.push(ValidationError::new(
                path,
                format!("数组长度 {} > maxItems {max}", arr.len()),
            ));
        }
        if let Some(items) = schema.get("items") {
            if let Some(tuple_schemas) = items.as_array() {
                // 元组式 items: 逐元素匹配对应槽位 schema
                for (i, item) in arr.iter().enumerate() {
                    if let Some(item_schema) = tuple_schemas.get(i) {
                        validate_value(item, item_schema, &format!("{path}[{i}]"), errors);
                    }
                }
            } else {
                for (i, item) in arr.iter().enumerate() {
                    validate_value(item, items, &format!("{path}[{i}]"), errors);
                }
            }
        }
    }

    // ---- 对象 ----
    if value.is_object() {
        let obj = value.as_object().expect("is_object 已保证真");
        if let Some(req) = schema.get("required").and_then(|v| v.as_array()) {
            for r in req {
                if let Some(r_str) = r.as_str()
                    && !obj.contains_key(r_str)
                {
                    errors.push(ValidationError::new(path, format!("缺必填字段 '{r_str}'")));
                }
            }
        }
        let declared_keys: Vec<&str> =
            if let Some(props) = schema.get("properties").and_then(|v| v.as_object()) {
                for (key, sub) in props.iter() {
                    if let Some(child) = obj.get(key) {
                        validate_value(child, sub, &path_join(path, key), errors);
                    }
                }
                props.keys().map(|k| k.as_str()).collect()
            } else {
                Vec::new()
            };
        // additionalProperties: 仅当显式为 false 时, 拒绝未在 properties 声明的字段
        if schema.get("additionalProperties") == Some(&Value::Bool(false)) {
            for key in obj.keys() {
                if !declared_keys.contains(&key.as_str()) {
                    errors.push(ValidationError::new(
                        path,
                        format!("additionalProperties 为 false, 不允许未知字段 '{key}'"),
                    ));
                }
            }
        }
    }
}

/// 便捷入口：以空根路径校验一份数据，返回全部违规。
pub fn validate_data(schema: &Value, data: &Value) -> Vec<ValidationError> {
    let mut errors = Vec::new();
    validate_value(data, schema, "", &mut errors);
    errors
}

/// 表(顶层)文件便捷入口：以 `label` 作为根路径前缀以精确定位。
pub fn validate_table(schema: &Value, data: &Value, label: &str) -> Vec<ValidationError> {
    let mut errors = Vec::new();
    validate_value(data, schema, label, &mut errors);
    errors
}

fn type_ok(st: &str, value: &Value) -> bool {
    match st {
        "integer" => value.is_i64() || value.is_u64(),
        "number" => value.is_number(),
        "string" => value.is_string(),
        "boolean" => value.is_boolean(),
        "object" => value.is_object(),
        "array" => value.is_array(),
        "null" => value.is_null(),
        _ => true, // 未知 type 不拦截
    }
}

fn type_name(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(n) if n.is_i64() || n.is_u64() => "integer",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn path_join(path: &str, key: &str) -> String {
    if path.is_empty() {
        key.to_string()
    } else {
        format!("{path}.{key}")
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn integer_type_ok_and_range() {
        let schema = json!({"type":"integer","minimum":0,"maximum":10});
        // 合法
        assert!(validate_data(&schema, &json!(5)).is_empty());
        // 越上界
        assert!(!validate_data(&schema, &json!(11)).is_empty());
        // 越下界
        assert!(!validate_data(&schema, &json!(-1)).is_empty());
        // 类型错(浮点不算 integer)
        assert!(!validate_data(&schema, &json!(5.5)).is_empty());
    }

    #[test]
    fn enum_membership() {
        let schema = json!({"enum":["a","b","c"]});
        assert!(validate_data(&schema, &json!("a")).is_empty());
        assert!(!validate_data(&schema, &json!("z")).is_empty());
    }

    #[test]
    fn nested_required_and_pattern() {
        let schema = json!({
            "type":"object",
            "required":["id"],
            "properties":{"id":{"type":"string","pattern":"^[a-z][a-z0-9_]*$"}}
        });
        assert!(validate_data(&schema, &json!({"id":"tape_warm"})).is_empty());
        // id 含大写 → 违反 pattern
        assert!(!validate_data(&schema, &json!({"id":"Tape_Warm"})).is_empty());
        // 缺必填 id
        let errs = validate_data(&schema, &json!({"other":1}));
        assert!(errs.iter().any(|e| e.message.contains("缺必填字段")));
    }

    #[test]
    fn array_min_items_and_items() {
        let schema = json!({"type":"array","minItems":1,"items":{"type":"integer"}});
        assert!(validate_data(&schema, &json!([1, 2, 3])).is_empty());
        assert!(!validate_data(&schema, &json!([])).is_empty()); // 空数组违反 minItems
        assert!(!validate_data(&schema, &json!([1, "x"])).is_empty()); // 元素类型错
    }

    #[test]
    fn additional_properties_false_rejects_unknown() {
        let schema = json!({
            "type":"object",
            "additionalProperties":false,
            "properties":{"a":{"type":"integer"}}
        });
        assert!(validate_data(&schema, &json!({"a":1})).is_empty());
        let errs = validate_data(&schema, &json!({"a":1,"b":2}));
        assert!(errs.iter().any(|e| e.message.contains("未知字段 'b'")));
    }
}
