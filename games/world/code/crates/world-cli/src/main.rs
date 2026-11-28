mod bench_real5k;

use serde::Deserialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command as ProcessCommand;
use std::time::Instant;
use world_core::{first_divergence, Trace, TraceStep, World};
use world_pack::{Pack, ValidationReport};
use world_script::{attach_script_host, run_trace_with_scripts};

fn main() {
    if let Err(error) = run() {
        eprintln!("worldc: {error}");
        std::process::exit(2);
    }
}

fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let Some(command) = args.first().map(|s| s.as_str()) else {
        print_help();
        return Ok(());
    };
    match command {
        "validate" => cmd_validate(&args[1..]),
        "build" => cmd_build(&args[1..]),
        "bake" => cmd_bake(&args[1..]),
        "ts-build" => cmd_ts_build(&args[1..]),
        "ts-check" => cmd_ts_check(&args[1..]),
        "editor" => cmd_editor(&args[1..]),
        "test" => cmd_test(&args[1..]),
        "content-test" => cmd_content_test(&args[1..]),
        "replay" => cmd_replay(&args[1..]),
        "demo" => cmd_demo(&args[1..]),
        "save" => cmd_save(&args[1..]),
        "load" => cmd_load(&args[1..]),
        "bench" => cmd_bench(&args[1..]),
        "new" => cmd_new(&args[1..]),
        "header" => cmd_header(&args[1..]),
        "explain" => cmd_explain(&args[1..]),
        "--help" | "-h" | "help" => {
            print_help();
            Ok(())
        }
        "version" | "--version" => {
            println!("worldc {}", world_core::CORE_VERSION);
            Ok(())
        }
        other => Err(format!("未知命令: {other}（worldc --help）")),
    }
}

fn default_pack() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../data/demo.harbor")
}

fn load_pack(path: &Path) -> Result<Pack, String> {
    let pack = Pack::load_dir(path).map_err(|e| e.to_string())?;
    Ok(pack)
}

fn require_valid(pack: &Pack) -> Result<(), String> {
    let report = pack.validate();
    if report.is_ok() {
        return Ok(());
    }
    for error in &report.errors {
        eprintln!("{error}");
    }
    Err(format!("内容包校验失败：{} 个错误", report.errors.len()))
}

fn parse_flag<'a>(args: &'a [String], flag: &str) -> Option<&'a str> {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1))
        .map(|s| s.as_str())
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|a| a == flag)
}

fn pack_path(args: &[String]) -> PathBuf {
    parse_flag(args, "--pack")
        .map(PathBuf::from)
        .unwrap_or_else(default_pack)
}

fn read_trace(path: &Path, default_ticks: u64) -> Result<Trace, String> {
    let text =
        fs::read_to_string(path).map_err(|e| format!("读取 trace 失败 {}: {e}", path.display()))?;
    let mut trace: Trace =
        serde_json::from_str(&text).map_err(|e| format!("trace 解析失败: {e}"))?;
    if trace.ticks == 0 {
        trace.ticks = default_ticks;
    }
    Ok(trace)
}

fn default_trace(pack: &Path) -> PathBuf {
    pack.join("tests/m0.trace.json")
}

fn cmd_validate(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    let report: ValidationReport = pack.validate();
    if has_flag(args, "--json") {
        let value = serde_json::json!({
            "pack_id": pack.manifest.id,
            "ok": report.is_ok(),
            "errors": report.errors,
            "warnings": report.warnings,
            "pack_hash": pack.hash().map_err(|e| e.to_string())?,
        });
        println!("{}", serde_json::to_string_pretty(&value).unwrap());
    } else {
        for w in &report.warnings {
            println!("warning {w}");
        }
        for error in &report.errors {
            println!("error {error}");
        }
        println!(
            "validate: {} 个错误，{} 个警告",
            report.errors.len(),
            report.warnings.len()
        );
    }
    if report.is_ok() {
        Ok(())
    } else {
        std::process::exit(1);
    }
}

fn cmd_build(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let out = parse_flag(args, "--out")
        .map(PathBuf::from)
        .unwrap_or_else(|| Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../dist/demo.harbor"));
    fs::create_dir_all(&out).map_err(|e| format!("创建输出目录失败: {e}"))?;
    let bytes = pack.to_bundle_bytes().map_err(|e| e.to_string())?;
    let hash = pack.hash().map_err(|e| e.to_string())?;
    fs::write(out.join("pack.data"), &bytes).map_err(|e| format!("写 pack.data 失败: {e}"))?;
    if let Some(loc) = pack.loc.get("zh-CN") {
        let loc_dir = out.join("loc");
        fs::create_dir_all(&loc_dir).map_err(|e| format!("创建 loc 目录失败: {e}"))?;
        fs::write(
            loc_dir.join("zh-CN.json"),
            serde_json::to_vec_pretty(loc).map_err(|e| e.to_string())?,
        )
        .map_err(|e| format!("写文案失败: {e}"))?;
    }
    let manifest = serde_json::json!({
        "schema": 1,
        "id": pack.manifest.id,
        "version": pack.manifest.version,
        "core_version": world_core::CORE_VERSION,
        "pack_hash": hash,
        "tick_hz": pack.manifest.tick_hz,
        "bytes": bytes.len(),
    });
    fs::write(
        out.join("manifest.json"),
        serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("写 manifest.json 失败: {e}"))?;
    println!("build: {} ({} bytes)", out.display(), bytes.len());
    println!("pack_hash: {hash}");
    Ok(())
}

fn cmd_bake(args: &[String]) -> Result<(), String> {
    if args.first().map(|s| s.as_str()) != Some("nav") {
        return Err(
            "bake 目前只支持: worldc bake nav [--pack DIR] [--zone ID] [--cell 1.0]".to_string(),
        );
    }
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    let cell: f32 = parse_flag(args, "--cell")
        .unwrap_or("1.0")
        .parse()
        .map_err(|e| format!("--cell 解析失败: {e}"))?;
    let only = parse_flag(args, "--zone");
    let nav_dir = path.join("world/nav");
    fs::create_dir_all(&nav_dir).map_err(|e| format!("创建 nav 目录失败: {e}"))?;
    let mut baked = 0;
    for (zone_id, zone) in &pack.zones {
        if let Some(only) = only {
            if zone_id != only {
                continue;
            }
        }
        let nav_id = zone.nav.clone().unwrap_or_else(|| format!("nav.{zone_id}"));
        let nav = pack
            .bake_zone_nav(zone_id, cell, 0.35)
            .ok_or_else(|| format!("无法烘焙区域 {zone_id}"))?;
        let out = nav_dir.join(format!("{nav_id}.json"));
        fs::write(
            &out,
            serde_json::to_vec_pretty(&nav).map_err(|e| e.to_string())?,
        )
        .map_err(|e| format!("写 {} 失败: {e}", out.display()))?;
        println!(
            "bake: {} zone={} size={}x{} blocked={} cell={}",
            out.display(),
            zone_id,
            nav.width,
            nav.height,
            nav.blocked.len(),
            nav.cell
        );
        baked += 1;
    }
    if baked == 0 {
        return Err("没有可烘焙的区域（检查 --zone 或 zone.nav）".to_string());
    }
    let reloaded = load_pack(&path)?;
    require_valid(&reloaded)?;
    println!("bake: {baked} 个导航网格，校验通过");
    Ok(())
}

fn cmd_ts_build(args: &[String]) -> Result<(), String> {
    let base = Path::new(env!("CARGO_MANIFEST_DIR"));
    let src = parse_flag(args, "--src")
        .map(PathBuf::from)
        .unwrap_or_else(|| base.join("../../../src/content/demo.harbor"));
    let out = parse_flag(args, "--out")
        .map(PathBuf::from)
        .unwrap_or_else(|| base.join("../../../dist/ts/demo.harbor"));
    let script = base.join("../../../tools/ts-build.mjs");
    if !script.is_file() {
        return Err(format!("找不到 TS 编译器: {}", script.display()));
    }
    // 本地有 TypeScript 时，ts-build 本身就是类型门禁；没装时提示并继续。
    let root = base.join("../../..");
    let tsc = root.join("node_modules/.bin/tsc");
    if tsc.is_file() {
        println!("ts-build: typecheck…");
        let check = ProcessCommand::new(&tsc)
            .arg("--noEmit")
            .arg("-p")
            .arg(root.join("tsconfig.json"))
            .current_dir(&root)
            .status()
            .map_err(|e| format!("无法启动 tsc: {e}"))?;
        if !check.success() {
            return Err(format!("TS 类型检查失败（exit {:?}）", check.code()));
        }
    } else {
        println!("ts-build: skip typecheck（在 games/world 运行 npm install 可启用）");
    }
    let status = ProcessCommand::new("node")
        .arg(&script)
        .arg("--src")
        .arg(&src)
        .arg("--out")
        .arg(&out)
        .status()
        .map_err(|e| format!("无法启动 node: {e}"))?;
    if !status.success() {
        return Err(format!("TS 编译失败（exit {:?}）", status.code()));
    }
    let mut pack = load_pack(&out)?;
    if pack.zones.values().any(|z| z.nav.is_some()) {
        let nav_dir = out.join("world/nav");
        fs::create_dir_all(&nav_dir).map_err(|e| format!("创建 nav 目录失败: {e}"))?;
        for (zone_id, zone) in &pack.zones {
            if zone.nav.is_none() {
                continue;
            }
            let nav_id = zone.nav.clone().unwrap_or_else(|| format!("nav.{zone_id}"));
            let nav = pack
                .bake_zone_nav(zone_id, 1.0, 0.35)
                .ok_or_else(|| format!("无法烘焙区域 {zone_id}"))?;
            fs::write(
                nav_dir.join(format!("{nav_id}.json")),
                serde_json::to_vec_pretty(&nav).map_err(|e| e.to_string())?,
            )
            .map_err(|e| format!("写 nav 失败: {e}"))?;
        }
        pack = load_pack(&out)?;
    }
    require_valid(&pack)?;
    let hash = pack.hash().map_err(|e| e.to_string())?;
    println!("ts-build: {} -> {}", src.display(), out.display());
    println!("pack_hash: {hash}");
    if let Some(compare) = parse_flag(args, "--compare") {
        let expected = load_pack(&PathBuf::from(compare))?;
        let expected_hash = expected.hash().map_err(|e| e.to_string())?;
        if expected_hash != hash {
            return Err(format!(
                "TS 包与 JSON 包哈希不一致：{hash} != {expected_hash}"
            ));
        }
        println!("compare: PASS（与 {} 一致）", compare);
    }
    Ok(())
}

fn cmd_ts_check(_args: &[String]) -> Result<(), String> {
    let base = Path::new(env!("CARGO_MANIFEST_DIR"));
    let root = base.join("../../..");
    let tsc = root.join("node_modules/.bin/tsc");
    if !tsc.is_file() {
        return Err("未找到本地 TypeScript；先在 games/world 运行 `npm install`".to_string());
    }
    let status = ProcessCommand::new(&tsc)
        .arg("--noEmit")
        .arg("-p")
        .arg(root.join("tsconfig.json"))
        .current_dir(&root)
        .status()
        .map_err(|e| format!("无法启动 tsc: {e}"))?;
    if !status.success() {
        return Err(format!("类型检查失败（exit {:?}）", status.code()));
    }
    println!("ts-check: PASS");
    Ok(())
}

fn cmd_editor(args: &[String]) -> Result<(), String> {
    let base = Path::new(env!("CARGO_MANIFEST_DIR"));
    let pack = parse_flag(args, "--pack")
        .map(PathBuf::from)
        .unwrap_or_else(|| base.join("../../../data/demo.harbor"));
    let port = parse_flag(args, "--port").unwrap_or("8788");
    let script = base.join("../../../tools/editor-server.mjs");
    if !script.is_file() {
        return Err(format!("找不到编辑器服务器: {}", script.display()));
    }
    println!("RefuWorld editor: http://127.0.0.1:{port}/");
    let status = ProcessCommand::new("node")
        .arg(&script)
        .arg("--pack")
        .arg(&pack)
        .arg("--port")
        .arg(port)
        .status()
        .map_err(|e| format!("无法启动 node: {e}"))?;
    if !status.success() {
        return Err(format!("编辑器退出（exit {:?}）", status.code()));
    }
    Ok(())
}

fn cmd_test(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let trace_path = parse_flag(args, "--trace")
        .map(PathBuf::from)
        .unwrap_or_else(|| default_trace(&path));
    let mut trace = if trace_path.exists() {
        read_trace(&trace_path, 600)?
    } else {
        Trace {
            ticks: 600,
            steps: Vec::new(),
        }
    };
    if let Some(ticks) = parse_flag(args, "--ticks") {
        trace.ticks = ticks
            .parse()
            .map_err(|e| format!("--ticks 解析失败: {e}"))?;
    }
    let a = run_trace_with_scripts(&pack, &trace, 60)?;
    let b = run_trace_with_scripts(&pack, &trace, 60)?;
    let same = a.final_hash == b.final_hash && a.keyframes == b.keyframes;
    println!(
        "test: {} ticks={} hash=0x{:016x} events={}",
        a.pack_id,
        a.ticks,
        a.final_hash,
        a.events.len()
    );
    println!(
        "repeat: {}",
        if same {
            "PASS（两次哈希一致）"
        } else {
            "FAIL（两次哈希不一致）"
        }
    );
    if let Some(tick) = first_divergence(&a, &b) {
        println!("first_divergence_tick: {tick}");
        return Err("确定性测试失败".to_string());
    }
    if has_flag(args, "--events") {
        for event in &a.events {
            println!("{}", serde_json::to_string(event).unwrap_or_default());
        }
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
struct ContentTest {
    name: String,
    ticks: u64,
    #[serde(default)]
    steps: Vec<TraceStep>,
    #[serde(default)]
    expect: Expectations,
}

#[derive(Debug, Default, Deserialize)]
struct Expectations {
    #[serde(default)]
    flags: BTreeMap<String, bool>,
    #[serde(default)]
    quests: BTreeMap<String, String>,
    #[serde(default)]
    events: Vec<String>,
    #[serde(default)]
    inventory: BTreeMap<String, u32>,
}

fn cmd_content_test(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let tests_dir = path.join("tests");
    let filter = parse_flag(args, "--filter");
    let mut files: Vec<PathBuf> = fs::read_dir(&tests_dir)
        .map_err(|e| format!("读取测试目录失败 {}: {e}", tests_dir.display()))?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|p| {
            p.file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.ends_with(".test.json"))
                .unwrap_or(false)
        })
        .collect();
    files.sort();
    if files.is_empty() {
        return Err(format!("没有找到 *.test.json: {}", tests_dir.display()));
    }

    let mut failures = 0;
    for file in files {
        if let Some(filter) = filter {
            if !file.to_string_lossy().contains(filter) {
                continue;
            }
        }
        let text =
            fs::read_to_string(&file).map_err(|e| format!("读取 {} 失败: {e}", file.display()))?;
        let test: ContentTest = serde_json::from_str(&text)
            .map_err(|e| format!("解析 {} 失败: {e}", file.display()))?;
        match run_content_test(&pack, &test) {
            Ok(()) => println!("content-test: {} PASS", test.name),
            Err(error) => {
                failures += 1;
                println!("content-test: {} FAIL", test.name);
                for line in error.lines() {
                    println!("  {line}");
                }
            }
        }
    }
    if failures > 0 {
        Err(format!("{failures} 个内容测试失败"))
    } else {
        Ok(())
    }
}

fn run_content_test(pack: &Pack, test: &ContentTest) -> Result<(), String> {
    let hash = pack.hash().map_err(|e| e.to_string())?;
    let mut world = World::from_pack(pack, hash)?;
    attach_script_host(&mut world, pack)?;
    let mut steps = test.steps.clone();
    steps.sort_by_key(|s| s.tick);
    for tick in 1..=test.ticks {
        for step in steps.iter().filter(|s| s.tick == tick) {
            let command = step
                .command
                .resolve(&world)
                .map_err(|e| format!("tick {tick}: {e}"))?;
            world.queue_command(command);
        }
        world.tick_once();
    }

    let mut errors = Vec::new();
    for (flag, expected) in &test.expect.flags {
        let actual = world.flags().get(flag).copied().unwrap_or(false);
        if actual != *expected {
            errors.push(format!("flag {flag}: 期望 {expected}，实际 {actual}"));
        }
    }
    for (quest, expected) in &test.expect.quests {
        let actual = world
            .quests()
            .get(quest)
            .map(|q| {
                if q.completed {
                    "completed"
                } else if q.active {
                    "active"
                } else {
                    "inactive"
                }
            })
            .unwrap_or("missing");
        if actual != expected {
            errors.push(format!("quest {quest}: 期望 {expected}，实际 {actual}"));
        }
    }
    for event in &test.expect.events {
        if !world.events.iter().any(|e| e.kind == *event) {
            errors.push(format!("缺少事件 {event}"));
        }
    }
    let player = world
        .find_by_content_id("player")
        .ok_or_else(|| "世界缺少 player".to_string())?;
    let inventory: BTreeMap<String, u32> = world
        .entity(player)
        .map(|e| {
            e.inventory
                .iter()
                .map(|s| (s.item.clone(), s.count))
                .collect()
        })
        .unwrap_or_default();
    for (item, expected) in &test.expect.inventory {
        let actual = inventory.get(item).copied().unwrap_or(0);
        if actual != *expected {
            errors.push(format!("inventory {item}: 期望 {expected}，实际 {actual}"));
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

fn cmd_save(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let trace_path = parse_flag(args, "--trace")
        .map(PathBuf::from)
        .ok_or_else(|| "save 需要 --trace <file>".to_string())?;
    let out = parse_flag(args, "--out")
        .map(PathBuf::from)
        .ok_or_else(|| "save 需要 --out <file>".to_string())?;
    let trace = read_trace(&trace_path, 600)?;
    let pack_hash = pack.hash().map_err(|e| e.to_string())?;
    let mut world = World::from_pack(&pack, pack_hash)?;
    attach_script_host(&mut world, &pack)?;
    let mut steps = trace.steps.clone();
    steps.sort_by_key(|s| s.tick);
    for tick in 1..=trace.ticks {
        for step in steps.iter().filter(|s| s.tick == tick) {
            world.queue_command(step.command.resolve(&world)?);
        }
        world.tick_once();
    }
    let bytes = world.save_bytes()?;
    fs::write(&out, &bytes).map_err(|e| format!("写存档失败: {e}"))?;
    println!(
        "save: {} ticks={} hash=0x{:016x} bytes={} out={}",
        world.pack_id,
        world.tick(),
        world.state_hash(),
        bytes.len(),
        out.display()
    );
    Ok(())
}

fn cmd_load(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let save = parse_flag(args, "--save")
        .map(PathBuf::from)
        .ok_or_else(|| "load 需要 --save <file>".to_string())?;
    let bytes = fs::read(&save).map_err(|e| format!("读存档失败: {e}"))?;
    let world = World::load_bytes(&pack, &bytes)?;
    println!(
        "load: {} ticks={} hash=0x{:016x} entities={}",
        world.pack_id,
        world.tick(),
        world.state_hash(),
        world.entities().count()
    );
    Ok(())
}

fn cmd_replay(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let trace_path = parse_flag(args, "--trace")
        .map(PathBuf::from)
        .ok_or_else(|| "replay 需要 --trace <file>".to_string())?;
    let trace = read_trace(&trace_path, 600)?;
    let result = run_trace_with_scripts(&pack, &trace, 60)?;
    println!(
        "replay: {} ticks={} final_hash=0x{:016x} events={}",
        result.pack_id,
        result.ticks,
        result.final_hash,
        result.events.len()
    );
    for keyframe in &result.keyframes {
        println!("keyframe {} 0x{:016x}", keyframe.tick, keyframe.hash);
    }
    if let Some(expect) = parse_flag(args, "--expect") {
        let expect = expect.trim_start_matches("0x");
        let expect =
            u64::from_str_radix(expect, 16).map_err(|e| format!("--expect 解析失败: {e}"))?;
        if expect != result.final_hash {
            return Err(format!(
                "哈希不一致：期望 0x{expect:016x}，实际 0x{:016x}",
                result.final_hash
            ));
        }
        println!("expect: PASS");
    }
    Ok(())
}

fn cmd_demo(args: &[String]) -> Result<(), String> {
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let trace_path = parse_flag(args, "--trace")
        .map(PathBuf::from)
        .unwrap_or_else(|| default_trace(&path));
    let mut trace = read_trace(&trace_path, 600)?;
    if let Some(ticks) = parse_flag(args, "--ticks") {
        trace.ticks = ticks
            .parse()
            .map_err(|e| format!("--ticks 解析失败: {e}"))?;
    }
    let result = run_trace_with_scripts(&pack, &trace, 60)?;
    for event in &result.events {
        println!("{}", serde_json::to_string(event).unwrap_or_default());
    }
    println!(
        "demo: {} ticks={} final_hash=0x{:016x}",
        result.pack_id, result.ticks, result.final_hash
    );
    Ok(())
}

fn cmd_bench(args: &[String]) -> Result<(), String> {
    if let Some(scenario) = parse_flag(args, "--scenario") {
        if scenario != "real5k" && scenario != "real5k-v2" {
            return Err(format!(
                "未知 benchmark scenario: {scenario}（当前支持 real5k / real5k-v2）"
            ));
        }
        let seed = parse_flag(args, "--seed")
            .unwrap_or("42")
            .parse()
            .map_err(|e| format!("--seed 解析失败: {e}"))?;
        let ticks = parse_flag(args, "--ticks")
            .unwrap_or("6000")
            .parse()
            .map_err(|e| format!("--ticks 解析失败: {e}"))?;
        let runs = parse_flag(args, "--runs")
            .unwrap_or("5")
            .parse()
            .map_err(|e| format!("--runs 解析失败: {e}"))?;
        let json_out = args.iter().any(|a| a == "--json");
        return bench_real5k::run(seed, ticks, runs, json_out, scenario == "real5k-v2");
    }
    if let Some(raw) = parse_flag(args, "--synthetic") {
        let entities: usize = raw
            .parse()
            .map_err(|e| format!("--synthetic 解析失败: {e}"))?;
        let ticks: u64 = parse_flag(args, "--ticks")
            .unwrap_or("600")
            .parse()
            .map_err(|e| format!("--ticks 解析失败: {e}"))?;
        let pack = Pack::synthetic(entities);
        let hash = pack.hash().map_err(|e| e.to_string())?;
        let mut world = World::from_pack(&pack, hash)?;
        for _ in 0..60 {
            world.tick_once();
        }
        let start = Instant::now();
        for _ in 0..ticks {
            world.tick_once();
        }
        let elapsed = start.elapsed();
        let per_tick = elapsed.as_secs_f64() * 1000.0 / ticks.max(1) as f64;
        println!(
            "bench: synthetic entities={} ticks={} total={:.3}ms per_tick={:.4}ms hash=0x{:016x}",
            entities,
            ticks,
            elapsed.as_secs_f64() * 1000.0,
            per_tick,
            world.state_hash()
        );
        return Ok(());
    }
    let path = pack_path(args);
    let pack = load_pack(&path)?;
    require_valid(&pack)?;
    let trace = Trace {
        ticks: 600,
        steps: Vec::new(),
    };
    // 预热
    let _ = run_trace_with_scripts(&pack, &trace, 600)?;
    let start = Instant::now();
    let runs = 5;
    let mut last = 0;
    for _ in 0..runs {
        last = run_trace_with_scripts(&pack, &trace, 600)?.final_hash;
    }
    let elapsed = start.elapsed();
    let total_ticks = runs * 600;
    let per_tick = elapsed.as_secs_f64() * 1000.0 / total_ticks as f64;
    println!(
        "bench: {} ticks={} runs={} total={:.3}ms per_tick={:.4}ms hash=0x{:016x}",
        pack.manifest.id,
        total_ticks,
        runs,
        elapsed.as_secs_f64() * 1000.0,
        per_tick,
        last
    );
    Ok(())
}

fn cmd_new(args: &[String]) -> Result<(), String> {
    let id = args
        .iter()
        .find(|a| !a.starts_with("--"))
        .ok_or_else(|| "new 需要包 ID，例如 worldc new demo.harbor".to_string())?;
    let out = parse_flag(args, "--out")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(id));
    if out.exists() {
        return Err(format!("目标已存在: {}", out.display()));
    }
    let dirs = [
        "world/zones",
        "world/actors",
        "world/props",
        "world/items",
        "rules",
        "quests",
        "dialogue",
        "schedules",
        "loc",
        "tests",
    ];
    for d in dirs {
        fs::create_dir_all(out.join(d)).map_err(|e| format!("创建目录失败: {e}"))?;
    }
    let manifest = serde_json::json!({
        "schema": 1,
        "id": id,
        "version": "0.1.0",
        "core_api": ">=0.1 <0.2",
        "kits": ["core", "interaction", "inventory", "quest", "dialogue", "director", "save_profile"],
        "entry": { "world": "world/main.world.json", "start_zone": "zone.main" },
        "sim_profile": "arcade",
        "tick_hz": 60,
        "loc": ["loc/zh-CN.json"],
        "requires": [],
        "optional": [],
        "conflicts": []
    });
    write_json(&out.join("pack.json"), &manifest)?;
    write_json(
        &out.join("world/main.world.json"),
        &serde_json::json!({
            "id": "world.main",
            "start_zone": "zone.main",
            "start_time": "08:00",
            "seed": 1,
            "player": { "at": [0.0, 0.0, 0.0], "inventory": [] }
        }),
    )?;
    write_json(
        &out.join("world/zones/main.zone.json"),
        &serde_json::json!({
            "id": "zone.main",
            "name": "loc:zone.main.name",
            "bounds": { "min": [-10.0, 0.0, -10.0], "max": [10.0, 5.0, 10.0] },
            "placements": []
        }),
    )?;
    write_json(
        &out.join("loc/zh-CN.json"),
        &serde_json::json!({ "zone.main.name": "新区域" }),
    )?;
    write_json(
        &out.join("tests/m0.trace.json"),
        &serde_json::json!({ "ticks": 600, "steps": [] }),
    )?;
    println!("new: {}", out.display());
    Ok(())
}

fn write_json(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    fs::write(
        path,
        serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("写 {} 失败: {e}", path.display()))
}

fn cmd_header(args: &[String]) -> Result<(), String> {
    let out = parse_flag(args, "--out")
        .map(PathBuf::from)
        .unwrap_or_else(|| Path::new(env!("CARGO_MANIFEST_DIR")).join("../../include/world.h"));
    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }
    fs::write(&out, world_header()).map_err(|e| format!("写头文件失败: {e}"))?;
    println!("header: {}", out.display());
    Ok(())
}

fn cmd_explain(args: &[String]) -> Result<(), String> {
    let code = args
        .first()
        .ok_or_else(|| "explain 需要错误码".to_string())?;
    let text = match code.as_str() {
        "E-SCHEMA-001" => "manifest.schema 不是 1：内容包格式版本不匹配。",
        "E-SCHEMA-002" => "placement 必须且只能指定 actor/prop/item 之一。",
        "E-MANIFEST-001" => "manifest 的 id/version/core_api/entry 不能为空。",
        "E-MANIFEST-002" => "kits 必须包含 core。",
        "E-REF-001" => "引用了不存在的定义：检查 actor/prop/item/quest/schedule/dialogue ID。",
        "E-REF-002" => "persistent_id 为空或重复：存档锚点必须唯一。",
        "E-REF-003" => "定义文件的 id 与文件名/索引键不一致。",
        "E-TIME-001" => "时间必须是 HH:MM（00:00–23:59），日程 from/to 不能相同。",
        "E-DLG-001" => "对话图断链：start/next/choice.next 指向不存在的节点。",
        "E-DLG-002" => "对话节点既不是 end，也没有 next/choices。",
        "E-DLG-003" => "对话节点从 start 不可达（警告）。",
        "E-LOC-001" => "缺少文案 key：在 loc/zh-CN.json 中补齐。",
        "E-VALUE-001" => "字段取值非法：检查枚举/数值范围。",
        "E-RULE-001" => "规则 on 只支持 interact/talk/pickup。",
        "E-WORLD-001" => "world.start_zone 与 manifest.entry.start_zone 不一致（警告）。",
        other => return Err(format!("未知错误码: {other}")),
    };
    println!("{code}: {text}");
    Ok(())
}

fn print_help() {
    println!(
        r#"worldc — RefuWorld 内容工具链

用法:
  worldc validate [--pack DIR] [--json]
  worldc build    [--pack DIR] [--out DIR]
  worldc bake nav [--pack DIR] [--zone ID] [--cell 1.0]
  worldc ts-build [--src DIR] [--out DIR] [--compare DIR]
  worldc ts-check
  worldc editor   [--pack DIR] [--port N]
  worldc test     [--pack DIR] [--trace FILE] [--ticks N] [--events]
  worldc content-test [--pack DIR] [--filter TEXT]
  worldc replay   --trace FILE [--pack DIR] [--expect 0xHASH]
  worldc demo     [--pack DIR] [--trace FILE] [--ticks N]
  worldc save     [--pack DIR] [--trace FILE] [--ticks N] --out FILE
  worldc load     [--pack DIR] --save FILE
  worldc bench    [--pack DIR] [--synthetic N] [--ticks N]
  worldc bench    --scenario real5k|real5k-v2 [--seed N] [--ticks N] [--runs N] [--json]
  worldc new      <pack.id> [--out DIR]
  worldc header   [--out FILE]
  worldc explain  <CODE>
  worldc version

默认包: games/world/data/demo.harbor
"#
    );
}

fn world_header() -> &'static str {
    r#"#ifndef REFU_WORLD_H
#define REFU_WORLD_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define WORLD_ABI_MAJOR 1u
#define WORLD_ABI_MINOR 0u
#define WORLD_ABI_VERSION ((WORLD_ABI_MAJOR << 16) | WORLD_ABI_MINOR)
#define WORLD_ENTITY_NONE UINT64_MAX

typedef struct WorldHandle WorldHandle;

typedef struct {
    uint32_t abi_version;
    uint32_t struct_size;
    const char* user_data_dir;
    const char* locale;
    uint32_t flags;
} WorldConfig;

typedef struct {
    uint32_t index;
    uint32_t generation;
    float    position[3];
    float    rotation[4];
    float    scale[3];
    uint32_t flags;
} WorldTransformPod;

typedef int32_t WorldStatus;
enum {
    WORLD_OK = 0,
    WORLD_ERR_BUFFER_TOO_SMALL = 1,
    WORLD_ERR_INVALID_ARG = 2,
    WORLD_ERR_PACK = 3,
    WORLD_ERR_SAVE = 4,
    WORLD_ERR_PANIC = 5,
    WORLD_ERR_VERSION = 6,
    WORLD_ERR_STATE = 7,
    WORLD_ERR_UNSUPPORTED = 8
};

WorldHandle* world_create(const WorldConfig* config);
void         world_destroy(WorldHandle* world);

WorldStatus  world_load_pack(WorldHandle* world, const uint8_t* bytes, size_t len);
WorldStatus  world_tick(WorldHandle* world, uint64_t frame_dt_us, uint32_t* out_ticks);
WorldStatus  world_command(WorldHandle* world, const uint8_t* bytes, size_t len,
                           uint8_t* out, size_t cap, size_t* out_len);
WorldStatus  world_poll_events(WorldHandle* world, uint8_t* out, size_t cap, size_t* out_len);
size_t       world_copy_transforms(WorldHandle* world, WorldTransformPod* out, size_t cap);
uint64_t     world_state_hash(WorldHandle* world);
uint64_t     world_find_entity(WorldHandle* world, const char* content_id);

WorldStatus  world_save(WorldHandle* world, uint8_t* out, size_t cap, size_t* out_len);
WorldStatus  world_load_save(WorldHandle* world, const uint8_t* bytes, size_t len);

WorldStatus  world_activate_zone(WorldHandle* world, const char* zone_id);
WorldStatus  world_deactivate_zone(WorldHandle* world, const char* zone_id);
WorldStatus  world_zone_assets(WorldHandle* world, const char* zone_id,
                               uint8_t* out, size_t cap, size_t* out_len);
int32_t      world_zone_status(WorldHandle* world, const char* zone_id);
WorldStatus  world_set_zone_visible(WorldHandle* world, const char* zone_id, int32_t visible);

WorldStatus  world_suspend(WorldHandle* world, int32_t suspended);
WorldStatus  world_set_timescale(WorldHandle* world, float scale);

const char*  world_last_error(WorldHandle* world);
const char*  world_core_version(void);

#ifdef __cplusplus
}
#endif

#endif
"#
}
