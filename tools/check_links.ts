#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 校验工作区内所有 Markdown 文件中的内部相对链接是否有效。
 *
 * 与 check_links.py 同功能：命令行参数、扫描/校验逻辑、stdout 摘要、退出码完全一致。
 *
 * 用法：
 *     node --experimental-strip-types tools/check_links.ts              # 扫描全部 md
 *     node --experimental-strip-types tools/check_links.ts --sub studio # 只扫描 studio/
 *     node --experimental-strip-types tools/check_links.ts --files README.md studio/README.md
 *     node --experimental-strip-types tools/check_links.ts -v           # 连同"有效链接"一起打印
 */

// 以本脚本(工作区/tools/)为基准定位工作区根: 上溯到 .git 所在目录
const SCRIPT_PATH = path.resolve(process.argv[1] ?? "");
const HERE = path.dirname(SCRIPT_PATH);
let ROOT = path.dirname(HERE);
if (!fs.existsSync(path.join(ROOT, ".git"))) {
  ROOT = HERE; // 兜底: 找不到 .git 就用 tools/ 的上一级
}

// lenient percent-decode, 模拟 Python urllib.parse.unquote (无效 %XX 保持原样)
function unquote(s: string): string {
  const bytes: number[] = [];
  let plain = "";
  const flush = (): void => {
    if (plain) {
      for (const b of new TextEncoder().encode(plain)) bytes.push(b);
      plain = "";
    }
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "%" && i + 2 < s.length && /^[\da-fA-F]{2}$/.test(s.slice(i + 1, i + 3))) {
      flush();
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      plain += ch;
    }
  }
  flush();
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function walkMd(start: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let names: string[];
    try {
      names = fs.readdirSync(dir);
    } catch {
      return;
    }
    names.sort();
    for (const name of names) {
      if (name === ".git") continue;
      const full = path.join(dir, name);
      let isDir = false;
      try {
        isDir = fs.lstatSync(full).isDirectory();
      } catch {
        continue;
      }
      if (isDir) {
        walk(full);
        continue;
      }
      if (name.endsWith(".md")) out.push(full);
    }
  };
  walk(start);
  return out;
}

// 返回 [链接URL, 绝对目标路径] 列表 (外链/纯锚点/仅锚点 已跳过)
function collectLinks(p: string): Array<[string, string]> {
  let text: string;
  try {
    text = fs.readFileSync(p, "utf-8");
  } catch {
    return [];
  }
  const relDir = path.dirname(p);
  const out: Array<[string, string]> = [];
  const re = /!?\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let url = m[2].trim();
    if (url.startsWith("<") && url.endsWith(">")) url = url.slice(1, -1).trim();
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("mailto:") ||
      url.startsWith("tel:")
    ) {
      continue; // 外链跳过
    }
    if (url.startsWith("#")) continue; // 纯锚点跳过
    let target = url.split("#")[0].split("?")[0];
    if (target === "") continue; // 仅锚点(如 [x](#sec))跳过
    try {
      target = unquote(target);
    } catch {
      /* 保留原样 */
    }
    target = target.replace(/\\/g, "/");
    let absTarget: string;
    if (target.startsWith("/")) {
      absTarget = path.join(ROOT, target.replace(/^\//, ""));
    } else {
      absTarget = path.normalize(path.join(relDir, target));
    }
    out.push([url, absTarget]);
  }
  return out;
}

function main(): number {
  const argv = process.argv.slice(2);
  let sub: string | null = null;
  let filesMode: string[] | null = null; // null=未指定; 否则为文件路径列表
  let verbose = false;
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--sub") {
      if (i + 1 < argv.length) {
        sub = argv[i + 1];
        i++;
      } else {
        console.log("--sub 需要一个目录参数");
        return 2;
      }
    } else if (a === "--files") {
      // 收集其后所有非 '-' 开头的参数作为文件路径; 允许空格
      const rest: string[] = [];
      let j = i + 1;
      while (j < argv.length && !argv[j].startsWith("-")) {
        rest.push(argv[j]);
        j++;
      }
      if (rest.length === 0) {
        console.log("--files 需要至少一个文件路径");
        return 2;
      }
      filesMode = rest;
      i = j - 1;
    } else if (a === "-v" || a === "--verbose") {
      verbose = true;
    } else {
      console.log(`未知参数: ${a}`);
      return 2;
    }
    i++;
  }

  // 确定待校验文件集合
  let files: string[];
  if (filesMode !== null) {
    // 以工作区根为基准解析相对路径; 去重保持顺序; 仅保留存在的 md
    const list: string[] = [];
    const seen = new Set<string>();
    for (const p of filesMode) {
      const ap = path.isAbsolute(p) ? p : path.normalize(path.join(ROOT, p));
      if (seen.has(ap)) continue;
      seen.add(ap);
      let isFile = false;
      try {
        isFile = fs.statSync(ap).isFile();
      } catch {
        isFile = false;
      }
      if (isFile) list.push(ap);
    }
    if (list.length === 0) {
      console.log("--files 指定的文件均不存在或非 md");
      return 2;
    }
    files = list.sort();
  } else {
    const start = sub ? (path.isAbsolute(sub) ? sub : path.join(ROOT, sub)) : ROOT;
    let isDir = false;
    try {
      isDir = fs.statSync(start).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) {
      console.log(`目录不存在: ${start}`);
      return 2;
    }
    files = walkMd(start).sort();
  }

  let total = 0;
  const broken: Array<[string, string, string]> = []; // (path, url, abs_target)
  for (const p of files) {
    for (const [url, absTarget] of collectLinks(p)) {
      total++;
      if (!fs.existsSync(absTarget)) {
        broken.push([p, url, absTarget]);
      } else if (verbose) {
        const ok = fs.existsSync(absTarget) ? "ok" : "MISS";
        console.log(`  [${ok}] ${path.relative(ROOT, p)} :: ${url}`);
      }
    }
  }

  console.log(`扫描 Markdown: ${files.length} 个文件`);
  console.log(`内部链接总数: ${total} 个`);
  console.log(`失效链接: ${broken.length} 个`);
  if (broken.length > 0) {
    let cur: string | null = null;
    for (const [f, url, tgt] of broken) {
      if (f !== cur) {
        console.log(`\n### ${path.relative(ROOT, f)}`);
        cur = f;
      }
      console.log(`   -> ${url}   [缺: ${path.relative(ROOT, tgt)}]`);
    }
    return 1;
  }
  return 0;
}

process.exitCode = main();
