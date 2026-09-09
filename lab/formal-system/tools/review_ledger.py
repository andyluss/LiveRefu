#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
review_ledger —— 人工复核账本 CLI（可视验证面第③层）。

配合 `visual_health.py`（它算出异常：孤立/高待定/陈旧），由**人类**对每个异常登记
`approve`（通过/知悉）或 `flag`（标记待处理 + 理由），写入**追加式** ledger，形成
**可追踪、可统计**的复核记录；`visual_health.py` 读取该 ledger，把异常标注为
`未复核 / 已通过 / 已标记` 并给出复核覆盖率。

只做登记/查询，不推导或伪造结论——approve/flag 与理由由人类填写。

用法：
  python3 lab/formal-system/tools/review_ledger.py record --rel <path> --verdict approve|flag --reason "<原因>" [--reviewer <人>] [--action "<行动>"]
  python3 lab/formal-system/tools/review_ledger.py list
  python3 lab/formal-system/tools/review_ledger.py status
  python3 lab/formal-system/tools/review_ledger.py delete <id>

--ledger <path> 可覆盖默认账本路径。
"""
import argparse
import datetime
import json
import os
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DEFAULT_LEDGER = os.path.join(ROOT, "lab", "formal-system", "viz", "review-ledger.json")
SCHEMA = "lab/formal-system/review-ledger v1"


def rel_norm(path):
    """>>> 归一化到工作区根，统一为正斜杠。"""
    if os.path.isabs(path):
        p = os.path.relpath(os.path.abspath(path), ROOT)
    else:
        p = path
    return p.replace("\\", "/")


def load(path):
    if not os.path.exists(path):
        return {"schema": SCHEMA, "records": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def add_record(args, data):
    verdict = args.verdict.lower()
    if verdict not in ("approve", "flag"):
        raise SystemExit("verdict 必须为 approve 或 flag")
    rec = {
        "id": uuid.uuid4().hex[:8],
        "rel": rel_norm(args.rel),
        "verdict": verdict,
        "reason": args.reason,
        "reviewer": args.reviewer,
        "reviewed_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    if getattr(args, "action", None):
        rec["action"] = args.action
    data["records"].append(rec)
    return rec


def latest_by_rel(data):
    """每个 rel 的最新一条记录（追加式，故取最后写入者=当前态）。"""
    out = {}
    for rec in data.get("records", []):
        out[rec["rel"]] = rec
    return out


def cmd_record(args):
    data = load(args.ledger)
    rec = add_record(args, data)
    save(args.ledger, data)
    print(f"[+{rec['verdict']}] {rec['rel']}")
    print(f"    原因: {rec['reason']}")
    print(f"    人/时间: {rec['reviewer']} @ {rec['reviewed_at']}  id={rec['id']}")


def cmd_list(args):
    data = load(args.ledger)
    recs = data.get("records", [])
    if not recs:
        print("账本为空。")
        return
    for rec in recs:
        print(f"{rec['reviewed_at']}  {rec['verdict']:<7} {rec['rel']}"
              f"  (id={rec['id']} 人={rec['reviewer']} 因={rec.get('reason','')})")


def cmd_status(args):
    data = load(args.ledger)
    latest = latest_by_rel(data)
    counts = {"approve": 0, "flag": 0}
    for rec in latest.values():
        counts[rec["verdict"]] = counts.get(rec["verdict"], 0) + 1
    if not latest:
        print("账本为空（尚未登记任何复核）。")
        return
    print(f"当前复核状态（按文档最新一条）: 通过 {counts['approve']} / 标记 {counts['flag']} / 共 {len(latest)}")
    for rel in sorted(latest):
        rec = latest[rel]
        print(f"  {rec['verdict']:<7} {rel}  (人={rec['reviewer']} 因={rec.get('reason','')})")


def cmd_delete(args):
    data = load(args.ledger)
    before = len(data.get("records", []))
    before_latest = len(latest_by_rel(data))
    data["records"] = [r for r in data.get("records", []) if r.get("id") != args.id]
    save(args.ledger, data)
    print(f"删除 id={args.id}: 记录 {before}→{len(data['records'])}, "
          f"当前文档 {before_latest}→{len(latest_by_rel(data))}")


def main():
    global DEFAULT_LEDGER
    parser = argparse.ArgumentParser(description="人工复核账本")
    parser.add_argument("--ledger", default=DEFAULT_LEDGER, help="账本 JSON 路径")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_rec = sub.add_parser("record", help="登记一条复核")
    p_rec.add_argument("--rel", required=True, help="文档相对路径(工作区根下)")
    p_rec.add_argument("--verdict", required=True, choices=["approve", "flag"])
    p_rec.add_argument("--reason", required=True, help="复核理由")
    p_rec.add_argument("--reviewer", default="human", help="复核人")
    p_rec.add_argument("--action", default="", help="建议行动(flag 时常用)")
    p_rec.set_defaults(func=cmd_record)

    p_list = sub.add_parser("list", help="列出全部复核记录")
    p_list.set_defaults(func=cmd_list)

    p_stat = sub.add_parser("status", help="列出每个文档的当前复核状态")
    p_stat.set_defaults(func=cmd_status)

    p_del = sub.add_parser("delete", help="删除一条记录(按 id)")
    p_del.add_argument("id")
    p_del.set_defaults(func=cmd_delete)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
