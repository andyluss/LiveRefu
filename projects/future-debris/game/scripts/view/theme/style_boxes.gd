extends RefCounted
class_name StyleBoxes
## 三种盒子样式，全部由 token 取值：**面板** / **控件** / **焦点**。
##
## 为什么把"焦点"单独做成一种盒子：焦点指示是**可用性基础设施**，不该复用语义色
## （用 `--accent` 会与"单一焦点强调色"的规则打架，用 `--power` 会被误读为电力状态）。

## 窗口根背景：**无边框、无圆角、纯 --bg-base**（工程里唯一的全屏底色来源）。
static func root_background(tokens: TokenSet) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = tokens.color("--bg-base")
	return box

## kind: "panel" | "control" | "focus"
static func panel(tokens: TokenSet, kind: String, background: Color = Color.TRANSPARENT) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	if kind == "focus":
		# 焦点：只画描边、不填背景，且 2px + 1px 偏移（契约 §五）
		box.draw_center = false
		box.border_color = tokens.color("--focus")
		box.set_border_width_all(int(tokens.stroke.get("focus", 2.0)))
		box.set_corner_radius_all(int(tokens.radius.get("control", 4)))
		box.set_expand_margin_all(float(tokens.stroke.get("focusOffset", 1.0)))
		return box
	var is_panel := kind == "panel"
	# 注意：这里必须用**传入的 background**，而不是重新算一个兜底色。
	# 踩过的坑：三元判断用了参数、取值却用了默认值，结果常态与悬停态拿到同一个色，
	# 而"三态可区分"断言把它抓了出来（否则只有截图时靠肉眼觉得"悬停好像没反应"）。
	box.bg_color = background if background != Color.TRANSPARENT else tokens.color("--bg-elev-1" if is_panel else "--bg-elev-2")
	box.set_corner_radius_all(int(tokens.radius.get("panel" if is_panel else "control", 8)))
	box.border_color = tokens.color("--line")
	box.set_border_width_all(int(tokens.stroke.get("control", 1.5)))
	if not is_panel:
		# 交互控件的边框必须用 --line-strong（WCAG 1.4.11；--line 只用于装饰分隔线）
		box.border_color = tokens.color("--line-strong")
		if kind == "control-hover":
			# 悬停：底色抬升 + 描边加粗到 2px。
			# 为什么不能只靠底色：--bg-elev-1 与 --bg-elev-2 的亮度差只有 0.011，肉眼几乎看不出
			# （由三态可区分断言 + 截图验收共同发现）。
			box.set_border_width_all(2)
	box.content_margin_left = float(tokens.spacing[2])
	box.content_margin_right = float(tokens.spacing[2])
	box.content_margin_top = float(tokens.spacing[1])
	box.content_margin_bottom = float(tokens.spacing[1])
	return box
