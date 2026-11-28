use crate::event::EventEnvelope;
use crate::script::ScriptHost;
use crate::trace::{Trace, TraceCommand};
use crate::world::World;
use serde::{Deserialize, Serialize};
use world_pack::Pack;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Keyframe {
    pub tick: u64,
    pub hash: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunResult {
    pub pack_id: String,
    pub pack_hash: String,
    pub ticks: u64,
    pub final_hash: u64,
    pub keyframes: Vec<Keyframe>,
    pub events: Vec<EventEnvelope>,
}

pub fn run_trace(pack: &Pack, trace: &Trace, keyframe_every: u64) -> Result<RunResult, String> {
    run_trace_with_host(pack, trace, keyframe_every, None)
}

/// 与 `run_trace` 相同，但允许宿主注入脚本运行时；用于 ScriptHost 验收。
pub fn run_trace_with_host(
    pack: &Pack,
    trace: &Trace,
    keyframe_every: u64,
    host: Option<Box<dyn ScriptHost>>,
) -> Result<RunResult, String> {
    let pack_hash = pack.hash().map_err(|e| e.to_string())?;
    let mut world = World::from_pack(pack, pack_hash.clone())?;
    if let Some(host) = host {
        world.set_script_host(host);
    }
    let mut steps = trace.steps.clone();
    steps.sort_by_key(|s| s.tick);

    let keyframe_every = keyframe_every.max(1);
    let mut keyframes = Vec::new();
    for tick in 1..=trace.ticks {
        for step in steps.iter().filter(|s| s.tick == tick) {
            let command = step
                .command
                .resolve(&world)
                .map_err(|e| format!("tick {tick}: {e}"))?;
            world.queue_command(command);
        }
        world.tick_once();
        if tick % keyframe_every == 0 {
            keyframes.push(Keyframe {
                tick,
                hash: world.state_hash(),
            });
        }
    }

    let final_hash = world.state_hash();
    let events = world.drain_events();
    Ok(RunResult {
        pack_id: pack.manifest.id.clone(),
        pack_hash,
        ticks: trace.ticks,
        final_hash,
        keyframes,
        events,
    })
}

/// 便捷：空输入跑 N tick。
pub fn run_idle(pack: &Pack, ticks: u64) -> Result<RunResult, String> {
    run_trace(
        pack,
        &Trace {
            ticks,
            steps: Vec::new(),
        },
        60,
    )
}

/// 找到回放中第一个分歧的关键帧；用于报告。
pub fn first_divergence(a: &RunResult, b: &RunResult) -> Option<u64> {
    for (ka, kb) in a.keyframes.iter().zip(b.keyframes.iter()) {
        if ka.tick != kb.tick || ka.hash != kb.hash {
            return Some(ka.tick.min(kb.tick));
        }
    }
    if a.final_hash != b.final_hash {
        return Some(a.ticks.min(b.ticks));
    }
    None
}

/// 便于测试/工具：把 trace 里的命令按 tick 打印。
pub fn describe_trace(trace: &Trace) -> Vec<String> {
    trace
        .steps
        .iter()
        .map(|s| format!("tick {}: {}", s.tick, describe_command(&s.command)))
        .collect()
}

fn describe_command(cmd: &TraceCommand) -> String {
    match cmd {
        TraceCommand::Interact { actor, target } => format!("interact {actor} -> {target}"),
        TraceCommand::Talk { actor, target } => format!("talk {actor} -> {target}"),
        TraceCommand::ChooseDialogue {
            dialogue,
            node,
            choice,
        } => {
            format!("choose {dialogue}/{node} #{choice}")
        }
        TraceCommand::Pickup { actor, target } => format!("pickup {actor} <- {target}"),
        TraceCommand::GiveItem { actor, item, count } => {
            format!("give {item} x{count} -> {actor}")
        }
        TraceCommand::SetFlag { flag, value } => format!("set {flag} = {value}"),
        TraceCommand::StartQuest { quest } => format!("start quest {quest}"),
        TraceCommand::Toast { actor, text } => {
            format!("toast {:?}: {text}", actor.as_deref().unwrap_or("-"))
        }
        TraceCommand::PlaySound { id } => format!("sound {id}"),
        TraceCommand::Emit { event } => format!("emit {event}"),
        TraceCommand::ActivateZone { zone } => format!("activate zone {zone}"),
        TraceCommand::Move { actor, x, z } => format!("move {actor} ({x}, {z})"),
        TraceCommand::MoveTo { actor, x, z } => format!("move_to {actor} ({x}, {z})"),
    }
}
