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


var _passed := 0
var _failed := 0

func _ready() -> void:
	print("══ 无头验收 · S2 玩法行为 ══")
	for entry in CaseList.ALL:
		var script: GDScript = load(entry[1])
		if script == null:
			_run(entry[0], {"ok": false, "reason": "加载不到用例脚本 %s" % entry[1]})
			continue
		_run(entry[0], script.call(entry[2]))
	if _failed == 0:
		print("无头验收：PASS（%d/%d）" % [_passed, CaseList.ALL.size()])
		print("BOOT OK")
		get_tree().quit(EXIT_OK)
		return
	print("无头验收：FAIL（%d/%d 通过，%d 项失败）" % [_passed, CaseList.ALL.size(), _failed])
	get_tree().quit(EXIT_FAIL)

func _run(label: String, result: Dictionary) -> void:
	if bool(result["ok"]):
		_passed += 1
		print("  [OK  ] %s" % label)
		return
	_failed += 1
	print("  [FAIL] %s → %s" % [label, result["reason"]])
