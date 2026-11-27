//! `worldc bench --scenario real5k`：真实 5k 工作负载。
//!
//! 测量边界：tick P50/P95/P99 只统计 `World::tick_once`；查询、snapshot/hash、
//! save/load 单独统计，避免把应用层查询混进内核 tick。

use serde_json::{json, Value};
use std::time::Instant;
use world_core::{Command, EntityKind, World};
use world_pack::Pack;
use world_script::attach_script_host;

const WARMUP_TICKS: u64 = 300;

pub fn run(seed: u64, ticks: u64, runs: usize, json_out: bool) -> Result<(), String> {
    if ticks == 0 {
        return Err("--ticks 必须大于 0".to_string());
    }
    if runs == 0 {
        return Err("--runs 必须大于 0".to_string());
    }
    let pack = Pack::real5k(seed);
    let report = pack.validate();
    if !report.is_ok() {
        let errors = report
            .errors
            .iter()
            .map(|e| e.to_string())
            .collect::<Vec<_>>()
            .join("; ");
        return Err(format!("real5k 基准包校验失败: {errors}"));
    }
    let pack_hash = pack.hash().map_err(|e| e.to_string())?;

    let mut tick_ms: Vec<f64> = Vec::with_capacity((ticks * runs as u64) as usize);
    let mut query_ms: Vec<f64> = Vec::with_capacity((ticks * runs as u64) as usize);
    let mut snapshot_ms: Vec<f64> = Vec::new();
    let mut save_ms: Vec<f64> = Vec::new();
    let mut load_ms: Vec<f64> = Vec::new();
    let mut final_hashes = Vec::with_capacity(runs);
    let mut initial_entities = 0usize;
    let mut final_entities = 0usize;
    let mut final_events = 0usize;
    let mut command_rejected = 0usize;
    let mut script_errors = 0usize;
    let mut commands_enqueued = 0usize;

    for _ in 0..runs {
        let mut world = World::from_pack(&pack, pack_hash.clone())?;
        if initial_entities == 0 {
            initial_entities = world.entities().count();
        }
        attach_script_host(&mut world, &pack)?;
        // 5k 场景下只让脚本处理低频 pulse；日程/交互事件不重复序列化全量上下文。
        world.set_script_event_filter(["bench.pulse"]);

        for _ in 0..WARMUP_TICKS {
            enqueue_workload(&mut world, &mut commands_enqueued);
            world.tick_once();
        }

        for _ in 0..ticks {
            enqueue_workload(&mut world, &mut commands_enqueued);

            let start = Instant::now();
            world.tick_once();
            tick_ms.push(start.elapsed().as_secs_f64() * 1000.0);

            // 应用层查询：单独计时，不混入 tick。
            let q = Instant::now();
            let _ = world.find_by_content_id("bench.prop");
            let _ = world.find_by_content_id("bench.actor.0");
            let _ = world.entities().count();
            let _ = world.flags.len();
            query_ms.push(q.elapsed().as_secs_f64() * 1000.0);

            if world.tick().is_multiple_of(60) {
                let s = Instant::now();
                let _ = world.state_hash();
                snapshot_ms.push(s.elapsed().as_secs_f64() * 1000.0);
            }
            if world.tick().is_multiple_of(600) {
                let s = Instant::now();
                let bytes = world.save_bytes()?;
                save_ms.push(s.elapsed().as_secs_f64() * 1000.0);
                let l = Instant::now();
                let mut loaded = World::load_bytes(&pack, &bytes)?;
                attach_script_host(&mut loaded, &pack)?;
                load_ms.push(l.elapsed().as_secs_f64() * 1000.0);
            }
        }

        final_entities = world.entities().count();
        final_events = world.events.len();
        command_rejected = world
            .events
            .iter()
            .filter(|e| e.kind == "command_rejected")
            .count();
        script_errors = world
            .events
            .iter()
            .filter(|e| e.kind == "script_error")
            .count();
        final_hashes.push(world.state_hash());
    }

    let hashes_equal = final_hashes.iter().all(|h| *h == final_hashes[0]);
    let final_hash = final_hashes[0];
    let tick_stats = stats(&mut tick_ms);
    let query_stats = stats(&mut query_ms);
    let snapshot_stats = stats(&mut snapshot_ms);
    let save_stats = stats(&mut save_ms);
    let load_stats = stats(&mut load_ms);

    let tick_p95 = tick_stats["p95"].as_f64().unwrap_or(f64::INFINITY);
    let snapshot_p95 = snapshot_stats["p95"].as_f64().unwrap_or(f64::INFINITY);
    let report = json!({
        "scenario": "real5k",
        "profile": if cfg!(debug_assertions) { "debug" } else { "release" },
        "machine": {"os": std::env::consts::OS, "arch": std::env::consts::ARCH},
        "seed": seed,
        "pack_hash": pack_hash,
        "ticks": ticks,
        "warmup_ticks": WARMUP_TICKS,
        "runs": runs,
        "entities_initial": initial_entities,
        "entities": final_entities,
        "commands_enqueued": commands_enqueued,
        "events": final_events,
        "command_rejected": command_rejected,
        "script_errors": script_errors,
        "hashes_equal": hashes_equal,
        "final_hash": format!("0x{final_hash:016x}"),
        "tick_ms": tick_stats,
        "query_ms": query_stats,
        "snapshot_hash_ms": snapshot_stats,
        "save_ms": save_stats,
        "load_ms": load_stats,
        "target": {
            "tick_p95_ms_max": 2.0,
            "snapshot_hash_p95_ms_max": 5.0,
            "tick_p95_ok": tick_p95 <= 2.0,
            "snapshot_hash_p95_ok": snapshot_p95 <= 5.0
        }
    });

    if json_out {
        println!(
            "{}",
            serde_json::to_string_pretty(&report).unwrap_or_default()
        );
    } else {
        print_human(&report);
    }
    Ok(())
}

fn enqueue_workload(world: &mut World, commands_enqueued: &mut usize) {
    let tick = world.tick();
    if tick.is_multiple_of(6) {
        let lane = (tick / 6) as usize % 4;
        let [x, z] = [[40.0, 0.0], [-40.0, 0.0], [0.0, 40.0], [0.0, -40.0]][lane];
        world.queue_command(Command::MoveTo {
            actor: world.player,
            x,
            z,
        });
        *commands_enqueued += 1;
    }
    if tick.is_multiple_of(20) {
        let command = match (tick / 20) as usize % 3 {
            0 => world
                .find_by_content_id("bench.prop")
                .map(|target| Command::Interact {
                    actor: world.player,
                    target,
                }),
            1 => world
                .find_by_content_id("bench.actor.0")
                .map(|target| Command::Talk {
                    actor: world.player,
                    target,
                }),
            _ => world
                .entities()
                .find(|e| e.kind == EntityKind::Item)
                .map(|e| Command::Pickup {
                    actor: world.player,
                    target: e.id,
                }),
        };
        if let Some(command) = command {
            world.queue_command(command);
            *commands_enqueued += 1;
        }
    }
    if tick.is_multiple_of(120) {
        world.queue_command(Command::Emit {
            event: "bench.pulse".to_string(),
        });
        *commands_enqueued += 1;
    }
}

fn stats(samples: &mut [f64]) -> Value {
    if samples.is_empty() {
        return json!({"samples": 0, "mean": null, "p50": null, "p95": null, "p99": null, "max": null});
    }
    samples.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let pick = |p: f64| -> f64 {
        let idx = ((samples.len() as f64 - 1.0) * p).round() as usize;
        samples[idx.min(samples.len() - 1)]
    };
    let mean = samples.iter().sum::<f64>() / samples.len() as f64;
    json!({
        "samples": samples.len(),
        "mean": round4(mean),
        "p50": round4(pick(0.50)),
        "p95": round4(pick(0.95)),
        "p99": round4(pick(0.99)),
        "max": round4(samples[samples.len() - 1])
    })
}

fn round4(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}

fn print_human(report: &Value) {
    let field = |path: &[&str]| -> String {
        let mut value = report;
        for key in path {
            value = &value[*key];
        }
        value.to_string()
    };
    println!(
        "bench real5k: entities={}→{} ticks={} runs={} commands={} events={} rejected={} script_errors={}",
        field(&["entities_initial"]),
        field(&["entities"]),
        field(&["ticks"]),
        field(&["runs"]),
        field(&["commands_enqueued"]),
        field(&["events"]),
        field(&["command_rejected"]),
        field(&["script_errors"])
    );
    println!(
        "tick ms: p50={} p95={} p99={} max={} mean={}",
        field(&["tick_ms", "p50"]),
        field(&["tick_ms", "p95"]),
        field(&["tick_ms", "p99"]),
        field(&["tick_ms", "max"]),
        field(&["tick_ms", "mean"])
    );
    println!(
        "query ms: p50={} p95={} p99={}",
        field(&["query_ms", "p50"]),
        field(&["query_ms", "p95"]),
        field(&["query_ms", "p99"])
    );
    println!(
        "snapshot/hash ms: p50={} p95={} p99={}",
        field(&["snapshot_hash_ms", "p50"]),
        field(&["snapshot_hash_ms", "p95"]),
        field(&["snapshot_hash_ms", "p99"])
    );
    println!(
        "save/load ms: save_p95={} load_p95={}",
        field(&["save_ms", "p95"]),
        field(&["load_ms", "p95"])
    );
    println!(
        "final_hash={} hashes_equal={}",
        report["final_hash"].as_str().unwrap_or("?"),
        report["hashes_equal"].as_bool().unwrap_or(false)
    );
}
