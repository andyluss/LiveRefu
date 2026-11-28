use crate::command::Command;

/// 脚本宿主的唯一边界：核心只认识「事件上下文 JSON → 命令数组」。
/// 实现放在 `world-script`（QuickJS）或未来其它运行时；核心不依赖具体脚本引擎。
pub trait ScriptHost {
    fn on_event(&mut self, context_json: &str) -> Result<Vec<Command>, String>;

    /// Deterministic per-tick hook. Used for delayed commands/timers; default no-op.
    fn on_tick(&mut self, _tick: u64) -> Result<Vec<Command>, String> {
        Ok(Vec::new())
    }

    /// Optional persistent state. Return `None` when the host has no state.
    fn state_json(&self) -> Option<String> {
        None
    }

    /// Restore persistent state. Default is a no-op for stateless hosts.
    fn restore_state(&mut self, _state: &str) -> Result<(), String> {
        Ok(())
    }

    /// Hot-reload script sources while keeping the host's persistent state.
    fn reload(
        &mut self,
        _scripts: &std::collections::BTreeMap<String, String>,
    ) -> Result<(), String> {
        Ok(())
    }
}
