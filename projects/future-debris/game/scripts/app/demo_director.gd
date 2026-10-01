extends Control
## 演示导演（`./run.sh demo`）：把一局战斗演成**30 秒可录片段**。
##
## 为什么要有它（S4 的出口判据）：到 S3 为止，所有验证都是数字与断言——
## **没有人看过它动起来是什么样**。演示片段是"这游戏到底是什么"的最直接答案，
## 也是 Q6 里"允许 S3 后先发机制动图"的兑现物。
##
## 两条硬约束：
##   1. **时间轴用 delta 累加**，不用墙钟——Movie Maker 模式下引擎以固定帧率"能渲多快渲多快"，
##      只有 delta 累加才能保证"录出来的 30 秒 = 设计的 30 秒"，且每次录制完全一致；
##   2. **每一拍只做一件事**：推进一回合、或换一条字幕。让观众能跟上，也让剪辑点清楚。

const FPS := 30
const DURATION := 30.0
const TURN_EVERY := 1.0        # 每 1 秒推进一个回合
const DECK := "RC-ATOMIC-001,RC-ATOMIC-002,RC-ATOMIC-005,RC-ATOMIC-011,RC-ATOMIC-012,RC-ATOMIC-008,RC-ATOMIC-004,RC-ATOMIC-006"

## 字幕时间轴（start_sec, 文本）。三句话讲清"这是什么"——对应宣发契约要求的"机制瞬间"。
const CAPTIONS := [
	[0.6, "未来残片 · Future Debris"],
	[3.4, "你向一个相信清洁能源的明天提交改造提案"],
	[8.0, "每一次供电都更快——也把一点代价留在图纸上"],
	[13.5, "残渣会扩散成降级区，并持续伤害防线"],
	[19.0, "花电力清理，或者把代价挪到还没建东西的地方"],
	[25.0, "供电 / 残渣 / 降级区：同一个决定的三种后果"],
]

var _battle: Battle
var _driver: BattleDriver
var _stage: DemoStage
var _clock := 0.0
var _last_turn := 0
var _finished := false

func _ready() -> void:
	_stage = DemoStage.new()
	var loaded := ThemeIo.load_or_build(false)
	var tokens: TokenSet = loaded[1]
	var theme: Theme = loaded[0]
	if theme == null:
		return
	add_child(Shell.build(theme, tokens, _stage.build(theme, tokens)))
	_start()

func _start() -> void:
	_clock = 0.0
	_last_turn = 0
	_finished = false
	_stage.caption.text = ""
	var tokens := TokenSet.load_default()
	_battle = Battle.new()
	_battle.level_id = "LV-ATOMIC-01"
	_battle.faction_id = "FAC-ATOMIC-ROA"
	if not _battle.setup(DECK.split(","), 20, 60):
		_stage.caption.text = "初始化失败：%s" % str(_battle.events)
		return
	_driver = BattleDriver.new()
	_driver.bind(_battle, _stage.board, _stage.hud, _stage.hand, _stage.overlay, _stage.popups)
	_stage.popups.setup(tokens, _stage.caption.get_theme_font("font"))
	_stage.board.setup(_battle, tokens, _stage.caption.get_theme_font("font"))
	_stage.hud.setup(_battle, tokens, _stage.caption.get_theme_font("font"))
	_stage.hand.setup(_battle, tokens, _stage.caption.get_theme_font("font"))
	_stage.overlay.setup(_battle, tokens, BattleBoardView.cell(), BattleBoardView.gap())
	_driver.refresh()

## 时间轴驱动：每帧按 delta 累加。**先推回合，再按整秒切字幕**。
##
## 关键改动（实测教训）：原来战斗一结束就停止推进，于是素材只有 7 秒——
## 而片段要 30 秒。现在**战斗结束不停止时间轴**，而是进入"结果卡"状态继续播到最后
## （演示片需要结尾、也需要可预测的时长；由录制脚本按帧数裁剪到恰好 30 秒）。
func _process(delta: float) -> void:
	if _battle == null:
		return
	_clock += delta
	if not _finished:
		_advance_battle()
	_update_caption()
	if _clock >= DURATION:
		_shutdown()

## 按整秒推进回合；战斗结束（通关/被打爆/到演示上限）后转入结果卡。
func _advance_battle() -> void:
	var want_turn := int(_clock / TURN_EVERY)
	while _last_turn < want_turn:
		_last_turn += 1
		# 演示要铺满 8 个塔位：真实对局里玩家会持续抽牌/换牌，这里用"每回合补抽一张"近似。
		# 否则手牌打完就不再出牌，电力会堆到一百多——画面看起来像坏了（实测）。
		_battle.draw_card()
		_driver.advance()
		if _battle.turn >= 24 or not _battle.is_active():
			_enter_result_card()
			return

func _update_caption() -> void:
	if _finished:
		return
	var text := ""
	for entry in CAPTIONS:
		if _clock >= float(entry[0]):
			text = str(entry[1])
	_stage.caption.text = text

## 结果卡：不结束时间轴，只是把字幕切成结算信息（画面停在最终局面，便于观众看清）。
func _enter_result_card() -> void:
	_finished = true
	var summary := CardFlow.summarize(_battle)
	var waves := WaveSystem.wave_count(_battle.wave)
	_stage.caption.text = "第 %d/%d 波　基地 %d/%d　评级 %s　（残渣 %d）" % [
		int(summary["waves_cleared"]) + 1, waves, int(summary["base_hp"]),
		int(summary["base_hp_max"]), str(summary["grade"]), int(summary["residue_total"]),
	]
	print("DEMO result：%d 回合 / 基地 %d / 评级 %s" % [
		int(summary["turns"]), int(summary["base_hp"]), str(summary["grade"])])

## 到时长上限：打印一行供录制脚本核对帧数，然后退出。
func _shutdown() -> void:
	print("DEMO done：%d 帧（%.1f 秒 @ %d fps）" % [
		int(_clock * FPS), _clock, FPS])
	print("BOOT OK")
	get_tree().quit(0)
