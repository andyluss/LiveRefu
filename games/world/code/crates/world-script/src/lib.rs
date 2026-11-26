//! QuickJS ScriptHost：事件上下文 JSON → 命令数组。
//! 运行时只认识 `world_core::Command`；玩法规则/空间查询仍由世界层执行。

use rquickjs::{CaughtError, Context, Function, Runtime};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use world_core::{run_trace, run_trace_with_host, Command, RunResult, ScriptHost, Trace, World};
use world_pack::Pack;

pub const MAX_COMMANDS_PER_EVENT: usize = 128;
/// QuickJS 中断回调的粗粒度工作预算（不是墙钟）；防止脚本死循环卡住 tick。
const MAX_INTERRUPT_STEPS: u64 = 20_000;

/// M0 遗留的纯表达式评估，保留给 wasm spike/独立测试。
pub fn eval_bool(source: &str) -> Result<bool, String> {
    let runtime = Runtime::new().map_err(|e| format!("QuickJS Runtime: {e}"))?;
    let context = Context::full(&runtime).map_err(|e| format!("QuickJS Context: {e}"))?;
    context.with(|ctx| match ctx.eval::<bool, _>(source.as_bytes()) {
        Ok(value) => Ok(value),
        Err(error) => match CaughtError::catch(&ctx, Err::<bool, _>(error)) {
            Err(caught) => Err(format!("QuickJS eval: {caught}")),
            Ok(_) => Err("QuickJS eval: unreachable".to_string()),
        },
    })
}

const DISPATCH: &str = r#"
globalThis.__dshDispatch = function (input) {
  if (typeof onEvent !== "function") return "[]";
  var ctx = JSON.parse(input);
  var out = onEvent(ctx);
  return JSON.stringify(out == null ? [] : out);
};
"#;

pub struct QuickJsHost {
    // 先 drop contexts，最后 drop runtime；避免 Context 访问已释放的 Runtime。
    contexts: Vec<(String, Context)>,
    runtime: Runtime,
    max_commands: usize,
    budget: Arc<AtomicU64>,
}

impl QuickJsHost {
    pub fn from_pack(pack: &Pack) -> Result<Self, String> {
        Self::from_scripts(&pack.scripts)
    }

    pub fn from_scripts(scripts: &BTreeMap<String, String>) -> Result<Self, String> {
        let runtime = Runtime::new().map_err(|e| format!("QuickJS Runtime: {e}"))?;
        runtime.set_memory_limit(16 * 1024 * 1024);
        runtime.set_max_stack_size(1024 * 1024);
        let budget = Arc::new(AtomicU64::new(0));
        let budget_for_interrupt = Arc::clone(&budget);
        runtime.set_interrupt_handler(Some(Box::new(move || {
            budget_for_interrupt.fetch_add(1, Ordering::Relaxed) > MAX_INTERRUPT_STEPS
        })));
        let mut contexts = Vec::new();
        for (name, source) in scripts {
            budget.store(0, Ordering::Relaxed);
            let context =
                Context::full(&runtime).map_err(|e| format!("QuickJS Context {name}: {e}"))?;
            context.with(|ctx| {
                ctx.eval::<(), _>(source.as_bytes())
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                ctx.eval::<(), _>(DISPATCH.as_bytes())
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                Ok::<(), String>(())
            })?;
            contexts.push((name.clone(), context));
        }
        Ok(Self {
            runtime,
            contexts,
            max_commands: MAX_COMMANDS_PER_EVENT,
            budget,
        })
    }

    pub fn script_names(&self) -> Vec<&str> {
        self.contexts
            .iter()
            .map(|(name, _)| name.as_str())
            .collect()
    }
}

pub fn attach_script_host(world: &mut World, pack: &Pack) -> Result<(), String> {
    if pack.scripts.is_empty() {
        return Ok(());
    }
    world.set_script_host(Box::new(QuickJsHost::from_pack(pack)?));
    Ok(())
}

pub fn run_trace_with_scripts(
    pack: &Pack,
    trace: &Trace,
    keyframe_every: u64,
) -> Result<RunResult, String> {
    if pack.scripts.is_empty() {
        return run_trace(pack, trace, keyframe_every);
    }
    let host = QuickJsHost::from_pack(pack)?;
    run_trace_with_host(pack, trace, keyframe_every, Some(Box::new(host)))
}

impl ScriptHost for QuickJsHost {
    fn on_event(&mut self, context_json: &str) -> Result<Vec<Command>, String> {
        let _ = &self.runtime;
        self.budget.store(0, Ordering::Relaxed);
        let mut commands = Vec::new();
        for (name, context) in &self.contexts {
            let text = context.with(|ctx| {
                let dispatch: Function = ctx
                    .globals()
                    .get("__dshDispatch")
                    .map_err(|e| format!("脚本 {name} 缺少 dispatch: {e}"))?;
                dispatch
                    .call::<_, String>((context_json,))
                    .map_err(|e| format_script_error(&ctx, name, e))
            })?;
            let parsed: Vec<Command> = serde_json::from_str(&text)
                .map_err(|e| format!("脚本 {name} 返回的不是命令数组: {e}"))?;
            if commands.len() + parsed.len() > self.max_commands {
                return Err(format!(
                    "脚本 {name} 产生命令过多：单事件上限 {}",
                    self.max_commands
                ));
            }
            commands.extend(parsed);
        }
        Ok(commands)
    }
}

fn format_script_error(ctx: &rquickjs::Ctx<'_>, name: &str, error: rquickjs::Error) -> String {
    match CaughtError::catch(ctx, Err::<(), _>(error)) {
        Err(caught) => format!("脚本 {name}: {caught}"),
        Ok(_) => format!("脚本 {name}: unknown QuickJS error"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use world_core::World;

    fn orbit_pack() -> Pack {
        let root =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.orbit");
        Pack::load_dir(root).expect("orbit pack")
    }

    #[test]
    fn evaluates_a_rule_condition() {
        assert!(eval_bool("(1 + 1 === 2) && (3 > 2)").unwrap());
        assert!(!eval_bool("false").unwrap());
    }

    #[test]
    fn reports_script_errors_without_panicking() {
        let mut scripts = BTreeMap::new();
        scripts.insert(
            "bad".to_string(),
            "function onEvent(ctx) { throw new Error('boom'); }".to_string(),
        );
        let mut host = QuickJsHost::from_scripts(&scripts).unwrap();
        let error = host.on_event("{}").unwrap_err();
        assert!(error.contains("boom"), "{error}");
    }

    #[test]
    fn stops_a_runaway_script() {
        let mut scripts = BTreeMap::new();
        scripts.insert(
            "loop".to_string(),
            "function onEvent(ctx) { while (true) {} }".to_string(),
        );
        let mut host = QuickJsHost::from_scripts(&scripts).unwrap();
        assert!(host.on_event("{}").is_err());
    }

    #[test]
    fn script_can_open_a_door_command() {
        let pack = orbit_pack();
        let hash = pack.hash().unwrap();
        let mut world = World::from_pack(&pack, hash).unwrap();
        let mut scripts = BTreeMap::new();
        scripts.insert(
            "door".to_string(),
            r#"
            function onEvent(ctx) {
              if (ctx.event.kind !== "script.open") return [];
              const door = ctx.entities.find((e) => e.content_id === "demo.reactor");
              return door ? [{ op: "open_door", target: door.id }] : [];
            }
        "#
            .to_string(),
        );
        world.set_script_host(Box::new(QuickJsHost::from_scripts(&scripts).unwrap()));
        world.emit("script.open", None, serde_json::json!({}));
        world.tick_once();
        let reactor = world.find_by_content_id("demo.reactor").unwrap();
        assert!(world.entity(reactor).unwrap().door.as_ref().unwrap().open);
    }

    #[test]
    fn dispatches_commands_from_event_context() {
        let pack = orbit_pack();
        let hash = pack.hash().unwrap();
        let mut world = World::from_pack(&pack, hash).unwrap();
        world.set_script_host(Box::new(QuickJsHost::from_pack(&pack).unwrap()));
        let commander = world.find_by_content_id("demo.commander").unwrap();
        let reactor = world.find_by_content_id("demo.reactor").unwrap();
        let badge = world.find_by_content_id("item.badge").unwrap();
        world.queue_command(Command::Talk {
            actor: world.player,
            target: commander,
        });
        world.queue_command(Command::Pickup {
            actor: world.player,
            target: badge,
        });
        world.queue_command(Command::Interact {
            actor: world.player,
            target: reactor,
        });
        for _ in 0..5 {
            world.tick_once();
        }
        assert_eq!(world.flags.get("flag.script.reactor_seen"), Some(&true));
    }
}
