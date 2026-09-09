#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
meta_rules_check —— 把元规则 M1+M2 接入一条**可运行**的检查（支持**递归子关注点**）。

判定"关注点"目录是否符合：
  M1 文件组织=关注点优先/类型其次（含递归）：关注点根有 `README.md`(出入口)；子项是"类型目录 / 根文档 /
      **子关注点**"；子关注点**递归**校验（必须有 README，且内部同样遵守类型词表+命名）。
  M2 命名/类型词表：子目录在**类型词表**内；根文档在白名单或符合命名模式；**文档类**类型内文件命名符合
      （`NN_`/`YYYYMMDD(HHMM)-`/`snake_case`）；代码类类型按各自工程约定豁免。

规则依据：[`../meta-rules/M1-file-organization.md`](../meta-rules/M1-file-organization.md)、
[`../meta-rules/M2-naming-vocabulary.md`](../meta-rules/M2-naming-vocabulary.md)、
配置：[`../meta-rules/meta-rules-config.json`](../meta-rules/meta-rules-config.json)。

用法：
  python3 lab/formal-system/concerns/meta-rules/tools/meta_rules_check.py                    # 默认检查 lab/formal-system
  python3 lab/formal-system/concerns/meta-rules/tools/meta_rules_check.py --root <dir> --config <json>
  python3 lab/formal-system/concerns/meta-rules/tools/meta_rules_check.py --json <path>     # 额外写机器可读结果
  python3 lab/formal-system/concerns/meta-rules/tools/meta_rules_check.py --self-test
退出码：0=全部符合；1=存在违规。
"""
import argparse
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
# 本脚本位于 lab/formal-system/concerns/meta-rules/tools/ 下
DEFAULT_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))  # lab/formal-system (formal-system)
DEFAULT_CONFIG = os.path.normpath(os.path.join(HERE, "..", "meta-rules-config.json"))


def _clean_cfg(cfg):
    """补齐可选键；sub_configs 若缺省则继承父级命名。"""
    return {
        "root_docs": cfg.get("root_docs", ["README.md"]),
        "type_vocab": cfg.get("type_vocab", []),
        "code_types": cfg.get("code_types", []),
        "empty_ok_types": cfg.get("empty_ok_types", []),
        "doc_naming": cfg.get("doc_naming", {"default": ["^[a-z][a-z0-9_-]*$"]}),
        "skip_dirs": cfg.get("skip_dirs", ["__pycache__", "target", ".git", "node_modules"]),
        "skip_prefixes": cfg.get("skip_prefixes", [".", "_"]),
        "sub_concerns": cfg.get("sub_concerns", []),
        "sub_concerns_dir": cfg.get("sub_concerns_dir"),
        "sub_configs": cfg.get("sub_configs", {}),
    }


def _named(match_regs, name):
    return any(r.match(name) for r in match_regs)


def run_check(root, cfg, prefix=""):
    """递归校验一个关注点；返回 (issues, info) 字符串列表（行已带前缀）。"""
    cfg = _clean_cfg(cfg)
    root = os.path.abspath(root)
    issues, info = [], []

    def mark(ok, text):
        line = f"{prefix}{text}"
        (info if ok else issues).append(line)

    # ---- M1: 出入口 README ----
    if not os.path.isfile(os.path.join(root, "README.md")):
        mark(False, f"[M1] 关注点缺出入口 README.md")
    else:
        mark(True, f"[M1] 出入口 README.md ✔")

    root_docs = set(cfg["root_docs"])
    type_vocab = set(cfg["type_vocab"])
    code_types = set(cfg["code_types"])
    sub_concerns = set(cfg["sub_concerns"])
    sub_concerns_dir = cfg.get("sub_concerns_dir")
    skill_dirs = set(cfg["skip_dirs"])
    default_naming = [re.compile(p) for p in cfg["doc_naming"].get("default", [])]

    def validate_sub(ep, sub_cfg, child_label, child_prefix):
        """校验一个子关注点（代码型 或 递归）。"""
        if sub_cfg.get("code"):
            if os.path.isfile(os.path.join(ep, "README.md")):
                mark(True, f"[M1] 代码子关注点(命名豁免) ✔ {child_label}/")
            else:
                issues.append(f"{prefix}[M1] 代码子关注点缺 README ✗ {child_label}/")
        else:
            sub_issues, sub_info = run_check(ep, sub_cfg, prefix=child_prefix)
            issues.extend(sub_issues)
            info.extend(sub_info)
            if not sub_issues:
                mark(True, f"[M1] 子关注点 ✔ {child_label}/")
            else:
                issues.append(f"{prefix}[M1] 子关注点有违规 ✗ {child_label}/")

    for entry in sorted(os.listdir(root)):
        ep = os.path.join(root, entry)
        if entry in skill_dirs:
            continue
        if os.path.isdir(ep):
            if entry in type_vocab or entry in code_types:
                kind = "代码类(命名豁免)" if entry in code_types else "文档/类型"
                mark(True, f"[M2] 类型目录 ✔ {entry} ({kind})")
            elif sub_concerns_dir and entry == sub_concerns_dir:
                # 子关注点统一目录：其下每个子目录是一个子关注点(允许 README/STRUCTURE 说明文件)
                for sub in sorted(os.listdir(ep)):
                    if sub in ("README.md", "STRUCTURE.md"):
                        continue
                    sub_ep = os.path.join(ep, sub)
                    if os.path.isdir(sub_ep):
                        validate_sub(sub_ep, cfg["sub_configs"].get(sub, {}),
                                     child_label=sub, child_prefix=prefix + entry + "/" + sub + "/")
                    else:
                        mark(False, f"[M1] 子关注点容器内非常规条目 ✗ {entry}/{sub}")
                mark(True, f"[M1] 子关注点统一目录 ✔ {entry}/")
            elif entry in sub_concerns or (
                entry not in type_vocab and os.path.isfile(os.path.join(ep, "README.md"))
            ):
                validate_sub(ep, cfg["sub_configs"].get(entry, {}),
                             child_label=entry, child_prefix=prefix + entry + "/")
            else:
                mark(False, f"[M2] 未知类型目录(不在词表,也非子关注点) ✗ {entry}")
        else:
            if entry in root_docs or entry == "STRUCTURE.md" or _named(default_naming, entry):
                mark(True, f"[M2] 根文档 ✔ {entry}")
            else:
                mark(False, f"[M2] 根目录未声明文件 ✗ {entry}")

    # 子关注点统一目录 / 声明的子关注点须已建立
    if sub_concerns_dir and not os.path.isdir(os.path.join(root, sub_concerns_dir)):
        mark(False, f"[M1] 声明了子关注点统一目录但未建立 ✗ {sub_concerns_dir}/")
    for name in sorted(sub_concerns):
        if not os.path.isdir(os.path.join(root, name)):
            mark(False, f"[M1] 声明了子关注点但目录未建立 ✗ {name}/")

    # ---- M2: 文档类类型目录内命名 ----
    for t in sorted(type_vocab - code_types):
        tpath = os.path.join(root, t)
        if not os.path.isdir(tpath):
            if t in cfg["empty_ok_types"]:
                mark(True, f"[M2] 空类型(允许, 待写) ✔ {t}/")
            continue
        patterns = cfg["doc_naming"].get(t, cfg["doc_naming"].get("default", []))
        regs = [re.compile(p) for p in patterns]
        for name in sorted(os.listdir(tpath)):
            if name in ("README.md", "STRUCTURE.md"):
                continue
            if any(name.startswith(pfx) for pfx in cfg["skip_prefixes"]):
                continue
            if os.path.isdir(os.path.join(tpath, name)):
                mark(True, f"[M2] 子目录(子关注点/再切) · {t}/{name}")
                continue
            if any(r.match(name) for r in regs):
                mark(True, f"[M2] 命名 ✔ {t}/{name}")
            else:
                mark(False, f"[M2] 命名不符合约定 ✗ {t}/{name}  允许:{patterns}")

    return issues, info


def self_test():
    base = tempfile.mkdtemp(prefix="meta-check-")
    # 一级关注点
    open(os.path.join(base, "README.md"), "w").close()
    open(os.path.join(base, "stray.txt"), "w").close()
    os.makedirs(os.path.join(base, "unknown_thing"))
    os.makedirs(os.path.join(base, "docs"))
    open(os.path.join(base, "docs", "My File.md"), "w").close()
    open(os.path.join(base, "docs", "00_ok.md"), "w").close()
    # 递归子关注点：带 README 的最小合法子关注点 → 递归应通过
    os.makedirs(os.path.join(base, "sub_a"))
    open(os.path.join(base, "sub_a", "README.md"), "w").close()

    cfg = {
        "root_docs": ["README.md"],
        "type_vocab": ["docs"],
        "code_types": [],
        "empty_ok_types": [],
        "doc_naming": {"default": ["^\\d{2}_", "^[a-z][a-z0-9_-]*$"]},
        "skip_dirs": [],
        "skip_prefixes": [".", "_"],
        "sub_concerns": ["sub_a"],
    }
    issues, _info = run_check(base, cfg)

    def has(issues_, sub):
        return any(sub in i for i in issues_)

    # 检出三类违规 + 根 README 正常
    ok = (has(issues, "未知类型目录") and has(issues, "根目录未声明文件")
          and has(issues, "命名不符合约定") and not has(issues, "[M1]"))

    # 递归：sub_a 是带 README 的子关注点（命名允许）→ 不应计入违规
    if any("[M1] 子关注点 ✔ sub_a/" in i for i in _info):
        ok = ok and True
    else:
        ok = ok and False

    # 反例：无 README 的子目录（非类型）→ 应按"未知类型目录"被检出
    base2 = tempfile.mkdtemp(prefix="meta-check-")
    open(os.path.join(base2, "README.md"), "w").close()
    os.makedirs(os.path.join(base2, "sub_b"))
    issues2, _ = run_check(base2, cfg)
    ok = ok and has(issues2, "未知类型目录")

    for i in issues:
        print("  捕获: " + i)
    print("self-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        return self_test()

    ap = argparse.ArgumentParser(description="元规则 M1+M2 可运行检查(支持递归子关注点)")
    ap.add_argument("--root", default=DEFAULT_ROOT)
    ap.add_argument("--config", default=DEFAULT_CONFIG)
    ap.add_argument("--json", default=None, help="额外写出机器可读结果 JSON")
    args = ap.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)
    issues, info = run_check(args.root, cfg)

    concern = cfg.get("concern", os.path.basename(os.path.abspath(args.root)))
    print(f"元规则检查 M1+M2 · {concern}")
    for line in info:
        print("  ✓ " + line)
    for line in issues:
        print("  ✗ " + line)
    code_hint = ", ".join(sorted(cfg.get("code_types", []))) if cfg.get("code_types") else "—"
    print(f"\n判定: 合规项 {len(info)} · 违规 {len(issues)}   [代码类豁免命名: {code_hint}]")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump({
                "generated": __import__("datetime").datetime.now().astimezone().isoformat(),
                "concern": concern,
                "root": os.path.abspath(args.root),
                "compliant": not bool(issues),
                "counts": {"ok": len(info), "violations": len(issues)},
                "items": [{"status": "ok", "text": t} for t in info]
                         + [{"status": "violation", "text": t} for t in issues],
            }, f, ensure_ascii=False, indent=2)
        print(f"结果已写出: {args.json}")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
