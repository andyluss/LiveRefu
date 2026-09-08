shader_type canvas_item;
// 磁带频道 · 中央窗口遮罩（signal 层裁剪区 · 圆角矩形）
//
// 职责：定义"中央窗口"这一裁剪区（主美术基线 §三：圆角矩形、64%×58% 居中略偏上、16px 圆角），
//       用于隔离：(a) 信号层频道色（LUT 只作用在窗口内）与 (b) 容器层暖光（只在窗口周围框住）。
//       这就是双层光 Way A 分层合成（docs/graphics-programmer-a/04_response-gdd.md §八.2）的"区域/分层隔离"。
//
// 用法：
//   1. 区域遮罩（推荐）：把本 ShaderMaterial 挂到一块铺满屏幕的 ColorRect，reject_outside=false，
//      输出 0..1 的 alpha 遮罩（窗口内=1、窗外=0、圆角柔边），作为窗口区域的标准定义 / 供组合使用。
//   2. 硬裁剪：对"单个 CanvasItem"内容（非多子节点）可置 reject_outside=true（discard 窗外），
//      此时本遮罩即窗口"可视形状"；对"多子节点"内容的结构性裁剪，由场景用 clip_contents(矩形)
//      或 SubViewport + 本遮罩整合（README「5.4 整合说明」），本 shader 负责圆角区域 + 柔边定义。
//
// 参数：初值对齐主美术基线 §三（64%×58% 居中略偏上、16px 圆角）。

// ---- 窗口几何（归一化 0..1，相对本可画项/叠加矩形）----
/// 窗口矩形（归一化）：x, y = 左上角；z, w = 宽、高。
uniform vec4 window_rect_uv = vec4(0.18, 0.10, 0.64, 0.58);
/// 圆角半径（px @1080p，随分辨率缩放）。
uniform float corner_radius_px : hint_range(0.0, 64.0, 1.0) = 16.0;
/// 圆角柔边（px，0=锐角）。
uniform float edge_softness : hint_range(0.0, 32.0, 0.5) = 2.0;
/// true=discard 窗外片段（硬裁剪）；false=输出解 alpha 遮罩（0..1）。
uniform bool reject_outside = true;
/// 遮罩色（用于遮罩通行/诊断；默认白）。
uniform vec4 mask_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);

// 圆角矩形 SDF（p 为相对中心的像素坐标；half 为半宽高；r 圆角半径）。
float _sd_rounded_rect(vec2 p, vec2 half, float r) {
	vec2 q = abs(p) - half + vec2(r, r);
	return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

void fragment() {
	// 把归一化窗口几何换算到视口像素坐标（叠加铺满视口时 UV 与 SCREEN_PIXEL_SIZE 同参考系）。
	vec2 px = UV / SCREEN_PIXEL_SIZE;                      // 当前片段像素坐标
	vec2 win_origin = window_rect_uv.xy / SCREEN_PIXEL_SIZE; // 窗口左上角（px）
	vec2 win_size = window_rect_uv.zw / SCREEN_PIXEL_SIZE;   // 窗口尺寸（px）
	vec2 half = win_size * 0.5;
	vec2 center = win_origin + half;

	// 圆角矩形 SDF（<0 = 窗口内）。
	float d = _sd_rounded_rect(px - center, half, corner_radius_px);
	// 0..1 遮罩：窗口内=1，窗外=0，边=柔边（edge_softness 越大过渡越缓）。
	float a = 1.0 - smoothstep(-edge_softness, edge_softness, d);

	if (reject_outside && a < 0.5) {
		discard;
	}

	COLOR = vec4(mask_color.rgb, mask_color.a * a);
}
