use std::path::PathBuf;
use world_core::Trace;
use world_pack::Pack;
use world_script::run_trace_with_scripts;

fn main() {
    if let Err(error) = run() {
        eprintln!("world-host-headless: {error}");
        std::process::exit(2);
    }
}

fn run() -> Result<(), String> {
    let mut pack_dir: Option<PathBuf> = None;
    let mut trace_path: Option<PathBuf> = None;
    let mut ticks: Option<u64> = None;
    let mut keyframe_every = 60u64;
    let mut print_events = false;

    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--pack" => pack_dir = Some(PathBuf::from(next(&mut args, "--pack")?)),
            "--trace" => trace_path = Some(PathBuf::from(next(&mut args, "--trace")?)),
            "--ticks" => {
                ticks = Some(
                    next(&mut args, "--ticks")?
                        .parse()
                        .map_err(|e| format!("--ticks 解析失败: {e}"))?,
                )
            }
            "--keyframe" => {
                keyframe_every = next(&mut args, "--keyframe")?
                    .parse()
                    .map_err(|e| format!("--keyframe 解析失败: {e}"))?
            }
            "--events" => print_events = true,
            "--help" | "-h" => {
                println!("world-host-headless --pack <dir> [--ticks N] [--trace file] [--events]");
                return Ok(());
            }
            other => return Err(format!("未知参数: {other}")),
        }
    }

    let pack_dir = pack_dir.ok_or_else(|| "缺少 --pack <dir>".to_string())?;
    let pack = Pack::load_dir(&pack_dir).map_err(|e| e.to_string())?;
    let report = pack.validate();
    if !report.is_ok() {
        for error in &report.errors {
            eprintln!("{error}");
        }
        return Err(format!("内容包校验失败：{} 个错误", report.errors.len()));
    }

    let trace = if let Some(path) = trace_path {
        let text = std::fs::read_to_string(&path)
            .map_err(|e| format!("读取 trace 失败 {}: {e}", path.display()))?;
        serde_json::from_str::<Trace>(&text)
            .map_err(|e| format!("trace 解析失败 {}: {e}", path.display()))?
    } else {
        Trace {
            ticks: ticks.unwrap_or(600),
            steps: Vec::new(),
        }
    };
    let ticks = ticks.unwrap_or(trace.ticks);
    let mut trace = trace;
    trace.ticks = ticks;

    let result = run_trace_with_scripts(&pack, &trace, keyframe_every)?;
    let summary = serde_json::json!({
        "pack_id": result.pack_id,
        "pack_hash": result.pack_hash,
        "ticks": result.ticks,
        "final_hash": format!("0x{:016x}", result.final_hash),
        "event_count": result.events.len(),
        "keyframes": result.keyframes,
    });
    if print_events {
        for event in &result.events {
            println!("{}", serde_json::to_string(event).unwrap_or_default());
        }
    }
    println!(
        "{}",
        serde_json::to_string_pretty(&summary).unwrap_or_default()
    );
    Ok(())
}

fn next(args: &mut impl Iterator<Item = String>, flag: &str) -> Result<String, String> {
    args.next().ok_or_else(|| format!("{flag} 缺少值"))
}
