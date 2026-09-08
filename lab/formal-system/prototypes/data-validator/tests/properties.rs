//! 属性测试(Hypothesis 式)：用**随机生成**的输入验证校验器的行为性质, 而非靠样例。
//!
//! 每条属性把"校验器报告违规与否"与"该数据在数学/逻辑上的真值"对拍：
//! 校验器对合法的必须放行、对非法的必须拒绝。这样"行为正确性"就从"测几个样例"
//! 提升为"对大量随机输入机械验证"——这正是实验 A 想证明的"属性而非样例"。
//!
//! 注: `prop_assert_eq!` 的失败消息须用显式格式化参数(其宏展开不支持隐式捕获)。

use data_validator::validate_data;
use proptest::prelude::*;
use serde_json::json;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(2048))]

    // 数值范围：validator 的 min/max 判定必须与算术事实完全一致
    #[test]
    fn numeric_range_matches_arithmetic(lo in -1000i64..0, span in 0i64..100, n in -1200i64..300) {
        let hi = lo + span;
        let schema = json!({"type":"number", "minimum": lo, "maximum": hi});
        let data = json!(n);
        let errors = validate_data(&schema, &data);
        let should_fail = (n as f64) < (lo as f64) || (n as f64) > (hi as f64);
        prop_assert_eq!(
            errors.is_empty(),
            !should_fail,
            "n={} lo={} hi={} 应{} (不在 [lo,hi])",
            n,
            lo,
            hi,
            if should_fail { "失败" } else { "通过" }
        );
    }

    // 枚举：值在枚举内必放行, 否则必拒绝
    #[test]
    fn enum_membership(idx in 0usize..5) {
        let candidates = ["a", "b", "c", "z", "q"];
        let schema = json!({"enum": ["a", "b", "c"]});
        let data = json!(candidates[idx]);
        let errors = validate_data(&schema, &data);
        let in_enum = matches!(candidates[idx], "a" | "b" | "c");
        prop_assert_eq!(errors.is_empty(), in_enum, "值={} 属于枚举={}", candidates[idx], in_enum);
    }

    // minItems：数组长度与事实一致
    #[test]
    fn array_min_items(k in 0usize..6, len in 0usize..9) {
        let schema = json!({"type":"array", "minItems": k});
        let data = json!((0..len).map(|_| 0).collect::<Vec<_>>());
        let errors = validate_data(&schema, &data);
        let should_fail = len < k;
        prop_assert_eq!(errors.is_empty(), !should_fail, "len={} minItems={}", len, k);
    }

    // minLength：字符串码点长度与事实一致
    #[test]
    fn string_min_length(k in 0usize..6, s in "[a-z0-9]*") {
        let schema = json!({"type":"string", "minLength": k});
        let data = json!(s.as_str());
        let errors = validate_data(&schema, &data);
        let len = s.chars().count();
        let should_fail = len < k;
        prop_assert_eq!(errors.is_empty(), !should_fail, "len={} minLength={}", len, k);
    }

    // required：对象含必填键必放行, 否则必拒绝
    #[test]
    fn object_required(have in proptest::bool::ANY) {
        let schema = json!({"type":"object", "required": ["x"]});
        let data = if have { json!({"x": 1}) } else { json!({}) };
        let errors = validate_data(&schema, &data);
        prop_assert_eq!(errors.is_empty(), have, "have={}", have);
    }
}
