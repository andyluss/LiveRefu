extends RefCounted
class_name TokenPreview
## 验证场景的内容装配：**把 token 本身画成界面**。
##
## 为什么要有这个场景：断言能证明"值取对了"，但证明不了"**看起来对**"——
## 层级是否分明、语义色是否会互相打架、按钮三态是否看得出区别，必须用眼睛确认。
## 因此它是 S4 表现层的第一个真实窗口，也是人工验收的固定靶子。

static func build(theme: Theme, tokens: TokenSet) -> Control:
	var root := VBoxContainer.new()
	root.theme = theme
	root.add_theme_constant_override("separation", int(tokens.spacing[2]))
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(_section(theme, tokens, "标题层级（5 级，各自示例文字不同才能看出层级）"))
	for token_name in LabelStyles.VARIATIONS:
		var sample := "%s · %s" % [token_name, _sample_text(token_name)]
		root.add_child(_label(theme, tokens, LabelStyles.VARIATIONS[token_name], sample))
	root.add_child(_section(theme, tokens, "语义色（游戏语言）"))
	for name in ["--power", "--residue", "--accent", "--focus", "--warn", "--ok"]:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", int(tokens.spacing[1]))
		var chip := ColorRect.new()
		chip.custom_minimum_size = Vector2(48, 24)
		chip.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN   # 不拉伸，否则色块被拉成一整条
		chip.color = tokens.color(name)
		chip.tooltip_text = name
		row.add_child(chip)
		row.add_child(_tokens_label(theme, tokens, name, "--text"))
		root.add_child(row)
	root.add_child(_section(theme, tokens, "控件三态"))
	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", int(tokens.spacing[2]))
	buttons.add_child(_button(theme, "默认"))
	buttons.add_child(_button(theme, "焦点需 Tab 切换"))
	var disabled := _button(theme, "禁用")
	disabled.disabled = true
	buttons.add_child(disabled)
	root.add_child(buttons)
	return root

## 每级用不同长度的示例文字：**同一串文字看不出层级差别**（截图验收时发现的）
static func _sample_text(token_name: String) -> String:
	match token_name:
		"title-1": return "供电网络"
		"title-2": return "冷却塔下的抗议"
		"body": return "部署后为相邻塔位提供 1 点电力。"
		"caption": return "残渣 +1 / 回合"
		_: return "128"
	return ""

static func _label(theme: Theme, tokens: TokenSet, variation: String, text: String) -> Label:
	var label := Label.new()
	label.theme = theme
	label.theme_type_variation = StringName(variation)
	label.text = text
	return label

static func _tokens_label(theme: Theme, tokens: TokenSet, token_name: String, color_token: String) -> Label:
	var label := _label(theme, tokens, "Caption", "%s  %s" % [token_name, tokens.colors[token_name].to_html(false)])
	label.add_theme_color_override("font_color", tokens.color(color_token))
	return label

static func _section(theme: Theme, tokens: TokenSet, text: String) -> Label:
	var label := _label(theme, tokens, "Title2", text)
	label.add_theme_color_override("font_color", tokens.color("--text-dim"))
	return label

static func _button(theme: Theme, text: String) -> Button:
	var button := Button.new()
	button.theme = theme
	button.text = text
	return button
