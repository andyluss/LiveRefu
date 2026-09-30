extends Node
## 无头验收 runner（`./run.sh s2`，也是 `./run.sh check` 的第 6 道闸门）：
## 不渲染任何东西，只断言**玩法行为**。用例本体在 `scenes/tools/cases/`，本文件只负责编排与汇总。
##
## 与 S1 的 boot_probe 的分工：boot_probe 只证明"工程能装载"；这里证明"**规则真的按设计生效**"。
## 任何一条失败即退出码 1，并打印完整摘要（便于在 CI 日志里读出发生了什么）。

const EXIT_OK := 0
const EXIT_FAIL := 1

## 用例表：**[标签, 脚本路径, 静态方法名]**。
## 为什么用脚本路径而不是类名（踩过一次）：`ClassDB.instantiate("XxxCases")` 依赖全局类注册，
## 在无头模式下注册表可能尚未刷新，会得到 "Cannot get class" 的**假失败**——
## 用 `load(path)` 直接取脚本则没有任何隐式依赖，且路径写错会立刻暴露。
const CASES := [
	["A 数据表装载与跨表引用", "res://scenes/tools/cases/data_cases.gd", "catalog_ok"],
	["B 供电增长与支付边界", "res://scenes/tools/cases/resource_cases.gd", "power_growth"],
	["B2 支付边界（刚好/不足/负数）", "res://scenes/tools/cases/resource_cases.gd", "spend_bounds"],
	["C 出牌原子性（费用/塔位/残渣）", "res://scenes/tools/cases/card_cases.gd", "play_atomic"],
	["C2 出牌失败必须完全回退", "res://scenes/tools/cases/card_cases.gd", "play_rollback"],
	["D 卖塔不洗白污染", "res://scenes/tools/cases/card_cases.gd", "sell_keeps_residue"],
	["E 残渣 → 降级区推导", "res://scenes/tools/cases/residue_cases.gd", "zone_derivation"],
	["E2 场地维护：供电即排污", "res://scenes/tools/cases/residue_cases.gd", "upkeep_emits"],
	["E3 花电力清理残渣（解除手段）", "res://scenes/tools/cases/clean_cases.gd", "clean_removes"],
	["F 同格残渣削弱战力", "res://scenes/tools/cases/residue_cases.gd", "residue_penalty"],
	["G 波次结算：清空 vs 漏怪", "res://scenes/tools/cases/wave_cases.gd", "wave_outcomes"],
	["G2 超额输出不结转", "res://scenes/tools/cases/wave_cases.gd", "overflow_not_banked"],
	["H 完整一局可复跑且确定性", "res://scenes/tools/cases/run_cases.gd", "determinism"],
	["H2 一局必须终止且不超回合上限", "res://scenes/tools/cases/run_cases.gd", "run_terminates"],
	["I 评级只由事实推导", "res://scenes/tools/cases/rating_cases.gd", "rating_facts_only"],
	["I2 评级单调性（残渣多不得更高）", "res://scenes/tools/cases/rating_cases.gd", "rating_monotonic"],
]

var _passed := 0
var _failed := 0

func _ready() -> void:
	print("══ 无头验收 · S2 玩法行为 ══")
	for entry in CASES:
		var script: GDScript = load(entry[1])
		if script == null:
			_run(entry[0], {"ok": false, "reason": "加载不到用例脚本 %s" % entry[1]})
			continue
		_run(entry[0], script.call(entry[2]))
	if _failed == 0:
		print("无头验收：PASS（%d/%d）" % [_passed, CASES.size()])
		print("BOOT OK")
		get_tree().quit(EXIT_OK)
		return
	print("无头验收：FAIL（%d/%d 通过，%d 项失败）" % [_passed, CASES.size(), _failed])
	get_tree().quit(EXIT_FAIL)

func _run(label: String, result: Dictionary) -> void:
	if bool(result["ok"]):
		_passed += 1
		print("  [OK  ] %s" % label)
		return
	_failed += 1
	print("  [FAIL] %s → %s" % [label, result["reason"]])
