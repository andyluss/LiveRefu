extends RefCounted
class_name Shell
## 场景壳：**根面板（窗口底色）+ 内边距 + 内容**。
##
## 为什么做成共用件：主界面与截图必须走**完全相同的装配路径**，
## 否则"截图里看到的"与"实际跑的"会是两个东西（这正是刚才背景色不一致的教训之一）。

static func build(theme: Theme, tokens: TokenSet, content: Control = null) -> Control:
	var root := PanelContainer.new()
	root.theme = theme
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	# 用**显式样式覆盖**而不是 theme_type_variation：
	# 实测变体在渲染时未生效（RootBackground 在主题里取值正确、渲染仍走 PanelContainer 默认样式），
	# 而这类"解析不到就静默回落"的行为极难排查。显式覆盖没有解析歧义。
	# 主题里仍注册 RootBackground（供编辑器与未来使用），但渲染路径不依赖它。
	root.add_theme_stylebox_override("panel", StyleBoxes.root_background(tokens))
	for side in ["left", "right", "top", "bottom"]:
		root.add_theme_constant_override("margin_%s" % side, int(tokens.spacing[3]))
	root.add_child(content if content != null else TokenPreview.build(theme, tokens))
	return root
