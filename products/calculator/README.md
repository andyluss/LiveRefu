# 手边计算器 · Live Calc

> **产品状态**：v0.1.0 · PWA 可用 · 2026-11-13
> **一句话**：一款本地优先、离线可用、键盘完整的复古未来计算器；用 App Kit 的语义与触控契约重做，而不是把 13 套皮肤原样搬进来。

## 为什么是独立产品

它不在 `products/life/apps/` 里。Life 是 16 款日常节律记录应用，共享 `AppConfig / entries / summary` 数据模型；计算器没有“今天记录了一条什么”的领域字段，硬套会得到一个假 Life App。

计算器是**独立工具产品**：

- 可以单独发布、安装、离线使用；
- 未来可以作为 Life 融合页的一个入口，但不必成为 Life 的第 17 个 app；
- 直接消费 App Kit 的 token 与交互契约，成为其 Web/PWA 消费者。

## 首发范围

- 四则运算、百分比、±、开方、平方、倒数；
- 内存 `MC / MR / M+ / M−`；
- 纸带历史（本地保存，点击取回）；
- 完整键盘；
- PWA 安装与离线；
- 3 套皮肤：Archive / Console / Phosphor；
- 本地优先：无账号、无追踪、无网络请求。

## 三套皮肤

| 皮肤 | 定位 |
| --- | --- |
| **Archive / 纸感** | 暖纸、青绿；默认，适合白天与长按阅读 |
| **Console / 深色** | App Kit 当前基线；低光环境 |
| **Phosphor / 荧光** | 唯一一套复古未来签名皮肤；不是默认 |

## 快速开始

```bash
cd products/calculator
node server.js
# http://127.0.0.1:4220/web/
```

无构建、无第三方依赖；`web/tokens.css` 由 App Kit token + 本地皮肤源生成。

## 检查

```bash
npm test                 # 20 项核心测试
npm run check            # 测试 + 皮肤对比度 + tokens.css 对账
node tools/build-theme.js --check
```

## 目录

```text
products/calculator/
├── server.js              # 本地静态服务器（Node，无依赖）
├── web/                   # PWA：index / styles / app / manifest / icons
├── src/core/              # 纯计算核心（ESM，无 DOM）
├── test/core.test.js      # 核心与历史恢复测试
├── design/skins.json      # 3 套皮肤源
├── tools/build-theme.js   # App Kit token + 皮肤 → web/tokens.css
├── sw.js                  # 离线缓存
└── docs/                  # 产品 / 核心 / AppKit / 验收
```

## 核心

```text
键盘 / 点击 ──Action──▶ reduce(state, action) ──▶ CalcState ──▶ DOM
```

计算核心是纯函数；界面不保存计算中间态。参考独立项目的实现，并保留其关键行为：

- `±` 在运算符之后开启负数输入，而不是只改显示；
- `200 + 10% =` 得到 `220`；
- 错误态给出具体原因，并可用数字 / AC / 退格明确恢复；
- 纸带与当前计算分离，AC 不清纸带；
- 最多 15 位输入，浮点噪声被格式化抹平。

## App Kit 的诚实边界

本产品是 **Web/PWA 消费者**：

- 消费 `design/tokens/dist/app/tokens.json` 的 `sys.*` 颜色、触控、间距、圆角与字号基准；
- 本地 `design/skins.json` 提供产品皮肤；
- 按 App Kit 清单处理安全区、44/48 触控、200% 字号、焦点、减少动态与屏幕阅读器；
- **尚未做 iOS/Android 原生壳与真机走查**，不声称已完成原生验收。

详见 [`docs/02_AppKit接入.md`](docs/02_AppKit接入.md)。

## 来源与许可

计算核心与行为规格参考 [`indie/live-calculator`](../../indie/live-calculator/README.md)；原项目为 `UNLICENSED`。本产品保留来源说明，不改动独立仓库；正式分发前需确认许可与字体/图标权利。见 [`NOTICE.md`](NOTICE.md)。

## 文档

- [00 产品定义](docs/00_产品定义.md)
- [01 计算核心](docs/01_计算核心.md)
- [02 App Kit 接入](docs/02_AppKit接入.md)
- [03 验收](docs/03_验收.md)
