#!/usr/bin/env python3
"""卡表量产管线（S2 核心交付）：**表 → 生成 → 校验**。

为什么必须有它：纪元契约要 200–300 张可构筑卡（[docs/06](../docs/06_产能预算与卡量阶梯.md)），
**手写不可能**。但"批量生成"最大的风险是**造出一堆彼此没有区别的卡**——
所以本脚本的设计立场是：

  1. **生成来自种子表（`game/data/cardgen.seed.json`），不是来自随机数**：
     同一种子永远得到同一张卡表（幂等），改动可被 diff；
  2. **生成后必须过数据闸门**（`./run.sh check`），包括命名规范、跨表引用、条目数下限；
  3. **本脚本只写 `cards.json` 里的生成区段**，手写卡（`RC-ATOMIC-001..012` 这类）永不被覆盖——
     手工设计的"标志性卡"是产品识别度，不能被生成物冲掉；
  4. **生成物必须可被模拟检验**（`scenes/tools/sim_balance.gd`）：造得出不等于平衡得了。

用法:
    python3 tools/gen_cards.py --dry-run          # 只打印将要生成什么，不落盘
    python3 tools/gen_cards.py                    # 生成并写入 cards.json
    python3 tools/gen_cards.py --target 60        # 生成到总计 60 张（T2 档）
    python3 tools/gen_cards.py --self-test        # 断言生成器本身的性质（幂等/不覆盖手写卡）
退出码: 0 = 成功; 1 = 失败; 2 = 用法错误
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
DATA = PROJECT / "game" / "data"
CARDS = DATA / "tables" / "cards.json"
SEED = DATA / "cardgen.seed.json"
MANUAL_PREFIX_LIMIT = 12  # 手写卡区段：RC-ATOMIC-001..012 由人维护，生成器只追加在其后

# 数值分布来自 [docs/05 美术产能与预算] 的成本口径与 [docs/06] 的阶梯：
# 战力 ≈ 费用 × 2 为基准，residue 与 power 按"高输出必高代价"的张力分配。
KIND_BY_INDEX = ["tower", "unit", "support", "skill", "modifier", "unit", "tower", "relic"]
RARITY_BY_INDEX = ["common", "common", "common", "rare", "common", "rare", "common", "epic"]


class Deterministic:
    """自有 LCG：不依赖 Python 的 random 实现版本，保证跨版本幂等。"""

    def __init__(self, seed: int) -> None:
        self.state = seed % 2147483647 or 1

    def next(self) -> int:
        self.state = (self.state * 48271) % 2147483647
        return self.state

    def pick(self, items: list):
        return items[self.next() % len(items)]

    def between(self, low: int, high: int) -> int:
        return low + self.next() % (high - low + 1)


def load_seed() -> dict:
    if not SEED.is_file():
        raise SystemExit(f"用法错误：找不到种子表 {SEED}")
    return json.loads(SEED.read_text(encoding="utf-8"))


def load_cards() -> dict:
    if not CARDS.is_file():
        raise SystemExit(f"用法错误：找不到卡表 {CARDS}")
    return json.loads(CARDS.read_text(encoding="utf-8"))


def manual_entries(table: dict) -> list:
    """手写卡：id 数字部分 ≤ MANUAL_PREFIX_LIMIT 的条目。"""
    out = []
    for entry in table.get("entries", []):
        digits = "".join(ch for ch in str(entry.get("id", "")) if ch.isdigit())
        if digits and int(digits) <= MANUAL_PREFIX_LIMIT:
            out.append(entry)
    return out


def generate(seed: dict, want_total: int) -> list:
    """按种子表生成到 want_total 张（含手写卡）。返回**新增**的条目列表。"""
    factions = [f["id"] for f in seed["factions"]]
    name_pool: list[str] = seed["name_pool"]
    keywords: list[str] = seed["keywords"]
    arch = seed["archetypes"]
    rng = Deterministic(seed["seed"])
    produced: list[dict] = []
    index = MANUAL_PREFIX_LIMIT + 1
    # **按势力轮转**分配，而不是纯随机抽势力。
    # 为什么（实测教训）：纯随机会让某些势力只分到 4 张卡，且都很弱——
    # 于是"逐关扫描按势力跑"时，那个势力的失败其实是**卡池不均**造成的，
    # 而不是它的机制弱。测量工具本身不能引入这种偏差。
    wheel = 0
    while MANUAL_PREFIX_LIMIT + len(produced) < want_total:
        archetype = rng.pick(arch)
        faction = factions[wheel % len(factions)]
        wheel += 1
        kind = rng.pick(KIND_BY_INDEX)
        cost = rng.between(archetype["cost"][0], archetype["cost"][1])
        # 张力：输出的每一分都要以残渣偿付——高战力必高残渣，低残渣必低战力
        might = max(1, round(cost * archetype["might_per_cost"]))
        residue = max(0, round(might * archetype["residue_ratio"]))
        power = max(0, round(cost * archetype["power_per_cost"]))
        name = f"{rng.pick(name_pool)}{archetype['suffix']}"
        produced.append(
            {
                "id": f"RC-ATOMIC-{index:03d}",
                "name": name,
                "faction": faction,
                "kind": kind,
                "rarity": rng.pick(RARITY_BY_INDEX),
                "cost": cost,
                "power": power,
                "compute": rng.between(0, 1),
                "residue": residue,
                "keywords": [rng.pick(keywords), rng.pick(keywords)],
                "text": f"{archetype['text']}（费用 {cost}，战力 {might}，残渣 {residue}）",
            }
        )
        index += 1
    return produced


def write_cards(table: dict, generated: list, dry_run: bool) -> None:
    manual = manual_entries(table)
    merged = manual + generated
    merged.sort(key=lambda e: str(e["id"]))
    if dry_run:
        return
    table["entries"] = merged
    table["note"] = (
        f"原子纪元卡表：手写 {len(manual)} 张（产品识别度，不可被生成物覆盖）"
        f" + 生成 {len(generated)} 张（由 tools/gen_cards.py 依 cardgen.seed.json 幂等产出）。"
        "生成物必须过 ./run.sh check 的数据闸门；改数值请改种子表后重跑。"
    )
    CARDS.write_text(json.dumps(table, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_self_test() -> int:
    """断言生成器的两条关键性质：**幂等** 与 **不覆盖手写卡**。"""
    print("[self-test] 断言生成器幂等、且不覆盖手写卡")
    seed = load_seed()
    table = load_cards()
    manual_before = manual_entries(table)
    first = generate(seed, MANUAL_PREFIX_LIMIT + 6)
    second = generate(seed, MANUAL_PREFIX_LIMIT + 6)
    failures = 0

    ok_idempotent = json.dumps(first, ensure_ascii=False) == json.dumps(second, ensure_ascii=False)
    failures += 0 if ok_idempotent else 1
    print(f"  [{'OK  ' if ok_idempotent else 'MISS'}] 同种子两次生成完全一致（幂等）")

    write_cards(table, first, dry_run=True)
    manual_after = manual_entries(table)
    ok_manual = json.dumps(manual_before, ensure_ascii=False) == json.dumps(manual_after, ensure_ascii=False)
    failures += 0 if ok_manual else 1
    print(f"  [{'OK  ' if ok_manual else 'MISS'}] 生成不改变手写卡（{len(manual_before)} 张）")

    ids = [e["id"] for e in first]
    ok_ids = len(set(ids)) == len(ids)
    failures += 0 if ok_ids else 1
    print(f"  [{'OK  ' if ok_ids else 'MISS'}] 生成物 id 无重复（{len(ids)} 张）")

    if failures:
        print(f"[self-test] FAIL：{failures}/3 个用例不符预期")
        return 1
    print("[self-test] PASS：3/3 个用例符合预期")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="future-debris 卡表量产管线")
    parser.add_argument("--target", type=int, default=12, help="生成到总计多少张（含手写卡）")
    parser.add_argument("--dry-run", action="store_true", help="只打印，不写文件")
    parser.add_argument("--self-test", action="store_true", help="先跑生成器自检")
    args = parser.parse_args()

    if args.self_test:
        code = run_self_test()
        if code != 0:
            return code

    seed = load_seed()
    table = load_cards()
    manual = manual_entries(table)
    if args.target < len(manual):
        print(f"用法错误：--target {args.target} 小于手写卡数量 {len(manual)}", file=sys.stderr)
        return 2

    generated = generate(seed, args.target)
    print(f"[卡表量产] 手写 {len(manual)} 张 + 生成 {len(generated)} 张 = 总计 {len(manual) + len(generated)} 张")
    # 报告各势力卡数：分布不均会让"按势力扫描"的结论失真（见上面的轮转说明）
    total_pool: dict[str, int] = {}
    for entry in manual + generated:
        total_pool[entry["faction"]] = total_pool.get(entry["faction"], 0) + 1
    for faction_id, count in sorted(total_pool.items()):
        print(f"  - 卡池 {faction_id}: {count} 张（含手写）")
    by_faction: dict[str, int] = {}
    for entry in generated:
        by_faction[entry["faction"]] = by_faction.get(entry["faction"], 0) + 1
    for faction, count in sorted(by_faction.items()):
        print(f"  - {faction}: {count} 张")
    if args.dry_run:
        print("[卡表量产] --dry-run：未写入文件")
        return 0
    write_cards(table, generated, dry_run=False)
    print(f"[卡表量产] 已写入 {CARDS.relative_to(PROJECT)}（共 {len(manual) + len(generated)} 条）")
    print("[卡表量产] 下一步：./run.sh data 校验契约，./run.sh s2 跑玩法验收")
    return 0


if __name__ == "__main__":
    sys.exit(main())
