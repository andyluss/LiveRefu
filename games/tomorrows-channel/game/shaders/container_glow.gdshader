shader_type canvas_item;
render_mode blend_add, unshaded;
// 磁带频道 · 容器层暖光（2D 假辉光 · 径向渐变 / 薄雾）
//
// 职责：给"容器层（接收机框架）"皮肤做一次小范围暖光（设备自身 2400K 琥珀 + 外台灯 2800K 暖钨丝）。
//       这是 2D 假辉光（径向渐变 + additive），**不是**真 bloom / HDR —— Compatibility 原生、低负载
//       （README「性能预算」：0.1–0.3 ms，属基底；不接触信号层像素，避免污染频道色）。
//
// 用法：把一个铺满"容器层"区域的 ColorRect（或叠加 sprite）挂在 `ContainerLayer`，挂本 ShaderMaterial。
//       只在容器层（框架区）绘制，不覆盖中央窗口（窗口由 window_mask 界定，信号层内容不接触本层）。
//
// 暖光的"存在"（常亮）= 基底，不可关；"动态"（呼吸/辉光振幅）= 动效，可关（由 channel_fx.gd 用
//       glow_intensity 动画驱动；呼吸关掉时 glow_intensity 停在常量基底值，仍保留"一盏亮着的灯"）。
//
// 参数：初值对齐主美术基线 §二/§四（设备 2400K / 台灯 2800K、6:4 配比、辉光半径 ≈220px @1080p）。

// ---- 光源颜色（sRGB 暖值，近似 2400K / 2800K）----
/// 设备自身暖光（琥珀）· ≈2400K。
uniform vec3 device_color : source_color = vec3(1.0, 0.62, 0.35);
/// 外部"灯下"台灯（暖钨丝暖白）· ≈2800K。
uniform vec3 lamp_color : source_color = vec3(1.0, 0.78, 0.56);

// ---- 配比 / 形态 ----
/// 设备自身 : 外部台灯 强度比（6:4 = device 0.6 / lamp 0.4）。
uniform float glow_ratio : hint_range(0.0, 1.0, 0.05) = 0.6;
/// 暖光辉光径向衰减半径（px @1080p，alpha→0）。
uniform float glow_radius_px : hint_range(16.0, 800.0, 4.0) = 220.0;
/// 辉光中心（归一化 0..1，容器层内位置）。
uniform vec2 glow_center = vec2(0.5, 0.5);
/// 外部台灯方位（单位向量；左上倾斜照明，与"灯下"母意象一致）。
uniform vec2 lamp_dir = vec2(-0.7071, -0.7071);
/// 台灯偏移占半径比（0..1）。
uniform float lamp_offset_ratio : hint_range(0.0, 1.0, 0.05) = 0.35;

// ---- 强度 / 动效 ----
/// 整体辉光强度（0=灭灯，不提供；呼吸动画驱动；呼吸关=停在此基底值）。
uniform float glow_intensity : hint_range(0.0, 4.0, 0.05) = 1.0;
/// 台灯强度。
uniform float lamp_intensity : hint_range(0.0, 4.0, 0.05) = 1.0;
/// 辉光柔度（指数；越大边缘越陡；≈2 为柔和薄雾）。
uniform float glow_falloff : hint_range(0.5, 8.0, 0.1) = 2.0;

// 柔和径向衰减（d 为归一化距离 0..1）
float _falloff(float d) {
	return pow(clamp(1.0 - d, 0.0, 1.0), glow_falloff);
}

void fragment() {
	// 当前片段像素坐标（叠加层铺满时 UV 与 SCREEN_PIXEL_SIZE 同参考系）。
	vec2 px = UV / SCREEN_PIXEL_SIZE;
	vec2 center = glow_center / SCREEN_PIXEL_SIZE;

	// 设备自身暖光：以中心为原点做径向柔光。
	float dist = length(px - center);
	float device = _falloff(dist / glow_radius_px) * glow_ratio;
	vec3 device_glow = device_color * device;

	// 外部台灯：从 lamp_dir 方向偏移一个中心后叠加一层弱暖（非对称，形成"灯下"偏斜感）。
	vec2 lamp_center = center + normalize(lamp_dir) * (glow_radius_px * lamp_offset_ratio);
	float lamp_dist = length(px - lamp_center);
	float lamp = _falloff(lamp_dist / (glow_radius_px * 1.4)) * (1.0 - glow_ratio) * lamp_intensity;
	vec3 lamp_glow = lamp_color * lamp;

	// 合成暖光（设备 + 台灯）→ additive 叠加到容器层皮肤。
	vec3 glow = (device_glow + lamp_glow) * glow_intensity;
	COLOR = vec4(glow, 1.0);
}
