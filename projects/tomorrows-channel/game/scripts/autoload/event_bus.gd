class_name EventBus
extends Node
## 全局事件总线（Autoload 单例）。
##
## 职责：解耦逻辑层与 UI/渲染层——UI 通过订阅本总线获取逻辑层状态，逻辑层通过 emit 广播事件。
## 表现与逻辑分层原则见 docs/lead-programmer/01_tech-stack-draft.md §4.3：逻辑层不直接依赖渲染/UI。
##
## 约定：signal 名一律 snake_case；参数避免传大对象，优先传 id / 小字典 / 字面量；
## 信号集随 channel/timer/mixer 系统在 M1 内实现定稿而收敛（当前为骨架）。


## 三态切换：漫游 ↔ 专注。M1 支持可切；设置/图鉴态【待定·M3】仅占位。
signal state_changed(new_state: String)


## 番茄计时：段开始（传入专注秒数，由 meta 分钟换算）。
signal pomodoro_started(duration_sec: int)


## 番茄计时：段结束（reason: "completed" | "aborted"）。
signal pomodoro_finished(reason: String)


## 氛围播放：频道装载完成（channel bundle 抽象，见 01_ §4.2 可插拔 bundle）。
signal channel_loaded(channel_id: String)


## 氛围播放：音景轨起播 / 停止。
signal ambient_track_started(track_id: String)
signal ambient_track_stopped(track_id: String)


## 收藏：点卡收藏（local_id 为本地列表 id）。
signal card_collected(card_id: String, rarity: String)


## 混音台：轨音量变更（volume 0..1 线性，bus 侧预置 dB 曲线）。
signal mixer_volume_changed(track_id: String, volume: float)


func _ready() -> void:
	# 骨架占位：无初始化逻辑。M1 各系统接入时在此注册转发/汇聚。
	pass
