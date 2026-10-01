extends RefCounted
class_name CaptureSync
## 截图/录像前的**同步**：等布局、等淡入、等帧缓冲落地。
##
## 为什么单独成件：这三件事都不是"截图"本身，而是"什么时候可以取像素"。
## 它们各自踩过一次坑（少等一帧截到未布局；不等淡入截到半透明，看起来像主题坏了；
## 不等 frame_post_draw 回读到尚未合成的帧），因此值得有自己的注释与位置。

## 截图前的同步：等布局、等淡入、等帧缓冲落地。
##
## 三件事各有各的理由（都踩过）：少等一帧会截到未布局的画面；
## 不等淡入会截到半透明（表现为"底色不符"，其实画面没问题）；
## 不等 `frame_post_draw` 则可能回读到尚未合成的帧（实测读到清屏色）。
static func settle() -> void:
	await Engine.get_main_loop().process_frame
	await Engine.get_main_loop().process_frame
	if Shell.last_tween != null and Shell.last_tween.is_valid():
		await Shell.last_tween.finished
	await RenderingServer.frame_post_draw
	await Engine.get_main_loop().process_frame
	await Engine.get_main_loop().process_frame

