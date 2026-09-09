#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
meta_rules_check —— 把元规则 M1+M2 接入一条**可运行**的检查。

判定"关注点"目录是否符合：
  M1 文件组织=关注点优先/类型其次：关注点根有 `README.md`(出入口)；子项是"**类型目录 + 根文档**"，无散落。
  M2 命名/类型词表：子目录在**类型词表**内；根文件在**根文档白名单**内；**文档类**类型目录里的文件名
     符合约定模式（`NN_` 顺序前缀 / `YYYYMMDD(或-HHMM)-` 日期前缀 / `snake_case` 语义名），
     代码类类型（prototypes/tools）按各自工程约定豁免。

规则依据：[`../meta-rules/M1-file-organization.md`](../meta-rules/M1-file-organization.md)、
[`../meta-rules/M2-naming-vocabulary.md`](../meta-rules/M2-naming-vocabulary.md)、
配置：[`../meta-rules/meta-rules-config.json`](../meta-rules/meta-rules-config.json)。

用法：
  python3 lab/formal-system/tools/meta_rules_check.py                    # 默认检查 lab/formal-system
  python3 lab/formal-system/tools/meta_rules_check.py --root <dir> --config <json>  # 自定义
  python3 lab/formal-system/tools/meta_rules_check.py --self-test       # 自检检测逻辑(见列)
退出码：0=全部符合；1=存在违规。
"""
import argparse
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.normpath(os.path.join(HERE, ".."))  # lab/formal-system
DEFAULT_CONFIG = os.path.normpath(os.path.join(HERE, "..", "meta-rules", "meta-rules-config.json"))


def run_check(root, cfg):
    """执行 M1+M2 校验；返回 (issues, info) 两个字符串列表。"""
    root = os.path.abspath(root)
    issues, info = [], []

    if not os.path.isfile(os.path.join(root, "README.md")):
        issues.append("[M1] 关注点根缺出入口 README.md")
    else:
        info.append("[M1] 出入口 README.md ✔")

    skip_dirs = set(cfg.get("skip_dirs", []))
    type_vocab = set(cfg.get("type_vocab", []))
    root_docs = set(cfg.get("root_docs", []))
    code_types = set(cfg.get("code_types", []))

    for entry in sorted(os.listdir(root)):
        ep = os.path.join(root, entry)
        if entry in skip_dirs:
            continue
        if os.path.isdir(ep):
            if entry in type_vocab:
                kind = "代码类(命名豁免)" if entry in code_types else "文档/类型"
                info.append(f"[M2] 类型目录 ✔ {entry} ({kind})")
            else:
                issues.append(f"[M2] 未知类型目录(不在词表) ✗ {entry}")
        else:
            if entry in root_docs:
                info.append(f"[M2] 根文档 ✔ {entry}")
            else:
                issues.append(f"[M2] 根目录未声明文件 ✗ {entry}")

    default_patterns = cfg.get("doc_naming", {}).get("default", [])
    for t in sorted(type_vocab - code_types):
        tpath = os.path.join(root, t)
        if not os.path.isdir(tpath):
            if t in cfg.get("empty_ok_types", []):
                info.append(f"[M2] 空类型(允许, 待写) ✔ {t}/")
            continue
        patterns = cfg.get("doc_naming", {}).get(t, default_patterns)
        regs = [re.compile(p) for p in patterns]
        for name in sorted(os.listdir(tpath)):
            if name == "README.md":
                continue
            if any(name.startswith(pfx) for pfx in cfg.get("skip_prefixes", [".", "_"])):
                continue
            if os.path.isdir(os.path.join(tpath, name)):
                info.append(f"[M2] 子目录(子关注点/再切) · {t}/{name}")
                continue
            if any(r.match(name) for r in regs):
                info.append(f"[M2] 命名 ✔ {t}/{name}")
            else:
                issues.append(f"[M2] 命名不符合约定 ✗ {t}/{name}  允许:{patterns}")

    return issues, info


def self_test():
    """用临时目录造违规，断言检测器能抓住（匹配/未知类型/根散落文件/坏命名）。"""
    base = tempfile.mkdtemp(prefix="meta-check-")
    os.makedirs(os.path.join(base, "docs"))
    base_path = os.path.join(base, "docs")
    open(os.path.join(base, "README.md"), "w").close()            # 出入口 ✔
    open(os.path.join(base, "stray.txt"), "w").close()           # 根散落文件 ✗
    os.makedirs(os.path.join(base, "unknown_thing"))             # 未知类型目录 ✗
    open(os.path.join(base_path, "My File.md"), "w").close()     # 坏命名(空格/大写) ✗
    open(os.path.join(base_path, "00_ok.md"), "w").close()       # 好命名 ✔

    cfg = {
        "root_docs": ["README.md"],
        "type_vocab": ["docs"],
        "code_types": [],
        "empty_ok_types": [],
        "doc_naming": {"default": ["^\\d{2}_", "^[a-z][a-z0-9_-]*$"]},
        "skip_dirs": [],
        "skip_prefixes": [".", "_"],
    }
    issues, _info = run_check(base, cfg)

    def has(sub):
        return any(sub in i for i in issues)

    ok = all([
        has("未知类型目录"),
        has("根目录未声明文件"),
        has("命名不符合约定"),
        not any(i.startswith("[M1]") for i in issues),  # README 存在
    ])
    for i in issues:
        print("  捕获: " + i)
    print("self-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        return self_test()

    ap = argparse.ArgumentParser(description="元规则 M1+M2 可运行检查")
    ap.add_argument("--root", default=DEFAULT_ROOT, help="要检查的关注点目录")
    ap.add_argument("--config", default=DEFAULT_CONFIG, help="元规则判定配置 JSON")
    args = ap.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)
    root = args.root
    issues, info = run_check(root, cfg)

    concern = cfg.get("concern", os.path.basename(os.path.abspath(root)))
    print(f"元规则检查 M1+M2 · {concern}  (root={root})")
    for line in info:
        print("  ✓ " + line)
    for line in issues:
        print("  ✗ " + line)
    code_hint = ", ".join(sorted(cfg.get("code_types", []))) if cfg.get("code_types") else "—"
    print(f"\n判定: 合规项 {len(info)} · 违规 {len(issues)}   [代码类豁免命名: {code_hint}]")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
