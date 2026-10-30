extends RefCounted
class_name SimReport
## SimReport —— 无头验收的结果收集与输出（PASS/FAIL 计数 + 分节打印）。

var passed := 0
var failed := 0
var lines: Array[String] = []


func section(title: String) -> void:
	lines.append("")
	lines.append("── %s" % title)


func check(name: String, ok: bool, detail: String = "") -> void:
	var suffix := ("（%s）" % detail) if detail != "" else ""
	if ok:
		passed += 1
		lines.append("  ✅ %s%s" % [name, suffix])
	else:
		failed += 1
		lines.append("  ❌ %s%s" % [name, suffix])


## 打印全部结果；返回进程退出码（0 = 全过）。
func finish(extra: Array[String] = []) -> int:
	for l in lines:
		print(l)
	for l in extra:
		print(l)
	print("")
	print("═══ 无头验收：%s（通过 %d / 失败 %d）═══"
		% ["PASS" if failed == 0 else "FAIL", passed, failed])
	return 0 if failed == 0 else 1
