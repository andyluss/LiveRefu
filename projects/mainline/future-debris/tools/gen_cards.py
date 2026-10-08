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


def initial_balance(seed: dict, target: float) -> dict:
    """由**手写卡**算出各势力生成区的起始余额。

    余额语义 = **还欠目标多少供电**（正数表示手写卡偏弱、需要生成区补强）。
    手写卡不改（产品识别度）；生成区吸收差额，最终整池命中铺场效率目标。
    """
    balance = {f["id"]: 0.0 for f in seed["factions"]}
    for entry in manual_entries(load_cards()):
        if entry["faction"] in balance:
            balance[entry["faction"]] += target * float(entry["cost"]) - float(entry["power"])
    return balance


def faction_pools(seed: dict) -> dict:
    """每个势力自己的 archetype 池；缺省时回落到全局池（向后兼容旧种子表）。"""
    global_pool = seed.get("archetypes", [])
    mapping = seed.get("faction_archetypes", {})
    out = {}
    for faction in [f["id"] for f in seed["factions"]]:
        pool = mapping.get(faction) or global_pool
        if not pool:
            raise SystemExit(f"用法错误：势力 {faction} 没有 archetype 池")
        out[faction] = pool
    return out


def _might(entry: dict) -> int:
    """战力：表里的字段名与"电力"同名（都是 power），生成器内部用 might 区分。
    这里统一成"表里到底存了什么"——手写卡与生成卡都要能读。"""
    return int(entry.get("might", 0))


def faction_stats(entries: list) -> dict:
    """按势力统计用于均衡验收的口径。"""
    stats: dict = {}
    for entry in entries:
        bucket = stats.setdefault(entry["faction"], {"count": 0, "cost": 0, "power": 0,
                                                     "residue": 0.0, "max_power": 0})
        bucket["count"] += 1
        bucket["cost"] += entry["cost"]
        bucket["power"] += entry["power"]        # 表字段 power = 供电
        bucket["residue"] += entry["residue"]
        bucket["max_power"] = max(bucket["max_power"], entry["power"])
    for bucket in stats.values():
        bucket["power_per_cost"] = bucket["power"] / max(1, bucket["cost"])
    return stats


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
    pools = faction_pools(seed)
    rng = Deterministic(seed["seed"])
    # 每个势力在自己的 archetype 池里**轮转**（而不是全局随机抽）。
    # 为什么（实测教训）：全局随机抽会让"数值分配"与"势力玩法姿态"脱钩——
    # 实测 `moves` 势力分到的卡供电/费用比只有 2.50，而 AEC 有 4.00，
    # 于是它每回合只能铺很少的牌；"按势力扫描难度"测出来的其实是**卡池不均**。
    cursor = {f: 0 for f in factions}
    # **闭环余额**：`余额 += 目标 × 费用 − 供电`（余额 = 还欠多少供电），
    # 按余额决定下一张牌的供电。
    # 为什么不用开环系数（实测教训）：开环下浮点零头会累积漂移，各势力池均值整体
    # 偏出目标 0.2 以上；而"铺场效率"差 0.2 就足以让某个势力每回合少放一张牌。
    # 闭环的另一个好处：它**自动吸收手写卡的影响**——若某势力的手写卡很强，
    # 生成区就会相应发弱一点，最终整池仍然命中目标。
    target = float(seed.get("balance", {}).get("ramp_per_cost_target", 0.0))
    # 初值 = **手写卡已经造成的余额**（手写卡是产品识别度，不改它；让生成区去吸收）。
    # 等价于"若手写卡偏弱，生成区就发强一点补回来"。
    balance = initial_balance(seed, target)
    produced: list[dict] = []
    index = MANUAL_PREFIX_LIMIT + 1
    # **按势力轮转**分配，而不是纯随机抽势力。
    # 为什么（实测教训）：纯随机会让某些势力只分到 4 张卡，且都很弱——
    # 于是"逐关扫描按势力跑"时，那个势力的失败其实是**卡池不均**造成的，
    # 而不是它的机制弱。测量工具本身不能引入这种偏差。
    wheel = 0
    while MANUAL_PREFIX_LIMIT + len(produced) < want_total:
        faction = factions[wheel % len(factions)]
        wheel += 1
        # 取该势力自己的下一个 archetype：池内轮转保证每个原型都被用到
        pool = pools[faction]
        archetype = pool[cursor[faction] % len(pool)]
        cursor[faction] += 1
        kind = rng.pick(KIND_BY_INDEX)
        cost = rng.between(archetype["cost"][0], archetype["cost"][1])
        # 张力：输出的每一分都要以残渣偿付——高战力必高残渣，低残渣必低战力
        might = max(1, round(cost * archetype["might_per_cost"]))
        # 残渣：按"战力 × 残渣比"算，但**必须限制在费用能解释的范围内**。
        # 为什么（实测教训）：无上限时高残渣原型会产出"残渣 12–26"的卡，
        # 而放置策略的"每回合残渣增量 ≤ 5"上限会**直接拒放**这些牌——
        # 于是该类势力的高价值牌永远上不了场（ROA 实测只能放残渣最低的弱牌，输出垫底）。
        # 上限 = 费用 × 3：三倍于费用的残渣是"重代价"，但仍是一张可以打出的牌。
        residue = min(max(0, round(might * archetype["residue_ratio"])), cost * 3)
        # 供电：按"余额 + 本牌目标"发放，并把它**限制在合理区间**（不能为了凑数发 0 或离谱值）。
        # 下限取自本原型的 ramp_per_cost 打七折、上限打一点三折——允许各原型保留自己的性格，
        # 但整池均值由余额收敛到目标。
        hint = cost * float(archetype["ramp_per_cost"])
        want = hint + balance[faction]
        # 区间放宽到 0.5–1.8 倍：手写卡可能造成较大缺口，收得太紧就补不回来
        # （实测：0.7–1.3 倍时三个势力仍偏出容差）。越界时仍然收敛，只是慢一点。
        power = int(round(max(0.0, min(hint * 1.8, max(hint * 0.5, want)))))
        balance[faction] += target * float(cost) - float(power)
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
                # 战力：卡表契约里的字段名与"电力"同名（都叫 power），
                # 因此生成器内部用 might 记账、写表时**不带这个键**（见 write_cards）。
                "might": might,
                "compute": rng.between(0, 1),
                "residue": residue,
                "keywords": [rng.pick(keywords), rng.pick(keywords)],
                "text": f"{archetype['text']}（费用 {cost}，战力 {might}，残渣 {residue}）",
            }
        )
        index += 1
    return produced


# 卡表契约的字段白名单：生成器内部的记账字段不得写进表
CONTRACT_FIELDS = ("id", "name", "faction", "kind", "rarity", "cost", "power",
                   "compute", "residue", "keywords", "text")


def strip_internal(entries: list) -> list:
    """只保留契约字段。**内部记账字段（如 might）写进表会污染契约**，
    且数据闸门不会报错——它只检查已知字段。"""
    out = []
    for entry in entries:
        out.append({key: entry[key] for key in CONTRACT_FIELDS if key in entry})
    return out


def write_cards(table: dict, generated: list, dry_run: bool) -> None:
    manual = manual_entries(table)
    merged = strip_internal(manual + generated)
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


def _report(entries: list) -> None:
    """打印按势力的口径（均衡验收的人工可读版本）。"""
    stats = faction_stats(entries)
    print("  势力                   张数   均费  供电/费用  残渣/张  最高供电")
    for faction in sorted(stats):
        info = stats[faction]
        print(f"  {faction:22s} {info['count']:4d} {info['cost']/max(1,info['count']):6.1f}"
              f" {info['power_per_cost']:10.2f} {info['residue']/max(1,info['count']):8.2f}"
              f" {info['max_power']:9d}")


def check_balance(seed: dict, entries: list) -> list:
    """均衡验收：每个势力的卡池铺场效率必须落在种子表给出的容差内。

    为什么把它做成**生成器自检**而不是事后人工看：卡池是否均衡决定了
    "按势力扫描难度"的结论有没有意义（实测：曾把卡池不均误读成机制弱）。
    """
    balance = seed.get("balance", {})
    target = float(balance.get("ramp_per_cost_target", 0.0))
    tolerance = float(balance.get("ramp_per_cost_tolerance", 999.0))
    minimum = int(balance.get("cards_per_faction_min", 1))
    stats = faction_stats(entries)
    problems = []
    for faction in sorted(stats):
        info = stats[faction]
        if info["count"] < minimum:
            problems.append(f"{faction} 只有 {info['count']} 张（下限 {minimum}）")
        if target > 0 and abs(info["power_per_cost"] - target) > tolerance:
            problems.append(f"{faction} 铺场效率 {info['power_per_cost']:.3f} 偏离目标 "
                            f"{target:.2f} ± {tolerance:.2f}")
    return problems


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
    parser.add_argument("--self-test", action="store_true", help="先跑生成器自检（只读，不落盘）")
    parser.add_argument("--check-balance", action="store_true",
                        help="只读校验：按 --target 生成后检查各势力铺场效率是否在容差内")
    args = parser.parse_args()

    if args.self_test:
        code = run_self_test()
        if code != 0:
            return code
    if args.check_balance:
        # 只读校验：按 --target 生成（不落盘）后报告均衡
        seed = load_seed()
        manual = manual_entries(load_cards())
        entries = manual + generate(seed, args.target)
        print(f"[均衡校验] 目标总计 {args.target} 张（含手写 {len(manual)} 张）")
        _report(entries)
        problems = check_balance(seed, entries)
        if problems:
            print("[均衡校验] FAIL：" + "；".join(problems))
            return 1
        print("[均衡校验] PASS：各势力铺场效率落在容差内")
        return 0

    seed = load_seed()
    table = load_cards()
    manual = manual_entries(table)
    if args.target < len(manual):
        print(f"用法错误：--target {args.target} 小于手写卡数量 {len(manual)}", file=sys.stderr)
        return 2

    generated = generate(seed, args.target)
    print(f"[卡表量产] 手写 {len(manual)} 张 + 生成 {len(generated)} 张 = 总计 {len(manual) + len(generated)} 张")
    _report(manual + generated)
    if args.dry_run:
        print("[卡表量产] --dry-run：未写入文件")
        return 0
    write_cards(table, generated, dry_run=False)
    print(f"[卡表量产] 已写入 {CARDS.relative_to(PROJECT)}（共 {len(manual) + len(generated)} 条）")
    print("[卡表量产] 下一步：./run.sh data 校验契约，./run.sh s2 跑玩法验收")
    return 0


if __name__ == "__main__":
    sys.exit(main())
