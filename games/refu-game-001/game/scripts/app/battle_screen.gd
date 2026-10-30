extends Control
## BattleScreen —— 一局的主界面：HUD + 战场 + 手牌 + 波次预告 + 底栏 + 弹窗。
##
## 分层约定（对应 doc 04 / 07）：
##   * 逻辑：core/battle.gd（纯逻辑，固定步长）
##   * 画面：view/battle_view.gd（只画）
##   * 本文件：只做**组装与转发** —— 创建 app/battle/ 下的各面板、把 tick 交给 BattleClock、
##     把输入与弹窗请求分发出去。任何一块界面的细节都在它自己的文件里。
## 竖屏 720×1280：HUD 100 / 战场 600 / 波次预告 70 / 手牌 350 / 底栏 160（见 BattleLayout）。
##
## 对外契约（tools/demo_director.gd 与 tools/screenshot.gd 会调用/读取）：
##   battle、_modal、_paused、_close_modal()、_refresh_all()、_show_card_detail(card_id)
## 各面板通过本文件的字段共享交互状态（host 故意不加类型，避免与组件互相 class_name 依赖）。

var battle: Battle = null
var view: BattleView = null

# --- 交互状态（各组件通过 host 引用共享） ---
var _modal: Control = null
var _paused: bool = false
var _result_shown: bool = false
var _drag_card_id: String = ""
var _targeting_card_id: String = ""
var _selected_tower_uid: int = 0
var _last_log_index: int = 0

# --- 组件 ---
var _hud: BattleHudPanel
var _strip: BattleStripPanel
var _hand: BattleHandPanel
var _bottom: BattleBottomBar
var _field: BattleFieldLayer
var _clock: BattleClock
var _modals: BattleModalLayer
var _placement: BattlePlacementUi
var _input_router: BattleInputRouter
var _card_modal: BattleCardModal
var _tower_modal: BattleTowerModal
var _draw_modals: BattleDrawModals
var _result_modal: BattleResultModal


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_start_battle()
	_build_ui()
	_refresh_all()


func _start_battle() -> void:
	battle = Battle.new(AppState.level_id, AppState.challenge_ids, AppState.deck_ids, AppState.seed_value)
	battle.start()


# ==================================================================== 装配

func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.color = UiKit.BG_DEEP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	_hud = BattleHudPanel.create(self)
	_input_router = BattleInputRouter.create(self)
	_field = BattleFieldLayer.new()
	view = _field.setup(self, battle, _input_router.on_field_input)
	_strip = BattleStripPanel.create(self)
	_hand = BattleHandPanel.create(self)
	_bottom = BattleBottomBar.create(self)
	_clock = BattleClock.create(self)
	_modals = BattleModalLayer.create(self)
	_placement = BattlePlacementUi.create(self)
	_card_modal = BattleCardModal.create(self)
	_tower_modal = BattleTowerModal.create(self)
	_draw_modals = BattleDrawModals.create(self)
	_result_modal = BattleResultModal.create(self)


# ==================================================================== 主循环与刷新

func _process(delta: float) -> void:
	_clock.tick(delta)


func _refresh_all() -> void:
	_hud.refresh(AppState.speed_multiplier)
	_strip.refresh()
	_hand.refresh()
	_bottom.refresh()
	view.selected_tower_uid = _selected_tower_uid


func _skip_build() -> void:
	if battle.phase == Battle.PHASE_BUILD or battle.phase == Battle.PHASE_BREATH:
		battle.phase_t = 9999.0


func _toggle_speed() -> void:
	AppState.speed_multiplier = 1.0 if AppState.speed_multiplier >= 2.0 else 2.0


func _toggle_pause() -> void:
	_paused = not _paused


# ==================================================================== 输入与弹窗转发

func _input(event: InputEvent) -> void:
	_input_router.on_input(event)


func _close_modal() -> void:
	_modals.close()


## 卡牌详情：长按/点击读完整卡面（doc 07：长按读完整卡面）。
func _show_card_detail(cid: String) -> void:
	_card_modal.open(cid)


func _show_tower_detail(tw: TowerUnit) -> void:
	_tower_modal.open(tw)


func _show_draw_modal() -> void:
	_draw_modals.open_draw()


func _show_tag_choice(cid: String, tower_uid: int) -> void:
	_draw_modals.open_tag_choice(cid, tower_uid)


func _show_result() -> void:
	_result_modal.open()
