extends RefCounted
class_name BattleLayout
## 用途 ｜ 竖屏 720×1280 的界面分区常量：BattleScreen 与各面板共用同一套坐标。
##        HUD 100 / 战场 600 / 波次预告 70 / 手牌 350 / 底栏 160（doc 04 / 07）。
## 依赖 ｜ 无（纯常量；RefCounted 只为给其它脚本提供引用命名空间）。

const W := 720.0
const H := 1280.0
const TICK_HZ := 30.0          # 战斗固定步长 30Hz（doc 04）
const HUD_H := 100.0
const FIELD_TOP := 100.0
const FIELD_H := 600.0
const STRIP_TOP := 700.0
const STRIP_H := 70.0
const HAND_TOP := 770.0
const HAND_H := 350.0
