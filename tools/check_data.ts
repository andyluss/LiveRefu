#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 校验《明日频道》数据表是否符合其 JSON Schema（结构/必填/类型/枚举/数值范围）。
 * 纯标准库，无外部依赖（不依赖 jsonschema），与 check_data.py 同功能。
 *
 * 用法：
 *     node --experimental-strip-types tools/check_data.ts                # 校验 data/ 全表
 *     node --experimental-strip-types tools/check_data.ts -v             # 连同通过的表一起打印
 *     node --experimental-strip-types tools/check_data.ts --tables PROJ/data/tables
 */

// 工作区根：本脚本位于 <root>/tools/
const SCRIPT_PATH = path.resolve(process.argv[1] ?? "");
const HERE = path.dirname(SCRIPT_PATH);
let ROOT = path.dirname(HERE);
if (!fs.existsSync(path.join(ROOT, ".git"))) {
  ROOT = HERE;
}

const SCHEMA_DIR = "projects/tomorrows-channel/data/schema";
const TABLES_DIR = "projects/tomorrows-channel/data/tables";

// os.path.join(ROOT, x) 在 x 为绝对路径时返回 x 本身(而非拼接)
function joinRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function load(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// 简化的类型判定支持 (与 Python isinstance 语义对齐)
function typeOk(schemaType: string, value: unknown): boolean {
  if (schemaType === "integer") {
    return typeof value === "number" && Number.isInteger(value); // boolean 已排除
  }
  if (schemaType === "string") return typeof value === "string";
  if (schemaType === "number") return typeof value === "number"; // boolean 已排除
  if (schemaType === "boolean") return typeof value === "boolean";
  if (schemaType === "object") {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  if (schemaType === "array") return Array.isArray(value);
  return true; // 未知 type 不阻
}

// 模拟 Python type(value).__name__ 用于错误消息
function typeName(v: unknown): string {
  if (v === null) return "NoneType";
  if (Array.isArray(v)) return "list";
  const t = typeof v;
  if (t === "string") return "str";
  if (t === "number") return Number.isInteger(v) ? "int" : "float";
  if (t === "boolean") return "bool";
  if (t === "object") return "dict";
  return t;
}

// 模拟 Python repr 用于枚举错误消息
function pyRepr(v: unknown): string {
  if (typeof v === "string") {
    return "'" + v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
  }
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (v === null) return "None";
  if (Array.isArray(v)) return "[" + v.map(pyRepr).join(", ") + "]";
  if (typeof v === "object") {
    const rec = v as Record<string, unknown>;
    return "{" + Object.keys(rec).map((k) => pyRepr(k) + ": " + pyRepr(rec[k])).join(", ") + "}";
  }
  return String(v);
}

// 递归校验单个值(支持嵌套 properties / required / type / enum / min / max)
function validateValue(value: unknown, schema: any, p: string, errors: string[]): void {
  if ("type" in schema) {
    const st = schema["type"];
    if (st === "array") {
      if (!Array.isArray(value)) {
        errors.push(`${p}: 应为数组, 实为 ${typeName(value)}`);
        return;
      }
      const itemsSchema = schema["items"] ?? {};
      (value as unknown[]).forEach((item, idx) => {
        validateValue(item, itemsSchema, `${p}[${idx}]`, errors);
      });
      return;
    }
    if (!typeOk(st, value)) {
      errors.push(`${p}: type 应为 ${st}, 实为 ${typeName(value)}`);
      return;
    }
  }

  // 枚举
  if ("enum" in schema && !schema["enum"].includes(value)) {
    errors.push(`${p}: ${pyRepr(value)} 不在枚举 ${pyRepr(schema["enum"])}`);
    return;
  }

  // 数值范围
  if (typeof value === "number") {
    if ("minimum" in schema && (value as number) < schema["minimum"]) {
      errors.push(`${p}: ${value} < minimum ${schema["minimum"]}`);
      return;
    }
    if ("maximum" in schema && (value as number) > schema["maximum"]) {
      errors.push(`${p}: ${value} > maximum ${schema["maximum"]}`);
      return;
    }
  }

  // 对象子字段
  if (typeof value === "object" && value !== null && !Array.isArray(value) && "properties" in schema) {
    const rec = value as Record<string, unknown>;
    const props = schema["properties"];
    // 必填
    for (const req of (schema["required"] ?? [])) {
      if (!(req in rec)) {
        errors.push(`${p}: 缺必填字段 '${req}'`);
      }
    }
    // 逐字段校验
    for (const key of Object.keys(props)) {
      if (key in rec) {
        validateValue(rec[key], props[key], `${p}.${key}`, errors);
      }
    }
  }
}

// 列出 dir 下以 suffix 结尾的文件 (模拟 glob)
function globDir(dir: string, suffix: string): string[] {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names.filter((n) => n.endsWith(suffix)).map((n) => path.join(dir, n));
}

// 校验一张表: 载入 schema + 数据, 递归校验, 返回错误列表
function checkTable(schemaPath: string, tablePath: string): string[] {
  const schema = load(schemaPath);
  const table = load(tablePath);
  const errors: string[] = [];
  validateValue(table, schema, path.basename(tablePath), errors);
  return errors;
}

function main(): number {
  const argv = process.argv.slice(2);
  const verbose = argv.includes("-v") || argv.includes("--verbose");
  // 自定义目录(可选)
  let tablesDir = TABLES_DIR;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tables" && i + 1 < argv.length) {
      tablesDir = argv[i + 1];
      break;
    }
  }
  const schemaDir = SCHEMA_DIR;

  const schemaAbs = joinRoot(schemaDir);
  const tablesAbs = joinRoot(tablesDir);

  // schema: 文件名去掉 .schema.json
  const schemaFiles: Record<string, string> = {};
  for (const s of globDir(schemaAbs, ".schema.json")) {
    const name = path.basename(s).replace(".schema.json", "");
    schemaFiles[name] = s;
  }

  let totalErrors = 0;
  let checked = 0;
  const tables = globDir(tablesAbs, ".json").sort();
  for (const t of tables) {
    const base = path.basename(t).replace(".json", "");
    if (!(base in schemaFiles)) {
      // 无对应 schema 的表(如运行时副本), 跳过(或提示)
      if (verbose) console.log(`[skip] ${t} (无对应 schema)`);
      continue;
    }
    const errors = checkTable(schemaFiles[base], t);
    checked++;
    if (errors.length > 0) {
      console.log(`❌ ${base}`);
      for (const e of errors) console.log(`   - ${e}`);
      totalErrors += errors.length;
    } else if (verbose) {
      console.log(`✅ ${base}`);
    }
  }

  console.log(`校验数据表: ${checked} 张, 错误 ${totalErrors} 个`);
  return totalErrors ? 1 : 0;
}

process.exitCode = main();
