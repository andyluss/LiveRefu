extends Control
class_name BattleBoardView
## 战场视图：画 8 个固定塔位、已放置的卡、以及每格的残渣热力。
## **只读 battle 状态，绝不修改**（分层铁律，见 02 工程结构与运行）。

## 设计尺寸（1280×720 视口下）。实际使用值见 [cell] / [gap]——
## 出素材时通过 [UiScale] 放大，**不改这里的契约数字**。
const CELL := Vector2(132, 104)
const GAP := 12

static func cell() -> Vector2:
	return CELL * UiScale.factor()

static func gap() -> int:
	return UiScale.int_of(GAP)
const DANGER_AT := 8          # 该格残渣达到此值算"危险"（与 PlacePolicy.CLEAN_TARGET 同量级）

var _battle: Battle
var _tokens: TokenSet
var _font: Font                       # **必须用主题字体**，不能用 ThemeDB.fallback_font：
                                      # 那会绕开 token 契约（字体族也是语法层的一部分）

func setup(battle: Battle, tokens: TokenSet, font: Font) -> void:
	_battle = battle
	_tokens = tokens
	_font = font
	custom_minimum_size = Geom.board_size(cell(), gap())
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	queue_redraw()

## 供交互层使用：把控件内坐标转成塔位下标。
func slot_at_local(point: Vector2) -> int:
	return Geom.slot_at(point, cell(), gap())

func _draw() -> void:
	if _battle == null or _tokens == null:
		return
	for slot in Geom.SLOT_COUNT:
		var rect := Geom.slot_rect(slot, cell(), gap())
		var occupied := _battle.board.has(slot)
		draw_rect(rect, BattlePalette.slot_background(_tokens, occupied), true)
		_draw_residue(rect, slot)
		draw_rect(rect, _tokens.color("--line-strong"), false, 1.5)
		if occupied:
			_draw_card(rect, _battle.board[slot] as CardInstance)
		else:
			_draw_empty_hint(rect, slot)

## 残渣热力：以底部横条表示（不覆盖卡面文字，避免遮挡信息）。
func _draw_residue(rect: Rect2, slot: int) -> void:
	var amount := ResidueSystem.at(_battle.residue, slot)
	if amount <= 0:
		return
	var ratio := clampf(float(amount) / float(DANGER_AT), 0.0, 1.0)
	var bar := Rect2(rect.position + Vector2(0, rect.size.y - 6), Vector2(rect.size.x * ratio, 6))
	draw_rect(bar, BattlePalette.residue_heat(_tokens, amount, DANGER_AT), true)

func _draw_card(rect: Rect2, instance: CardInstance) -> void:
	var might := StatQuery.effective_might(instance, _battle.residue, _battle)
	draw_string(_font, rect.position + Vector2(10, 30), instance.data.name,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("body"), _tokens.color("--text"))
	draw_string(_font, rect.position + Vector2(10, 62), "战力 %d" % might,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), _tokens.color("--power"))
	draw_string(_font, rect.position + Vector2(10, 84), "残渣/回合 %d" % instance.data.residue,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), _tokens.color("--residue"))

func _draw_empty_hint(rect: Rect2, slot: int) -> void:
	draw_string(_font, rect.position + Vector2(10, 30), "空塔位 %d" % (slot + 1),
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), _tokens.color("--text-faint"))
