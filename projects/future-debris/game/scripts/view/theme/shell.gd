extends RefCounted
class_name Shell
## 场景壳：**根面板（窗口底色）+ 内边距 + 内容**。
##
## 为什么做成共用件：主界面与截图必须走**完全相同的装配路径**，
## 否则"截图里看到的"与"实际跑的"会是两个东西（这正是刚才背景色不一致的教训之一）。

## 最近一次淡入（供截图/录像工具等待"最终画面"）。
static var last_tween: Tween

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
	# 开局淡入：时长取自 token（dur-slow），避免"啪地出现"——这是玩家对界面的第一印象。
	# 用 modulate 而不是 position：淡入不会引起布局重排，也不会让截图工具截到半透明的成品。
	root.modulate.a = 0.0
	var tween := root.create_tween()
	tween.tween_property(root, "modulate:a", 1.0, Motion.seconds(tokens, "dur-slow")) \
		.set_trans(Motion.transition(tokens, "ease-standard")) \
		.set_ease(Motion.ease_type(tokens, "ease-standard"))
	# 把 tween 记下来：**截图与录像需要"最终画面"**，不能截在半透明状态。
	# （实测：差点因此把"底色不符"当成主题 bug；真因是截图时 alpha 只有 0.3，
	#   像素与背后默认灰混色成了 #202429。）
	last_tween = tween
	return root
