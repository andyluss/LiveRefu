//! M0 QuickJS spike：只验证「规则能编译/执行并返回布尔」，不接入完整脚本 API。
//! 真正的 ScriptHost（事件/命令/查询、预算、沙箱）在 M1 实现。

pub fn eval_bool(source: &str) -> Result<bool, String> {
    let runtime = rquickjs::Runtime::new().map_err(|e| format!("QuickJS Runtime: {e}"))?;
    let context = rquickjs::Context::full(&runtime).map_err(|e| format!("QuickJS Context: {e}"))?;
    context.with(|ctx| match ctx.eval::<bool, _>(source.as_bytes()) {
        Ok(value) => Ok(value),
        Err(error) => match rquickjs::CaughtError::catch(&ctx, Err::<bool, _>(error)) {
            Err(caught) => Err(format!("QuickJS eval: {caught}")),
            Ok(_) => Err("QuickJS eval: unreachable".to_string()),
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evaluates_a_rule_condition() {
        assert!(eval_bool("(1 + 1 === 2) && (3 > 2)").unwrap());
        assert!(!eval_bool("false").unwrap());
    }
}
