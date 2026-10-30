extends RefCounted
class_name LabelStyles
## 文字层级的类型变体（Label type variations）。
##
## 为什么用 type variation 而不是"每个 Label 手动设字号"：
## **字号是语法层的一部分**——它必须只有 5 级且不可就地改写。
## 用变体把层级变成"有名字的东西"，代码里只写 `theme_type_variation = &"Caption"`，
## 于是"某处偷偷写了个 14px"这种侵蚀在评审时看得见。

## token 名 → Godot 类型变体名（Godot 的 type 名不能带 `-`，故作映射）
const VARIATIONS := {
	"title-1": "Title1",
	"title-2": "Title2",
	"body": "Body",
	"caption": "Caption",
	"number-lg": "NumberLg",
}

## 把 5 级文字全部注册进主题（含基线 Label 的默认样式）。
static func register_all(theme: Theme, tokens: TokenSet, font: Font) -> void:
	var base := LabelStyles.new()
	base._apply(theme, "Label", tokens, font, "body", tokens.color("--text"))
	for token_name in VARIATIONS:
		base._apply(
			theme, VARIATIONS[token_name], tokens, font, token_name,
			tokens.color("--text" if token_name != "caption" else "--text-dim")
		)

func _apply(theme: Theme, type_name: String, tokens: TokenSet, font: Font, level: String, color: Color) -> void:
	theme.add_type(type_name)
	theme.set_font("font", type_name, font)
	theme.set_font_size("font_size", type_name, tokens.size(level))
	theme.set_color("font_color", type_name, color)
