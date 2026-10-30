extends Control
class_name BattleHud
## 战斗读数：电力、残渣、降级区、波次进度、基地生命、生效规则。
## **只读 battle 状态**；所有文字用主题（字号与颜色来自 token）。
##
## 为什么把这些放在一个条里而不是散在界面各处：玩家每一回合都要同时看这几个数
## 来判断"能不能出牌、要不要清理"。视线来回找数是可读性最大的敌人。

const BAR_HEIGHT := 8

var _battle: Battle
var _tokens: TokenSet
var _font: Font

func setup(battle: Battle, tokens: TokenSet, font: Font) -> void:
	_battle = battle
	_tokens = tokens
	_font = font
	custom_minimum_size = Vector2(0, 132)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	queue_redraw()

func refresh() -> void:
	queue_redraw()

func _draw() -> void:
	if _battle == null or _tokens == null or _font == null:
		return
	var y := 24.0
	y = _row(y, "电力 %d" % ResourceSystem.power(_battle.resources), "--power")
	y = _row(y, "残渣 %d（降级区 %d）" % [
		ResidueSystem.total(_battle.residue), ResidueSystem.zone(_battle.residue)], "--residue")
	y = _row(y, "目标 %s　势力 %s" % [
		WinCondition.label(_battle.win_condition), _battle.faction_id.replace("FAC-ATOMIC-", "")], "--accent")
	y = _row(y, "第 %d 波 / 共 %d 波　剩余 %d / %d" % [
		WaveSystem.index(_battle.wave) + 1, WaveSystem.wave_count(_battle.wave),
		WaveSystem.remaining(_battle.wave), WaveSystem.quota(_battle.wave)], "--text")
	_draw_base_bar(y)
	_draw_rules(y + 26)

## 基地生命：用一条横条 + 数字。**颜色分级**（正常/警示/危险）让"快输了"一眼可见。
func _draw_base_bar(y: float) -> void:
	var hp := int(_battle.resources["base_hp"])
	var max_hp := int(_battle.resources["base_hp_max"])
	var ratio := ResourceSystem.hp_ratio(_battle.resources)
	var color := _tokens.color("--ok")
	if ratio <= 0.35:
		color = _tokens.color("--accent")
	elif ratio <= 0.7:
		color = _tokens.color("--warn")
	var track := Rect2(Vector2(0, y), Vector2(360, BAR_HEIGHT))
	draw_rect(track, _tokens.color("--surface-sunken"), true)
	draw_rect(Rect2(track.position, Vector2(track.size.x * ratio, BAR_HEIGHT)), color, true)
	draw_rect(track, _tokens.color("--line-strong"), false, 1.5)
	draw_string(_font, Vector2(374, y + BAR_HEIGHT), "基地 %d / %d" % [hp, max_hp],
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), _tokens.color("--text-dim"))

## 生效规则：让玩家知道"这一关的规矩是什么"（规则卡是纪元差异的载体，必须可见）。
func _draw_rules(y: float) -> void:
	var names := PackedStringArray()
	for rule in _battle.rules:
		names.append(rule.name)
	var text := "生效规则：" + ("、".join(names) if names.size() > 0 else "（无）")
	draw_string(_font, Vector2(0, y), text, HORIZONTAL_ALIGNMENT_LEFT, -1,
		_tokens.size("caption"), _tokens.color("--text-faint"))

func _row(y: float, text: String, color_token: String) -> float:
	draw_string(_font, Vector2(0, y), text, HORIZONTAL_ALIGNMENT_LEFT, -1,
		_tokens.size("body"), _tokens.color(color_token))
	return y + 24.0
