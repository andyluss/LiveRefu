//! data-validator —— 数据契约校验器的命令行入口(实验 A)。
//!
//! 用法：
//!   data-validator <schema.json> <data.json>            # 校验一份数据文件
//!   data-validator --schema-dir DIR --data-dir DIR      # 校验整个数据目录
//!
//! 退出码：0 = 全部通过；1 = 存在违规或无法解析。

use data_validator::{ValidationError, validate_table};
use serde_json::Value;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

fn load(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path).map_err(|e| format!("读取失败 {}: {e}", path.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败 {}: {e}", path.display()))
}

fn validate_file(schema_path: &Path, data_path: &Path) -> Result<Vec<ValidationError>, String> {
    let schema = load(schema_path)?;
    let data = load(data_path)?;
    let label = data_path
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| data_path.display().to_string());
    Ok(validate_table(&schema, &data, &label))
}

fn report(label: &str, errors: &[ValidationError]) {
    println!("❌ {label}");
    for e in errors {
        println!("   - {}: {}", e.path, e.message);
    }
}

/// 逐个用 `<name>.schema.json` 匹配 `<name>.json` 进行校验。
fn validate_dir(schema_dir: &Path, data_dir: &Path) -> Result<usize, String> {
    let mut data_files: Vec<PathBuf> = fs::read_dir(data_dir)
        .map_err(|e| format!("读取数据目录失败 {data_dir:?}: {e}"))?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|p| p.is_file() && p.extension().is_some_and(|x| x == "json"))
        .collect();
    data_files.sort();

    let mut total_errors = 0usize;
    let mut checked = 0usize;
    for data_file in &data_files {
        let base = data_file
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();
        let schema_file = schema_dir.join(format!("{base}.schema.json"));
        if !schema_file.is_file() {
            continue; // 无对应 schema 的表跳过
        }
        match validate_file(&schema_file, data_file) {
            Ok(errors) => {
                checked += 1;
                if errors.is_empty() {
                    println!("✅ {}", base);
                } else {
                    report(base.as_str(), &errors);
                    total_errors += errors.len();
                }
            }
            Err(msg) => {
                eprintln!("{msg}");
                total_errors += 1;
            }
        }
    }
    println!("校验数据表: {checked} 张, 错误 {total_errors} 个");
    Ok(total_errors)
}

fn usage() -> String {
    "用法：\n  data-validator <schema.json> <data.json>\n  data-validator --schema-dir DIR --data-dir DIR"
        .to_string()
}

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();

    // --schema-dir / --data-dir 模式
    let mut schema_dir: Option<PathBuf> = None;
    let mut data_dir: Option<PathBuf> = None;
    let mut positionals: Vec<&str> = Vec::new();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--schema-dir" => {
                if i + 1 >= args.len() {
                    eprintln!("缺 --schema-dir 参数值");
                    return ExitCode::from(2);
                }
                schema_dir = Some(PathBuf::from(&args[i + 1]));
                i += 2;
            }
            "--data-dir" => {
                if i + 1 >= args.len() {
                    eprintln!("缺 --data-dir 参数值");
                    return ExitCode::from(2);
                }
                data_dir = Some(PathBuf::from(&args[i + 1]));
                i += 2;
            }
            other if other.starts_with('-') => {
                eprintln!("未知参数: {other}\n{}", usage());
                return ExitCode::from(2);
            }
            other => {
                positionals.push(other);
                i += 1;
            }
        }
    }

    if let (Some(sd), Some(dd)) = (schema_dir, data_dir) {
        return match validate_dir(&sd, &dd) {
            Ok(0) => ExitCode::SUCCESS,
            Ok(_) => ExitCode::from(1),
            Err(msg) => {
                eprintln!("{msg}");
                ExitCode::from(1)
            }
        };
    }

    if positionals.len() == 2 {
        let schema_path = PathBuf::from(positionals[0]);
        let data_path = PathBuf::from(positionals[1]);
        return match validate_file(&schema_path, &data_path) {
            Ok(errors) if errors.is_empty() => ExitCode::SUCCESS,
            Ok(errors) => {
                report(data_path.display().to_string().as_str(), &errors);
                ExitCode::from(1)
            }
            Err(msg) => {
                eprintln!("{msg}");
                ExitCode::from(1)
            }
        };
    }

    eprintln!("{}", usage());
    ExitCode::from(2)
}
