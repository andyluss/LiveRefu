shader_type canvas_item;
render_mode blend_add;
// 磁带频道 · 微噪（luma/grain noise · 细粒）
//
// 职责：在「动效层」做一次全屏细粒噪点。采用"tileable 噪点叠加（低采样率 shader 噪点）"，
//       不做屏幕纹理重采样 —— 成本极低（README「性能预算」：0.05–0.1 ms），Compatibility 兼容。
//       渲染模式用 blend_add（additive）：只"点亮"微颗粒，不做二次重采样。
//
// 用法：把一个铺满屏幕的 ColorRect 挂在 `FxLayer`（CanvasLayer），挂本 ShaderMaterial。
//       加法纹理叠加。噪声按 grain（px）网格采样 floor 后 hash，形成 1px 细粒。
//
// 动效可关：noise_animated=false（冻结为静态噪点，静态回退）或节点 visible=false（静默可用）。
//
// 参数：初值对齐主美术磁带基线 v0.1 §5.2：强度 0.03–0.06、粒度≈1px。

/// 噪点强度（0.03–0.06；0 = 关）。
uniform float noise_strength : hint_range(0.0, 0.3, 0.005) = 0.045;
/// 噪点粒度（px，≈1px 细粒）。
uniform float noise_grain : hint_range(0.5, 8.0, 0.5) = 1.0;
/// 噪点亮度偏离（-1..1 区间极值，越大约明亮/暗；细粒默认低幅）。
uniform float noise_amp : hint_range(0.0, 2.0, 0.1) = 1.0;
/// true=逐帧滚动（动效）；false=冻结为静态噪点（静态回退 / 静默可用）。
uniform bool noise_animated = true;
/// 滚动时间缩放。
uniform float noise_time_scale : hint_range(0.0, 8.0, 0.1) = 1.0;

// ---- 可选：tileable 噪点纹理（接入美术纹理时用，否则程序化，见下）----
uniform bool noise_use_tex = false;
uniform sampler2D noise_tex : repeat_enable, filter_linear;
uniform float noise_tex_scale : hint_range(0.25, 8.0, 0.05) = 1.0;

// 简单且无依赖的整型 hash（0..1）。
float _hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void fragment() {
	// 噪点基元尺寸（px）。
	vec2 cell = SCREEN_PIXEL_SIZE * noise_grain;
	// 把 UV over 视口像素 → 网格坐标。
	vec2 uv = UV / cell;
	if (noise_animated) {
		uv.y += TIME * noise_time_scale * 60.0;   // 滚动噪声
		uv.x += TIME * noise_time_scale * 4.0;    // 极轻的水平漂移，去"固定噪"感
	}

	float n = 0.0;
	if (noise_use_tex) {
		n = texture(noise_tex, uv * noise_tex_scale).r;
	} else {
		n = _hash(floor(uv));
	}
	// 标准 luma 噪：以 0.5 为中心偏离到 [-1,1]，乘强度与幅值。
	float v = (n * 2.0 - 1.0) * noise_amp * noise_strength;
	// additive 叠加：把微小亮度变化加到基底（微噪只扰动不糊化）。
	COLOR = vec4(vec3(v), 1.0);
}
