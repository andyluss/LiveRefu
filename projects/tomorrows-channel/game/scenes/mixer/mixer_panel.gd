class_name MixerPanel
extends Control
## 混音台面板（M1 最小集）—— ≥2 轨音量滑杆，数据驱动。
##
## 原则（docs/ui-artist-a/05_m1-ui-skeleton.md §2.1 表 5）：实时生效、数据驱动
##（字段对应数值策划 A 的 mixer_track 表，见 04_ §四/§五）。
## 滑杆从数据（Array[MixerTrack] 或 mixer_track.json）生成，代码零硬编码轨；
## 换肤 = 从 Token 取色（滑块/滑轨强调色随频道），不改滑杆结构。

# 音量变化信号（供逻辑层订阅；UI 层只广播，不直接操作逻辑层）
signal volume_changed(track_id: String, value: float)

# 频道皮肤 Token（换肤载体）
@export var skin: ChannelSkin

# 数据源：M1 用导出数组占位，运行期可由父级注入或从 data/tables/mixer_track.json 加载。
# 权威源 ../data/tables/（mixer_track 表尚未建，标【待定】）。
@export var tracks: Array[MixerTrack] = []

# 滑杆列表容器（生成行挂这里）
@onready var _track_list: VBoxContainer = %TrackList
@onready var _title: Label = %Title


func _ready() -> void:
	_apply_skin()
	# 数据驱动：滑杆行 = f(tracks)。tracks 为空时用占位（见 _ensure_tracks）。
	_ensure_tracks()
	_build_tracks()


## 数据兜底：M1 尚无 mixer_track 表，先用占位示例保证面板可看/可拖。
## 接入 `data/tables/mixer_track.json` 后删除此分支（@pending：数值策划 A）。
func _ensure_tracks() -> void:
	if tracks.is_empty():
		var hum := MixerTrack.new()
		hum.id = "kitchen_hum"
		hum.display_name = "厨房嗡鸣"
		hum.default_volume = 0.6
		hum.bus = "Ambience"
		var tape := MixerTrack.new()
		tape.id = "tape_noise"
		tape.display_name = "磁带底噪"
		tape.default_volume = 0.4
		tape.bus = "Ambience"
		tracks = [hum, tape]


## 从数据生成滑杆行（数据驱动核心）：每轨 = 标签 + HSlider。
func _build_tracks() -> void:
	for child in _track_list.get_children():
		child.queue_free()
	for track in tracks:
		_add_track_row(track)


func _add_track_row(track: MixerTrack) -> void:
	var row := HBoxContainer.new()
	var label := Label.new()
	label.text = track.display_name
	label.custom_minimum_size.x = 120.0
	label.add_theme_font_size_override("font_size", 14)  # 说明级（05_ §7.2）
	var slider := HSlider.new()
	slider.min_value = 0.0
	slider.max_value = 1.0
	slider.step = 0.01
	slider.value = track.default_volume
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# 数据驱动：每轨 id 绑定其音量。UI 是源（用户拖滑杆），广播到 event_bus，
	# 逻辑层（mixer_controller）订阅后写 bus——UI 层不直接操作逻辑层。
	var track_id := track.id
	slider.value_changed.connect(func(value: float) -> void:
		volume_changed.emit(track_id, value)
		event_bus.mixer_volume_changed.emit(track_id, value)
	)
	row.add_child(label)
	row.add_child(slider)
	_track_list.add_child(row)


## 换肤：滑杆强调色 / 文案色从 Token 取（随频道变），滑块结构不动。
func _apply_skin() -> void:
	if skin == null:
		return
	if _title:
		_title.add_theme_color_override("font_color", skin.lut_phosphor_amber)
