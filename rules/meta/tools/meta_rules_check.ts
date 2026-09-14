#!/usr/bin/env node
// meta_rules_check —— 把元规则 M1+M2 接入一条**可运行**的检查（支持**递归子关注点**）。
// 跨运行时 TypeScript（node/deno/bun 直接运行）。整合自 lab/formal-system/concerns/meta-rules/tools/meta_rules_check.ts。

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const HERE = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
// 本脚本位于 rules/meta/tools/ 下
const DEFAULT_ROOT = path.normalize(path.join(HERE, "..", "..")); // rules/
const DEFAULT_CONFIG = path.normalize(path.join(HERE, "..", "meta-rules-config.json"));

function cleanCfg(cfg: any): any {
  return {
    root_docs: cfg.root_docs ?? ["README.md"],
    type_vocab: cfg.type_vocab ?? [],
    code_types: cfg.code_types ?? [],
    empty_ok_types: cfg.empty_ok_types ?? [],
    doc_naming: cfg.doc_naming ?? { default: ["^[a-z][a-z0-9_-]*$"] },
    skip_dirs: cfg.skip_dirs ?? ["__pycache__", "target", ".git", "node_modules"],
    skip_prefixes: cfg.skip_prefixes ?? [".", "_"],
    sub_concerns: cfg.sub_concerns ?? [],
    sub_concerns_dir: cfg.sub_concerns_dir ?? null,
    sub_configs: cfg.sub_configs ?? {},
  };
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listdir(p: string): string[] {
  try {
    return fs.readdirSync(p, { encoding: "utf8" });
  } catch {
    return [];
  }
}

function named(matchRegs: RegExp[], name: string): boolean {
  return matchRegs.some((r) => r.test(name));
}

// Python str(list) 风格：['^\\d{2}_', '^[a-z]...']（单引号、转义反斜杠）
function pyRepr(arr: string[]): string {
  return "[" + arr.map((s) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'").join(", ") + "]";
}

function runCheck(rootIn: string, cfgIn: any, prefix = ""): [string[], string[]] {
  const cfg = cleanCfg(cfgIn);
  const root = path.resolve(rootIn);
  const issues: string[] = [];
  const info: string[] = [];

  const mark = (ok: boolean, text: string): void => {
    const line = prefix + text;
    (ok ? info : issues).push(line);
  };

  // ---- M1: 出入口 README ----
  if (!isFile(path.join(root, "README.md"))) {
    mark(false, "[M1] 关注点缺出入口 README.md");
  } else {
    mark(true, "[M1] 出入口 README.md ✔");
  }

  const root_docs = new Set<string>(cfg.root_docs);
  const type_vocab = new Set<string>(cfg.type_vocab);
  const code_types = new Set<string>(cfg.code_types);
  const sub_concerns = new Set<string>(cfg.sub_concerns);
  const sub_concerns_dir = cfg.sub_concerns_dir;
  const skill_dirs = new Set<string>(cfg.skip_dirs);
  const default_naming: RegExp[] = (cfg.doc_naming.default ?? []).map((p: string) => new RegExp(p));

  const validateSub = (ep: string, sub_cfg: any, child_label: string, child_prefix: string): void => {
    if (sub_cfg.code) {
      if (isFile(path.join(ep, "README.md"))) {
        mark(true, `[M1] 代码子关注点(命名豁免) ✔ ${child_label}/`);
      } else {
        issues.push(`${prefix}[M1] 代码子关注点缺 README ✗ ${child_label}/`);
      }
    } else {
      const [sub_issues, sub_info] = runCheck(ep, sub_cfg, child_prefix);
      issues.push(...sub_issues);
      info.push(...sub_info);
      if (sub_issues.length === 0) {
        mark(true, `[M1] 子关注点 ✔ ${child_label}/`);
      } else {
        issues.push(`${prefix}[M1] 子关注点有违规 ✗ ${child_label}/`);
      }
    }
  };

  const entries = listdir(root).sort();
  for (const entry of entries) {
    const ep = path.join(root, entry);
    if (skill_dirs.has(entry)) continue;
    if (isDir(ep)) {
      if (type_vocab.has(entry) || code_types.has(entry)) {
        const kind = code_types.has(entry) ? "代码类(命名豁免)" : "文档/类型";
        mark(true, `[M2] 类型目录 ✔ ${entry} (${kind})`);
      } else if (sub_concerns_dir && entry === sub_concerns_dir) {
        // 子关注点统一目录：其下每个子目录是一个子关注点(允许 README/STRUCTURE 说明文件)
        const subs = listdir(ep).sort();
        for (const sub of subs) {
          if (sub === "README.md" || sub === "STRUCTURE.md") continue;
          const sub_ep = path.join(ep, sub);
          if (isDir(sub_ep)) {
            validateSub(sub_ep, cfg.sub_configs[sub] ?? {}, sub, prefix + entry + "/" + sub + "/");
          } else {
            mark(false, `[M1] 子关注点容器内非常规条目 ✗ ${entry}/${sub}`);
          }
        }
        mark(true, `[M1] 子关注点统一目录 ✔ ${entry}/`);
      } else if (
        sub_concerns.has(entry) ||
        (!type_vocab.has(entry) && isFile(path.join(ep, "README.md")))
      ) {
        validateSub(ep, cfg.sub_configs[entry] ?? {}, entry, prefix + entry + "/");
      } else {
        mark(false, `[M2] 未知类型目录(不在词表,也非子关注点) ✗ ${entry}`);
      }
    } else {
      if (root_docs.has(entry) || entry === "STRUCTURE.md" || named(default_naming, entry)) {
        mark(true, `[M2] 根文档 ✔ ${entry}`);
      } else {
        mark(false, `[M2] 根目录未声明文件 ✗ ${entry}`);
      }
    }
  }

  // 子关注点统一目录 / 声明的子关注点须已建立
  if (sub_concerns_dir && !isDir(path.join(root, sub_concerns_dir))) {
    mark(false, `[M1] 声明了子关注点统一目录但未建立 ✗ ${sub_concerns_dir}/`);
  }
  for (const name of Array.from(sub_concerns).sort()) {
    if (!isDir(path.join(root, name))) {
      mark(false, `[M1] 声明了子关注点但目录未建立 ✗ ${name}/`);
    }
  }

  // ---- M2: 文档类类型目录内命名 ----
  const docTypes = Array.from(new Set<string>(cfg.type_vocab as string[]))
    .filter((t) => !code_types.has(t))
    .sort();
  for (const t of docTypes) {
    const tpath = path.join(root, t);
    if (!isDir(tpath)) {
      if (cfg.empty_ok_types.includes(t)) {
        mark(true, `[M2] 空类型(允许, 待写) ✔ ${t}/`);
      }
      continue;
    }
    const patterns = cfg.doc_naming[t] ?? cfg.doc_naming.default ?? [];
    const regs: RegExp[] = patterns.map((p: string) => new RegExp(p));
    const names = listdir(tpath).sort();
    for (const name of names) {
      if (name === "README.md" || name === "STRUCTURE.md") continue;
      if (cfg.skip_prefixes.some((pfx: string) => name.startsWith(pfx))) continue;
      if (isDir(path.join(tpath, name))) {
        mark(true, `[M2] 子目录(子关注点/再切) · ${t}/${name}`);
        continue;
      }
      if (named(regs, name)) {
        mark(true, `[M2] 命名 ✔ ${t}/${name}`);
      } else {
        mark(false, `[M2] 命名不符合约定 ✗ ${t}/${name}  允许:${pyRepr(patterns)}`);
      }
    }
  }

  return [issues, info];
}

function selfTest(): number {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "meta-check-"));
  // 一级关注点
  fs.writeFileSync(path.join(base, "README.md"), "");
  fs.writeFileSync(path.join(base, "stray.txt"), "");
  fs.mkdirSync(path.join(base, "unknown_thing"));
  fs.mkdirSync(path.join(base, "docs"));
  fs.writeFileSync(path.join(base, "docs", "My File.md"), "");
  fs.writeFileSync(path.join(base, "docs", "00_ok.md"), "");
  // 递归子关注点：带 README 的最小合法子关注点 → 递归应通过
  fs.mkdirSync(path.join(base, "sub_a"));
  fs.writeFileSync(path.join(base, "sub_a", "README.md"), "");

  const cfg = {
    root_docs: ["README.md"],
    type_vocab: ["docs"],
    code_types: [],
    empty_ok_types: [],
    doc_naming: { default: ["^\\d{2}_", "^[a-z][a-z0-9_-]*$"] },
    skip_dirs: [],
    skip_prefixes: [".", "_"],
    sub_concerns: ["sub_a"],
  };
  const [issues, _info] = runCheck(base, cfg);

  const has = (list: string[], sub: string): boolean => list.some((i) => i.includes(sub));

  // 检出三类违规 + 根 README 正常
  let ok =
    has(issues, "未知类型目录") &&
    has(issues, "根目录未声明文件") &&
    has(issues, "命名不符合约定") &&
    !has(issues, "[M1]");

  // 递归：sub_a 是带 README 的子关注点（命名允许）→ 不应计入违规
  ok = ok && _info.some((i) => i.includes("[M1] 子关注点 ✔ sub_a/"));

  // 反例：无 README 的子目录（非类型）→ 应按"未知类型目录"被检出
  const base2 = fs.mkdtempSync(path.join(os.tmpdir(), "meta-check-"));
  fs.writeFileSync(path.join(base2, "README.md"), "");
  fs.mkdirSync(path.join(base2, "sub_b"));
  const [issues2] = runCheck(base2, cfg);
  ok = ok && has(issues2, "未知类型目录");

  for (const i of issues) console.log("  捕获: " + i);
  console.log("self-test:", ok ? "PASS" : "FAIL");
  return ok ? 0 : 1;
}

function argGet(argv: string[], name: string): string | null {
  const flag = "--" + name;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag) {
      if (i + 1 < argv.length) return argv[i + 1];
      return null;
    }
    if (argv[i].startsWith(flag + "=")) return argv[i].slice(flag.length + 1);
  }
  return null;
}

function main(): number {
  if (process.argv.includes("--self-test")) return selfTest();

  const root = argGet(process.argv, "root") ?? DEFAULT_ROOT;
  const config = argGet(process.argv, "config") ?? DEFAULT_CONFIG;

  let cfg: any;
  try {
    cfg = JSON.parse(fs.readFileSync(config, "utf8"));
  } catch (e) {
    console.error("配置文件读取失败: " + config);
    return 1;
  }
  const [issues, info] = runCheck(root, cfg);

  const concern = cfg.concern ?? path.basename(path.resolve(root));
  console.log(`元规则检查 M1+M2 · ${concern}`);
  for (const line of info) console.log("  ✓ " + line);
  for (const line of issues) console.log("  ✗ " + line);
  const codeTypes: string[] = cfg.code_types ?? [];
  const codeHint = codeTypes.length ? codeTypes.slice().sort().join(", ") : "—";
  console.log(`\n判定: 合规项 ${info.length} · 违规 ${issues.length}   [代码类豁免命名: ${codeHint}]`);

  const jsonPath = argGet(process.argv, "json");
  if (jsonPath) {
    const payload = {
      generated: new Date().toISOString(),
      concern,
      root: path.resolve(root),
      compliant: issues.length === 0,
      counts: { ok: info.length, violations: issues.length },
      items: info.map((t) => ({ status: "ok", text: t })).concat(issues.map((t) => ({ status: "violation", text: t }))),
    };
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
      console.log("结果已写出: " + jsonPath);
    } catch (e) {
      console.error("结果写入失败: " + jsonPath);
      return 1;
    }
  }
  return issues.length ? 1 : 0;
}

process.exitCode = main();
