extends Control
## 主界面（S3）：显示 **token 预览**——把语法层本身画出来。
##
## 为什么现在就有画面：在此之前所有验证都是数值断言，**没人确认过"看起来对不对"**。
## 装配走 [Shell]（与截图工具同一条路径），保证"看到的"就是"跑的"。

func _ready() -> void:
	var result := ThemeIo.load_or_build(false)
	var tokens: TokenSet = result[1]
	var theme: Theme = result[0]
	if theme == null:
		# 失败不静默：把原因写在界面上，否则"主题没生效"会被当成审美问题查很久
		var error_label := Label.new()
		error_label.text = "主题加载失败：\n%s" % "\n".join(tokens.errors)
		add_child(error_label)
		return
	add_child(Shell.build(theme, tokens))
