class_name ChannelFX
extends Node
## 磁带频道 · 2D 后处理栈控制器（M1 · 图形程序员 A）
##
## 构建并控制"信号层 / 容器层 / 动效层"三 CanvasLayer 上的双层光 + 扫描线 + 微噪栈：
##   - 信号层容器（base）：中央窗口遮罩 window_mask（隔离信号层频道色 ⇄ 容器暖光）。
##   - 容器层（base 常亮）：容器暖光 2D 假辉光 container_glow（设备 2400K + 台灯 2800K，Way A 分层）。
##   - 动效层（可关）：扫描线 scanline + 微噪 noise（各自节点可见性可关）。
## 对齐"静默可用"：动效（扫描线/微噪/暖光呼吸）可关；基底（LUT/容器暖光常亮/窗口遮罩）保留。
## 性能预算：动效全开 ≈0.6–1.3 ms、动效全关 ≈0.2–0.5 ms（docs/graphics-programmer-a/05_m1-render-slice.md §三）。
##
## 整合（由主程序/装载器在场景中挂本节点）：
##   - 本节点自建各 CanvasLayer 与铺满视口的 ColorRect 叠加层（未预埋时）；
##   - 信号层内容的裁剪：把 window_mask_material 应用到"信号内容"的可画项（或由 shell 让
##     窗口用 clip_contents + 本遮罩整合）；详见 game/README.md「遮罩/裁剪」。

# ---- shader 路径（res:// 根 = game/）----
const SHADER_SCANLINE: String = "res://shaders/scanline.gdshader"
const SHADER_NOISE: String = "res://shaders/noise.gdshader"
const SHADER_WINDOW_MASK: String = "res://shaders/window_mask.gdshader"
const SHADER_CONTAINER_GLOW: String = "res://shaders/container_glow.gdshader"

# ---------------------------------------------------------------------------
# 频道皮肤 Token（可选）。注入后按 token 驱动容器暖光/扫描线参数（代码零硬编码）。
# 未注入时用 shader 内默认值（对齐主美术基线初值），保骨架可预览。
# ---------------------------------------------------------------------------
@export var skin: ChannelSkin

# ---- 各 effect 开关（默认开 = M1 目标态"动效全开"；可关 = 静默可用）----
@export_group("Effect 开关")
@export var scanline_enabled: bool = true
@export var noise_enabled: bool = true
@export var glow_breathing_enabled: bool = true
## 全局"减少动态/关闭动效"：关掉后隐藏扫描线/微噪叠加层并停暖光呼吸，但保留基底（暖光常亮 + 遮罩）。
@export var motion_enabled: bool = true

# ---- 参数初值（对齐主美术基线 §二/§三；待收敛进 data/fx_preset.json / skin token）----
@export_group("参数初值（待收敛 fx_preset.json）")
## 暖光辉光径向半径（px @1080p）。
@export var glow_radius_px: float = 220.0
## 窗口几何（归一化）：x,y 左上、z,w 宽高（64%×58% 居中略偏上）。
@export var window_rect_uv: Vector4 = Vector4(0.18, 0.10, 0.64, 0.58)
## 窗口圆角（px @1080p）。
@export var window_corner_radius_px: float = 16.0
## 扫描线缓移速度（px/s，动效开时）。
@export var scanline_speed: float = 30.0
## 暖光呼吸频率（Hz，0.5–2）。
@export var glow_breath_hz: float = 0.5
## 暖光呼吸振幅（相对基底强度）。
@export var glow_breath_amp: float = 0.08

# ---- 运行时引用（自建或注入）----
## 暴露给信号层内容做裁剪的窗口遮罩材质。
var window_mask_material: ShaderMaterial

## 信号层容器（base）：shell/装载器把"信号层内容"节点挂到这里（或用 window_mask_material 裁剪），
## 本栈提供它的 CanvasLayer + 窗口遮罩材质。
var signal_layer: CanvasLayer
var _container_layer: CanvasLayer
var _fx_layer: CanvasLayer
var _scanline_overlay: ColorRect
var _noise_overlay: ColorRect
var _glow_overlay: ColorRect
var _glow_material: ShaderMaterial
var _glow_base_intensity: float = 1.0


func _ready() -> void:
	_load_shaders()
	_build_stack()
	_apply_skin_params()
	_refresh_visibility()


func _process(_delta: float) -> void:
	# 暖光呼吸（动效，可关）：motion + breathing 均开时按正弦调制 glow_intensity，
	# 否则停在基底值（暖光"存在"属基底，不因"关动效"而灭灯）。
	if _glow_material == null:
		return
	if motion_enabled and glow_breathing_enabled:
		var t := Time.get_ticks_msec() / 1000.0
		var wobble := 1.0 + glow_breath_amp * sin(t * TAU * glow_breath_hz)
		_glow_material.set_shader_parameter("glow_intensity", _glow_base_intensity * wobble)
	else:
		_glow_material.set_shader_parameter("glow_intensity", _glow_base_intensity)


# ---------------------------------------------------------------------------
# 构建
# ---------------------------------------------------------------------------
func _load_shaders() -> void:
	window_mask_material = ShaderMaterial.new()
	window_mask_material.shader = load(SHADER_WINDOW_MASK)
	# 窗口几何（归一化）随分辨率换算由 shader 内部完成；仅注入 + 圆角。
	window_mask_material.set_shader_parameter("window_rect_uv", window_rect_uv)
	window_mask_material.set_shader_parameter("corner_radius_px", window_corner_radius_px)


## 自建三 CanvasLayer + 铺满视口的叠加层；若外部已预埋同名层/节点则复用。
func _build_stack() -> void:
	# 信号层（base）：layer=-10，通道内容载体；窗口遮罩材质可供裁剪。
	signal_layer = _ensure_canvas_layer("SignalLayer", -10)

	# 容器层（base·常亮暖光）：layer=0，机身皮肤 + 暖光 2D 假辉光。
	_container_layer = _ensure_canvas_layer("ContainerLayer", 0)
	_glow_overlay = _make_fullscreen_overlay(_container_layer, "ContainerGlow",
			ShaderMaterial.new(), true)
	_glow_material = _glow_overlay.material as ShaderMaterial
	_glow_material.shader = load(SHADER_CONTAINER_GLOW)

	# 动效层（可关）：layer=10，盖在窗口内容上。
	_fx_layer = _ensure_canvas_layer("FxLayer", 10)
	var scan_mat := ShaderMaterial.new()
	scan_mat.shader = load(SHADER_SCANLINE)
	scan_mat.set_shader_parameter("scanline_speed", scanline_speed)
	_scanline_overlay = _make_fullscreen_overlay(_fx_layer, "ScanlineOverlay", scan_mat, false)

	var noise_mat := ShaderMaterial.new()
	noise_mat.shader = load(SHADER_NOISE)
	_noise_overlay = _make_fullscreen_overlay(_fx_layer, "NoiseOverlay", noise_mat, false)


func _ensure_canvas_layer(layer_name: String, layer_index: int) -> CanvasLayer:
	var existing := get_node_or_null(layer_name)
	if existing is CanvasLayer:
		return existing
	var cl := CanvasLayer.new()
	cl.name = layer_name
	cl.layer = layer_index
	add_child(cl)
	return cl


func _make_fullscreen_overlay(layer: CanvasLayer, overlay_name: String,
		material: ShaderMaterial, warm_base: bool) -> ColorRect:
	var cr := ColorRect.new()
	cr.name = overlay_name
	cr.set_anchors_preset(Control.PRESET_FULL_RECT)
	cr.color = Color(1, 1, 1, 1)
	cr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cr.material = material
	layer.add_child(cr)
	# 基底（容器暖光）默认常亮可见；动效（扫描线/微噪）默认由 _refresh_visibility 控制。
	cr.visible = warm_base
	return cr


# ---------------------------------------------------------------------------
# 皮肤 token → shader 参数（数据驱动，禁止硬编码）
# ---------------------------------------------------------------------------
func _apply_skin_params() -> void:
	if skin == null or _glow_material == null:
		return
	# 暖光色温（K）→ 近似 sRGB（设备 2400K / 台灯 2800K）。
	_glow_material.set_shader_parameter("device_color", _kelvin_to_rgb(skin.device_warm_k))
	_glow_material.set_shader_parameter("lamp_color", _kelvin_to_rgb(skin.lamp_warm_k))
	_glow_material.set_shader_parameter("glow_ratio", skin.glow_ratio.x)
	_glow_material.set_shader_parameter("glow_radius_px", glow_radius_px)
	_glow_base_intensity = 1.0  # 暖光"存在"基底强度（不灭灯）

	# 扫描线强度以 skin 的 decor 上限为准。
	if _scanline_overlay and _scanline_overlay.material is ShaderMaterial:
		var m := _scanline_overlay.material as ShaderMaterial
		m.set_shader_parameter("scanline_strength", skin.scanline_opacity)
		m.set_shader_parameter("scanline_speed", scanline_speed)


# sRGB 暖色温 → RGB 的经典近似（Tanner Helland / Neil Bartlett，lg 为自然对数）。
static func _kelvin_to_rgb(kelvin: float) -> Vector3:
	var t := clamp(kelvin, 1000.0, 40000.0) / 100.0
	var r: float
	var g: float
	var b: float
	if t <= 66.0:
		r = 1.0
		g = clamp(0.39008157 * log(t) - 0.63184144, 0.0, 1.0)
	else:
		r = clamp(1.29293618 * pow(t - 60.0, -0.1332047592), 0.0, 1.0)
		g = clamp(1.12989086 * pow(t - 60.0, -0.0755148492), 0.0, 1.0)
	if t >= 66.0:
		b = 1.0
	elif t <= 19.0:
		b = 0.0
	else:
		b = clamp(0.54320678 * log(t - 10.0) - 1.19625408, 0.0, 1.0)
	return Vector3(r, g, b)


# ---------------------------------------------------------------------------
# 开关（静默可用）：动效可关、基底保留
# ---------------------------------------------------------------------------
func set_motion_enabled(enabled: bool) -> void:
	motion_enabled = enabled
	_refresh_visibility()


func set_scanline_enabled(enabled: bool) -> void:
	scanline_enabled = enabled
	_refresh_visibility()


func set_noise_enabled(enabled: bool) -> void:
	noise_enabled = enabled
	_refresh_visibility()


func set_glow_breathing_enabled(enabled: bool) -> void:
	glow_breathing_enabled = enabled


## 依据 motion_enabled 与各 effect 开关刷新动效层可见性；基底（暖光常亮/遮罩）不动。
func _refresh_visibility() -> void:
	var dyn := motion_enabled
	if _scanline_overlay:
		_scanline_overlay.visible = dyn and scanline_enabled
	if _noise_overlay:
		_noise_overlay.visible = dyn and noise_enabled
	# 容器暖光（基底）始终常亮；仅其呼吸在 _process 中由动效开关调节。
	if _glow_overlay:
		_glow_overlay.visible = true
