# 湾居 · Slow Cabin（game03）

> design03 的 3D 沉浸专注/放松 Demo。独立 Web 工程，使用 Three.js + WebAudio + localStorage；无后端、无账号。
>
> 不是塔防、不是生存；没有失败、没有战斗。

## 运行

```bash
cd games/livebay
./run.sh game03
# 打开 http://127.0.0.1:8033/
```

静态服务器是必需的：ES module 不能稳定通过 `file://` 加载。

调试/截图可直接进入房间：

```text
http://127.0.0.1:8033/?skipwelcome=1
```

## 玩法

1. 三层大宅：WASD 自由走动，楼梯连接 1F/2F/3F；
2. 选场景（夜航 / 雨港 / 晨光）与唱片（夜航 / 雨室 / 深空 / 晨光）；
3. 写一句今晚的意图（可留空）；
4. 选 1 / 15 / 25 / 45 分钟；
5. 点「开始专注」；
6. 可以暂停、重置、离开；回来继续；
7. 完成会记录，并让植物成长一点。

## 操作

| 输入 | 行为 |
| --- | --- |
| WASD / Shift | 自由走动 / 快走 |
| 鼠标 | 环顾（点击画面锁定鼠标；ESC 释放） |
| E | 互动：台灯 / 植物 / 猫 / 窗 / 唱机 / 杯 / 椅 / 笔记本 |
| 楼梯 | 1F ↔ 2F ↔ 3F |
| TAB | 隐藏/还原 UI 面板 |
| `SPACE` | 开始 / 暂停 |
| `R` | 重置 |
| `M` | 静音 |
| `1–4` | 时长 |
| `H` | 帮助 |

## 技术

```text
index.html
src/main.js      Three.js 第一人称控制 / 会话 / UI
src/world.js     三层大宅：房间 / 楼梯 / 家具 / 碰撞
src/session.js   专注会话纯逻辑（Node 可测）
src/audio.js     生成式环境声（WebAudio）
src/style.css
vendor/          Three.js r187 本地 vendor（three.module.js + three.core.js；来源见 vendor/README.md）
tests/           session.test.js
```

- Three.js ES module，本地 vendor，不依赖 CDN；
- 手写轨道相机，无 OrbitControls 依赖；
- 程序化几何，无外部模型/贴图；
- 生成式 lofi 声层；
- localStorage `slow-cabin-state-v1`。

## 计时

专注计时使用绝对截止时间（`deadline`），不依赖 `requestAnimationFrame`。切到后台、最小化或失焦后，回到页面会按真实时间补算；暂停/继续也按墙钟同步。

## 验证

```bash
./run.sh game03-test
```

9 项会话逻辑测试。

## 当前边界

已实现：3 层大宅、17 个空间、自由走动与楼梯、3 种场景、4 张生成式唱片、专注计时、意图、声音、互动、植物/记录、本地保存。

未实现：多独立房间、装饰商店、账号/云同步、完整移动端适配、WebGL 降级页、导出/迁移。

详细策划见 [`../docs-ai/design03/README.md`](../docs-ai/design03/README.md)。

项目总结：[HUB](../brief/03/HUB.html) · [GUIDE](../brief/03/GUIDE.html)。
