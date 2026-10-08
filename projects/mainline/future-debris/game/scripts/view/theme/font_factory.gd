extends RefCounted
class_name FontFactory
## 按 token 契约里的字族列表构造字体（Godot SystemFont：**不在仓库放字体二进制**）。
##
## 为什么用系统字体（沿用既有项目经验）：等宽技术字体是"档案感"的核心，
## 但把 .ttf 提交进仓库既有授权问题、也让仓库体积不可控。
## 代价是**目标机器上可能没有这些字体**——因此 `theme_verify` 会断言"字体真的取到了"，
## 而不是让界面悄悄退化成衬线字。

## 构造首选字体：按 families 顺序取第一个可用的等宽字体。
static func monospace(families: PackedStringArray) -> SystemFont:
	var font := SystemFont.new()
	var names := PackedStringArray()
	for family in families:
		if family != "monospace":   # Godot 的通用族名不是系统字体名，跳过
			names.append(family)
	font.font_names = names
	font.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	font.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
	return font

## 该字体是否真的可用（用于把"字体缺失"变成会失败的断言，而不是空白或方块）。
static func is_usable(font: Font, probe: String = "Future Debris 未来残片 0123") -> bool:
	if font == null:
		return false
	return font.get_string_size(probe, HORIZONTAL_ALIGNMENT_LEFT, -1, 24).x > 0.0
