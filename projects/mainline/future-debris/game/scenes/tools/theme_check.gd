extends Node
## 主题落地与验证（`./run.sh theme`，也是 `./run.sh check` 的第 7 道闸门）：
## 编译主题 → 断言 token 真的生效 → 报告结果。**不渲染任何东西**。
##
## 为什么"生成"与"验证"在同一道闸门里：只生成不验证，等于相信编译器；
## 只验证不生成，则验证的可能是一份过期资源。两者必须同时发生。

const EXIT_OK := 0
const EXIT_FAIL := 1

func _ready() -> void:
	var result := ThemeIo.load_or_build(true)
	var tokens: TokenSet = result[1]
	var theme: Theme = result[0]
	if theme == null:
		printerr("主题编译失败：%s" % str(tokens.errors))
		get_tree().quit(EXIT_FAIL)
		return
	var report := ThemeVerify.run(theme, tokens)
	for line in report["checks"]:
		print("  [%s]" % line)
	var stray := _stray_errors(tokens)
	if not stray.is_empty():
		printerr("token 取值有缺：%s" % str(stray))
		get_tree().quit(EXIT_FAIL)
		return
	if not bool(report["ok"]):
		printerr("主题验证失败：%s" % str(report["errors"]))
		get_tree().quit(EXIT_FAIL)
		return
	print("主题资源：%s（%d 项断言全部通过）" % [ThemeIo.THEME_PATH, (report["checks"] as Array).size()])
	print("BOOT OK")
	get_tree().quit(EXIT_OK)

## 取色过程中记录的错误（如缺 token）也算失败——避免"用了洋红兜底色但没人发现"。
func _stray_errors(tokens: TokenSet) -> PackedStringArray:
	return tokens.errors
