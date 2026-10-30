shader_type canvas_item;
// 磁带频道 · 扫描线动效（tileable 纹理叠加法 / 程序化降级）
//
// 职责：在「动效层」做一次全屏扫描线叠加。采用"纹理叠加法"（ColorRect + ShaderMaterial），
//       不做屏幕纹理（SCREEN_TEXTURE）重采样 —— 成本最低（README「性能预算」：<0.1 ms），
//       Compatibility(OpenGL/WebGL) 渲染器原生兼容。
//
// 用法：把一个铺满屏幕的 ColorRect 挂在 `FxLayer`（CanvasLayer），挂本 ShaderMaterial。
//       假设 ColorRect 铺满视口，故 UV 与 SCREEN_PIXEL_SIZE（视口分辨率倒数）同参考系。
//
// 动效可关：scanline_speed=0（静止，静态回退）或直接把节点 visible 置 false（静默可用）。
//
// 参数：初值对齐主美术磁带基线 v0.1（docs/lead-artist/05_m1-tape-baseline.md）§5.2：
//      扫描线周期≈3px @1080p、暗线≈1.2px、强度 0.06–0.10。

// ---- 扫描线基础参数（px 为屏幕像素，适用于叠加层铺满视口的假设）----
/// 扫描线周期（一次栅格的高度，px）。
uniform float scanline_spacing_px : hint_range(0.5, 8.0, 0.1) = 3.0;
/// 暗线宽度（px）。
uniform float scanline_line_px : hint_range(0.1, 4.0, 0.05) = 1.2;
/// 扫描线强度 = 暗线不透明度（0.06–0.10；0 = 关）。
uniform float scanline_strength : hint_range(0.0, 0.5, 0.01) = 0.08;
/// 缓移速度（px/s；0 = 静止，静态回退）。动效层，可关。
uniform float scanline_speed : hint_range(0.0, 120.0, 1.0) = 30.0;
/// 暗线颜色（暖黑，近似乘在基底上）。默认对齐 win 底暖黑。
uniform vec4 scanline_color : source_color = vec4(0.02, 0.015, 0.01, 1.0);

// ---- 可选：tileable 扫描线纹理（接入美术纹理时用，否则程序化，见下）----
/// true=采样 scanline_tex；false=程序化生成（无需美术纹理即可成立）。
uniform bool scanline_use_tex = false;
/// tileable 扫描线纹理（repeat）。未接美术纹理时由程序化生成兜底。
uniform sampler2D scanline_tex : repeat_enable, filter_linear;
/// 平铺倍率。
uniform float scanline_tex_scale : hint_range(0.25, 8.0, 0.05) = 1.0;

void fragment() {
	// 当前片段在视口内的 y 像素坐标（叠加层铺满视口时 UV 与 SCREEN_PIXEL_SIZE 同参考系）。
	float px_y = UV.y / SCREEN_PIXEL_SIZE.y;
	// 缓移偏移（滚动）；scanline_speed=0 时静止（静态回退）。
	float scroll = scanline_speed * TIME;

	// tab: 0..1，1=暗线中心，0=行间空隙。line 值决定暗线不透明度占比。
	float line = 0.0;
	if (scanline_use_tex) {
		// 采样 tileable 扫描线纹理：按 UV 平铺 + 缓移（只取 R 通道为强度）。
		vec2 uv = vec2(UV.x * scanline_tex_scale,
				(UV.y + scroll * SCREEN_PIXEL_SIZE.y) * scanline_tex_scale);
		line = texture(scanline_tex, uv).r;
	} else {
		// 程序化扫描线：以 spacing 为周期，line_px 为暗线宽度，软边过渡。
		float cell = mod(px_y + scroll, scanline_spacing_px);
		line = 1.0 - smoothstep(0.0, scanline_line_px, cell);
	}

	// 合成：暗线以 scanline_strength 做不透明度叠加（近似乘在基底上，不重采样）。
	COLOR = vec4(scanline_color.rgb, scanline_strength * line);
}
