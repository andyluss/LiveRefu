//! QuickJS ScriptHost：事件上下文 JSON → 命令数组。
//! 运行时只认识 `world_core::Command`；玩法规则/空间查询仍由世界层执行。

use rquickjs::loader::{ImportAttributes, Loader, Resolver};
use rquickjs::promise::MaybePromise;
use rquickjs::{CaughtError, Context, Ctx, Function, Module, Result as JsResult, Runtime};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
#[cfg(not(target_arch = "wasm32"))]
use std::sync::Mutex;
#[cfg(not(target_arch = "wasm32"))]
use std::time::{Duration, Instant};
use world_core::{run_trace, run_trace_with_host, Command, RunResult, ScriptHost, Trace, World};
use world_pack::Pack;

pub const MAX_COMMANDS_PER_EVENT: usize = 128;
/// QuickJS 中断回调的粗粒度工作预算（不是墙钟）；防止脚本死循环卡住 tick。
const MAX_INTERRUPT_STEPS: u64 = 20_000;
#[cfg(not(target_arch = "wasm32"))]
const MAX_WALL_MS: u64 = 100;

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
globalThis.__dshState = globalThis.__dshState || {};
globalThis.__dshTimers = globalThis.__dshTimers || [];
globalThis.__dshNow = 0;
globalThis.__dshGetState = function () { return JSON.stringify(globalThis.__dshState || {}); };
globalThis.__dshSetState = function (input) { globalThis.__dshState = JSON.parse(input || "{}"); };
globalThis.__dshSchedule = function (ticks, work) {
  globalThis.__dshTimers.push({
    due: globalThis.__dshNow + Math.max(0, Number(ticks) || 0),
    work: work
  });
};
globalThis.__dshDispatch = function (input) {
  var fn = globalThis.__dshOnEvent || (typeof onEvent === "function" ? onEvent : null);
  if (typeof fn !== "function") return "[]";
  var ctx = JSON.parse(input);
  globalThis.__dshNow = Number(ctx.tick) || globalThis.__dshNow;
  ctx.state = globalThis.__dshState;
  ctx.after = function (ticks, commands) { globalThis.__dshSchedule(ticks, commands); };
  ctx.setTimeout = function (callback, ticks) { globalThis.__dshSchedule(ticks, callback); };
  var out = fn(ctx);
  if (out && typeof out.then === "function") {
    return out.then(function (value) { return JSON.stringify(value == null ? [] : value); });
  }
  return JSON.stringify(out == null ? [] : out);
};
globalThis.__dshTick = function (tick) {
  globalThis.__dshNow = tick;
  var due = [];
  var keep = [];
  for (var i = 0; i < globalThis.__dshTimers.length; i++) {
    var timer = globalThis.__dshTimers[i];
    if (timer.due <= tick) due.push(timer); else keep.push(timer);
  }
  globalThis.__dshTimers = keep;
  var out = [];
  for (var j = 0; j < due.length; j++) {
    var value = typeof due[j].work === "function" ? due[j].work() : due[j].work;
    if (Array.isArray(value)) out = out.concat(value);
  }
  return JSON.stringify(out);
};
"#;

#[derive(Clone, Debug)]
struct ModuleSources(BTreeMap<String, Vec<u8>>);

impl ModuleSources {
    fn from_scripts(scripts: &BTreeMap<String, String>) -> Self {
        let mut sources = BTreeMap::new();
        for (name, source) in scripts {
            let key = name.trim_end_matches(".js").to_string();
            sources.insert(key.clone(), source.as_bytes().to_vec());
            sources
                .entry(name.clone())
                .or_insert_with(|| source.as_bytes().to_vec());
        }
        Self(sources)
    }

    fn get(&self, path: &str) -> Option<Vec<u8>> {
        let key = path
            .trim_start_matches("./")
            .trim_start_matches("scripts/")
            .trim_end_matches(".js");
        self.0
            .get(key)
            .cloned()
            .or_else(|| self.0.get(path).cloned())
    }
}

#[derive(Debug)]
struct ScriptResolver;

impl Resolver for ScriptResolver {
    fn resolve<'js>(
        &mut self,
        _ctx: &Ctx<'js>,
        base: &str,
        name: &str,
        _attributes: Option<ImportAttributes<'js>>,
    ) -> JsResult<String> {
        if !name.starts_with('.') {
            return Ok(name.to_string());
        }
        let dir = base.rsplit_once('/').map(|(dir, _)| dir).unwrap_or("");
        let path = if dir.is_empty() {
            name.to_string()
        } else {
            format!("{dir}/{name}")
        };
        Ok(path.replace("/./", "/"))
    }
}

#[derive(Debug)]
struct ScriptLoader {
    sources: ModuleSources,
}

impl Loader for ScriptLoader {
    fn load<'js>(
        &mut self,
        ctx: &Ctx<'js>,
        path: &str,
        _attributes: Option<ImportAttributes<'js>>,
    ) -> JsResult<Module<'js, rquickjs::module::Declared>> {
        let source = self
            .sources
            .get(path)
            .ok_or_else(|| rquickjs::Error::new_loading(path))?;
        Module::declare(ctx.clone(), path, source)
    }
}

pub struct QuickJsHost {
    // 先 drop contexts，最后 drop runtime；避免 Context 访问已释放的 Runtime。
    contexts: Vec<(String, Context)>,
    runtime: Runtime,
    max_commands: usize,
    budget: Arc<AtomicU64>,
    states: Vec<String>,
    #[cfg(not(target_arch = "wasm32"))]
    deadline: Arc<Mutex<Instant>>,
}

impl QuickJsHost {
    pub fn from_pack(pack: &Pack) -> Result<Self, String> {
        Self::from_scripts(&pack.scripts)
    }

    pub fn from_scripts(scripts: &BTreeMap<String, String>) -> Result<Self, String> {
        let runtime = Runtime::new().map_err(|e| format!("QuickJS Runtime: {e}"))?;
        runtime.set_memory_limit(16 * 1024 * 1024);
        runtime.set_max_stack_size(1024 * 1024);
        runtime.set_loader(
            ScriptResolver,
            ScriptLoader {
                sources: ModuleSources::from_scripts(scripts),
            },
        );
        let budget = Arc::new(AtomicU64::new(0));
        #[cfg(not(target_arch = "wasm32"))]
        let deadline = Arc::new(Mutex::new(
            Instant::now() + Duration::from_millis(MAX_WALL_MS),
        ));
        let budget_for_interrupt = Arc::clone(&budget);
        #[cfg(not(target_arch = "wasm32"))]
        let deadline_for_interrupt = Arc::clone(&deadline);
        runtime.set_interrupt_handler(Some(Box::new(move || {
            if budget_for_interrupt.fetch_add(1, Ordering::Relaxed) > MAX_INTERRUPT_STEPS {
                return true;
            }
            #[cfg(not(target_arch = "wasm32"))]
            {
                return deadline_for_interrupt
                    .lock()
                    .map(|deadline| Instant::now() > *deadline)
                    .unwrap_or(true);
            }
            #[cfg(target_arch = "wasm32")]
            {
                false
            }
        })));
        let mut contexts = Vec::new();
        for (name, source) in scripts {
            let is_module = source.contains("export ") || source.contains("import ");
            if is_module && !source.contains("onEvent") {
                // Imported helper modules are loaded on demand by the module
                // loader; they are not top-level event handlers.
                continue;
            }
            budget.store(0, Ordering::Relaxed);
            let context =
                Context::full(&runtime).map_err(|e| format!("QuickJS Context {name}: {e}"))?;
            context.with(|ctx| {
                if is_module {
                    let module_name = format!("scripts/{name}.js");
                    let (module, promise) =
                        Module::declare(ctx.clone(), module_name, source.as_bytes())
                            .map_err(|e| format_script_error(&ctx, name, e))?
                            .eval()
                            .map_err(|e| format_script_error(&ctx, name, e))?;
                    promise
                        .finish::<()>()
                        .map_err(|e| format_script_error(&ctx, name, e))?;
                    let handler: Function = module
                        .get("onEvent")
                        .map_err(|e| format!("脚本 {name} 没有导出 onEvent: {e}"))?;
                    ctx.globals()
                        .set("__dshOnEvent", handler)
                        .map_err(|e| format!("脚本 {name} 绑定 onEvent: {e}"))?;
                } else {
                    ctx.eval::<(), _>(source.as_bytes())
                        .map_err(|e| format_script_error(&ctx, name, e))?;
                }
                ctx.eval::<(), _>(DISPATCH.as_bytes())
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                Ok::<(), String>(())
            })?;
            contexts.push((name.clone(), context));
        }
        let states = contexts.iter().map(|_| "{}".to_string()).collect();
        Ok(Self {
            runtime,
            contexts,
            max_commands: MAX_COMMANDS_PER_EVENT,
            budget,
            states,
            #[cfg(not(target_arch = "wasm32"))]
            deadline,
        })
    }

    pub fn script_names(&self) -> Vec<&str> {
        self.contexts
            .iter()
            .map(|(name, _)| name.as_str())
            .collect()
    }

    fn state_map(&self) -> BTreeMap<String, String> {
        self.contexts
            .iter()
            .enumerate()
            .map(|(index, (name, _))| (name.clone(), self.states[index].clone()))
            .collect()
    }

    /// Rebuild contexts/runtime from new sources, preserving per-script state.
    pub fn reload_from_scripts(
        &mut self,
        scripts: &BTreeMap<String, String>,
    ) -> Result<(), String> {
        let old_states = self.state_map();
        let mut next = Self::from_scripts(scripts)?;
        for (index, (name, _)) in next.contexts.iter().enumerate() {
            if let Some(state) = old_states.get(name) {
                next.states[index] = state.clone();
            }
        }
        *self = next;
        Ok(())
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
    fn on_tick(&mut self, tick: u64) -> Result<Vec<Command>, String> {
        let mut commands = Vec::new();
        for (index, (name, context)) in self.contexts.iter().enumerate() {
            let state = self.states[index].clone();
            let (text, next_state) = context.with(|ctx| {
                let set_state: Function = ctx
                    .globals()
                    .get("__dshSetState")
                    .map_err(|e| format!("脚本 {name} 缺少 state dispatcher: {e}"))?;
                set_state
                    .call::<_, ()>((state,))
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                let tick_fn: Function = ctx
                    .globals()
                    .get("__dshTick")
                    .map_err(|e| format!("脚本 {name} 缺少 tick dispatcher: {e}"))?;
                let text = tick_fn
                    .call::<_, String>((tick,))
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                let get_state: Function = ctx
                    .globals()
                    .get("__dshGetState")
                    .map_err(|e| format!("脚本 {name} 缺少 state getter: {e}"))?;
                let next_state = get_state
                    .call::<_, String>(())
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                Ok::<_, String>((text, next_state))
            })?;
            self.states[index] = next_state;
            let parsed: Vec<Command> = serde_json::from_str(&text)
                .map_err(|e| format!("脚本 {name} tick 返回的不是命令数组: {e}"))?;
            commands.extend(parsed);
        }
        Ok(commands)
    }

    fn reload(&mut self, scripts: &BTreeMap<String, String>) -> Result<(), String> {
        self.reload_from_scripts(scripts)
    }

    fn state_json(&self) -> Option<String> {
        let states = self.state_map();
        if states.values().all(|state| state == "{}") {
            return None;
        }
        serde_json::to_string(&states).ok()
    }

    fn restore_state(&mut self, state: &str) -> Result<(), String> {
        let states: BTreeMap<String, String> =
            serde_json::from_str(state).map_err(|e| format!("脚本状态 JSON 解析失败: {e}"))?;
        for (index, (name, _)) in self.contexts.iter().enumerate() {
            if let Some(value) = states.get(name) {
                self.states[index] = value.clone();
            }
        }
        Ok(())
    }

    fn on_event(&mut self, context_json: &str) -> Result<Vec<Command>, String> {
        let _ = &self.runtime;
        self.budget.store(0, Ordering::Relaxed);
        #[cfg(not(target_arch = "wasm32"))]
        #[cfg(not(target_arch = "wasm32"))]
        if let Ok(mut deadline) = self.deadline.lock() {
            *deadline = Instant::now() + Duration::from_millis(MAX_WALL_MS);
        }
        let mut commands = Vec::new();
        for (index, (name, context)) in self.contexts.iter().enumerate() {
            let state = self.states[index].clone();
            let (text, next_state) = context.with(|ctx| {
                let set_state: Function = ctx
                    .globals()
                    .get("__dshSetState")
                    .map_err(|e| format!("脚本 {name} 缺少 state dispatcher: {e}"))?;
                set_state
                    .call::<_, ()>((state,))
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                let dispatch: Function = ctx
                    .globals()
                    .get("__dshDispatch")
                    .map_err(|e| format!("脚本 {name} 缺少 dispatch: {e}"))?;
                let text = dispatch
                    .call::<_, MaybePromise>((context_json,))
                    .map_err(|e| format_script_error(&ctx, name, e))?
                    .finish::<String>()
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                let get_state: Function = ctx
                    .globals()
                    .get("__dshGetState")
                    .map_err(|e| format!("脚本 {name} 缺少 state getter: {e}"))?;
                let next_state = get_state
                    .call::<_, String>(())
                    .map_err(|e| format_script_error(&ctx, name, e))?;
                Ok::<_, String>((text, next_state))
            })?;
            self.states[index] = next_state;
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
    fn persistent_state_survives_events_and_restore() {
        let mut scripts = BTreeMap::new();
        scripts.insert(
            "state".to_string(),
            "function onEvent(ctx) { ctx.state.n = (ctx.state.n || 0) + 1; return [{op:'toast', text:String(ctx.state.n)}]; }".to_string(),
        );
        let mut host = QuickJsHost::from_scripts(&scripts).unwrap();
        let first = host.on_event("{}").unwrap();
        assert!(matches!(&first[0], Command::Toast { text, .. } if text == "1"));
        let second = host.on_event("{}").unwrap();
        assert!(matches!(&second[0], Command::Toast { text, .. } if text == "2"));
        let state = host.state_json().expect("state exists");
        let state_map: BTreeMap<String, String> = serde_json::from_str(&state).unwrap();
        assert!(state_map["state"].contains("\"n\":2"), "{state}");

        let mut restored = QuickJsHost::from_scripts(&scripts).unwrap();
        restored.restore_state(&state).unwrap();
        let third = restored.on_event("{}").unwrap();
        assert!(matches!(&third[0], Command::Toast { text, .. } if text == "3"));
    }

    #[test]
    fn supports_modules_async_and_hot_reload() {
        let mut scripts = BTreeMap::new();
        scripts.insert(
            "helper".to_string(),
            "export function bump(n) { return n + 1; }".to_string(),
        );
        scripts.insert(
            "main".to_string(),
            "import { bump } from './helper.js'; export async function onEvent(ctx) { await Promise.resolve(); ctx.state.n = bump(ctx.state.n || 0); return [{op:'toast', text:String(ctx.state.n)}]; }".to_string(),
        );
        let mut host = QuickJsHost::from_scripts(&scripts).unwrap();
        let first = host.on_event("{}").unwrap();
        assert!(matches!(&first[0], Command::Toast { text, .. } if text == "1"));
        let state = host.state_json().expect("state exists");

        let mut reloaded = BTreeMap::new();
        reloaded.insert(
            "helper".to_string(),
            "export function bump(n) { return n + 10; }".to_string(),
        );
        reloaded.insert(
            "main".to_string(),
            "import { bump } from './helper.js'; export async function onEvent(ctx) { ctx.state.n = bump(ctx.state.n || 0); return [{op:'toast', text:String(ctx.state.n)}]; }".to_string(),
        );
        host.reload(&reloaded).unwrap();
        let restored = host.state_json().expect("state survives reload");
        assert_eq!(state, restored);
        let second = host.on_event("{}").unwrap();
        assert!(matches!(&second[0], Command::Toast { text, .. } if text == "11"));
    }

    #[test]
    fn deferred_commands_fire_on_future_tick() {
        let pack = orbit_pack();
        let mut world = World::from_pack(&pack, pack.hash().unwrap()).unwrap();
        let mut scripts = BTreeMap::new();
        scripts.insert(
            "timer".to_string(),
            "function onEvent(ctx) { if (ctx.event.kind === 'timer.start') { ctx.after(3, [{op:'toast', text:'after 3'}]); } return []; }".to_string(),
        );
        world.set_script_host(Box::new(QuickJsHost::from_scripts(&scripts).unwrap()));
        world.emit("timer.start", None, serde_json::json!({}));
        for _ in 0..5 {
            world.tick_once();
        }
        let fired = world
            .events
            .iter()
            .find(|event| event.kind == "toast" && event.data["text"] == "after 3");
        assert!(
            fired.is_some(),
            "deferred command did not fire: {:?}",
            world.events
        );
        assert!(fired.unwrap().tick >= 3);
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
        assert_eq!(world.flags().get("flag.script.reactor_seen"), Some(&true));
    }
}
