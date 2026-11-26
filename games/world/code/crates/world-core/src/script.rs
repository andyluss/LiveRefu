use crate::command::Command;

/// 脚本宿主的唯一边界：核心只认识「事件上下文 JSON → 命令数组」。
/// 实现放在 `world-script`（QuickJS）或未来其它运行时；核心不依赖具体脚本引擎。
pub trait ScriptHost {
    fn on_event(&mut self, context_json: &str) -> Result<Vec<Command>, String>;
}
