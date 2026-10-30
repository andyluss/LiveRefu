extends RefCounted
class_name ThemeVerify
## 断言"token 真的落到了 Godot 主题里"。
##
## 为什么必须有它：**"生成了 .tres"并不等于"界面会用对颜色与字号"**。
## 资源可能加载失败、type variation 可能没注册、字号可能在某处被就地覆盖。
## 这些都不会报错，只会让界面"看起来还行但与契约不符"——
## 因此这里把契约里的每个关键值**从主题里读回来逐项比对**。

## 返回 {ok, checks: Array[String], errors: Array[String]}。
static func run(theme: Theme, tokens: TokenSet) -> Dictionary:
	var checks: Array[String] = []
	var errors: Array[String] = []
	_check(errors, checks, theme.default_font != null, "主题有默认字体")
	_check(errors, checks, FontFactory.is_usable(theme.default_font), "默认字体可渲染（中文与数字都有宽度）")
	for token_name in LabelStyles.VARIATIONS:
		var type_name: String = LabelStyles.VARIATIONS[token_name]
		var want_size := tokens.size(token_name)
		var got_size := theme.get_font_size("font_size", type_name)
		_check(errors, checks, got_size == want_size, "%s 字号 %d（主题里 %d）" % [type_name, want_size, got_size])
	var want_text := tokens.color("--text")
	var got_text := theme.get_color("font_color", "Label")
	_check(errors, checks, got_text.is_equal_approx(want_text), "Label 文字色 = --text")
	var normal := theme.get_stylebox("normal", "Button") as StyleBoxFlat
	var hover := theme.get_stylebox("hover", "Button") as StyleBoxFlat
	var disabled := theme.get_stylebox("disabled", "Button") as StyleBoxFlat
	var focus := theme.get_stylebox("focus", "Button") as StyleBoxFlat
	_check(errors, checks, normal != null and normal.bg_color.to_html(false) == tokens.color("--bg-elev-2").to_html(false),
		"按钮常态底色 = --bg-elev-2（对 --bg-base 有可见层级）")
	_check(errors, checks, hover != null and hover.bg_color.to_html(false) == tokens.color("--material-mid").to_html(false),
		"按钮悬停底色 = --material-mid（镀铬中调）")
	_check(errors, checks, normal != null and normal.border_color.is_equal_approx(tokens.color("--line-strong")),
		"按钮边框 = --line-strong（不得用 --line）")
	_check(errors, checks, focus != null and focus.border_color.is_equal_approx(tokens.color("--focus")),
		"焦点环 = --focus")
	# 用**精确**比较而非 is_equal_approx：后者的容差会让"只差一点点的颜色"也算相等，
	# 而"悬停几乎看不出变化"正是这类断言要抓的退化。
	_check(errors, checks, hover != null and hover.bg_color.to_html(false) != normal.bg_color.to_html(false),
		"按钮悬停态与常态可区分（底色不同）")
	_check(errors, checks, disabled != null and disabled.bg_color.to_html(false) != normal.bg_color.to_html(false),
		"按钮禁用态与常态可区分（底色不同）")
	var root := theme.get_stylebox("panel", "RootBackground") as StyleBoxFlat
	_check(errors, checks, root != null and root.bg_color.is_equal_approx(tokens.color("--bg-base")),
		"窗口根背景 = --bg-base")
	return {"ok": errors.is_empty(), "checks": checks, "errors": errors}

static func _check(errors: Array[String], checks: Array[String], passed: bool, label: String) -> void:
	checks.append(("OK   " if passed else "FAIL ") + label)
	if not passed:
		errors.append(label)
