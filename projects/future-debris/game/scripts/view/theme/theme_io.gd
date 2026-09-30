extends RefCounted
class_name ThemeIo
## 主题的**唯一加载入口**：优先读已生成资源，读不到就现场编译并落盘。
##
## 为什么这样设计：Godot 的 `Theme` 是资源文件，手工在编辑器里改它就会与 token 契约脱钩。
## 因此约定——**主题由 token 编译而来，不由人手工编辑**；
## 资源文件只是缓存（编译产物），随时可删掉重建。

const THEME_PATH := "res://assets/theme/future_debris.tres"

## 返回 [theme, tokens]；theme 可能为 null（此时 tokens.errors 有原因）。
static func load_or_build(force_rebuild: bool = false) -> Array:
	var tokens := TokenSet.load_default()
	if not tokens.errors.is_empty():
		return [null, tokens]
	var theme: Theme = null
	if not force_rebuild and ResourceLoader.exists(THEME_PATH):
		theme = load(THEME_PATH) as Theme
	if theme == null:
		var font := FontFactory.monospace(tokens.families)
		if not FontFactory.is_usable(font):
			tokens.errors.append("字体不可用：%s（本机需装有其中之一）" % str(tokens.families))
			return [null, tokens]
		theme = ThemeBuilder.build(tokens, font)
		var err := ThemeBuilder.save(theme)
		if err != OK:
			tokens.errors.append("主题资源写入失败：%s" % error_string(err))
	return [theme, tokens]
