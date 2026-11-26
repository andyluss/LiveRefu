# web · RefuWorld M1 Web 预览

> 一个不依赖引擎编辑器的预览：wasm 内核 + 最小 Canvas 视图 + 点击/键盘交互 + M0 trace 回放。

## Demo 体系（2D / 2.5D / 3D）

```bash
./web/build.sh
cd games/world
python3 -m http.server 8787
# 索引：http://127.0.0.1:8787/web/demos.html
# 2.5D 夜市：/web/iso.html?demo=market
# 2.5D 温室：/web/iso.html?demo=greenhouse
# 3D 环形站：/web/orbit3d.html
```

`web/build.sh` 会把 4 个内容包构建到 `web/packs/*.data`。所有 Demo 共用 `PreviewWorld`，
2.5D 与 3D 只是表现层，不复制规则。

> macOS 构建 wasm QuickJS 需要 LLVM 的 `llvm-ar`（`brew install llvm`）；`build.sh` 会自动使用 Homebrew 路径。

## 3D 演示

```bash
./web/build.sh
cd games/world
python3 -m http.server 8787
# http://127.0.0.1:8787/web/demo3d.html
```

同一份 wasm 世界状态，Three.js 表现层：第三人称/轨道相机、WASD/点击寻路、气闸滑门、对话字幕、
程序化海面/雨/货轮/灯塔、Bloom、尘埃与可选 WebAudio 环境声。Three.js 已 vendor 在 `web/vendor/three/`，
不依赖 CDN。3D 页不复制规则——所有交互仍走 `PreviewWorld`。

## 编辑器

```bash
cd games/world
./worldc editor --port 8788
# 打开 http://127.0.0.1:8788/
```

编辑器 v0.5：拖动摆放、字段表单、定义/规则 JSON、对话图、撤销/重做、校验、构建并打开预览。
它编辑的是 `data/demo.harbor` 的 JSON 包；TS 源 `src/content/demo.harbor` 不会自动同步。

## 构建与运行

```bash
cd games/world
./web/build.sh
python3 -m http.server 8787
# 打开 http://127.0.0.1:8787/web/
```

`web/build.sh` 会：

1. `worldc bake nav` + `worldc build` 生成 4 个内容包（港湾/夜市/温室/环形站）；
2. 编译 `world-wasm` 到 `wasm32-unknown-unknown`；
3. 用 `wasm-bindgen --target web` 生成 `web/pkg/`；
4. 用 `wasm-bindgen --target nodejs` 生成 `web/node-pkg/`（供 `test_preview.cjs`）；
5. 复制 `pack.data`、`web/packs/*.data` 与 `m0.trace.json`。

`web/pkg/`、`web/node-pkg/`、`pack.data`、`m0.trace.json` 都是生成物，已 gitignore。

## 操作

| 操作 | 方式 |
| --- | --- |
| 移动 | `WASD` / 方向键；关闭的门与 NPC 会挡住玩家 |
| 寻路 | 点击空地；A* 沿烘焙导航网格走，虚线显示路径 |
| 拾取物品 | 点击黄色菱形，或 `F` / 「拾取 F」 |
| 与 NPC 对话 | 点击绿色圆点，或 `T` / 「对话 T」 |
| 与门交互 | 点击橙色方块，或 `E` / 「交互 E」 |
| 暂停 | `P` / 「暂停」 |
| 重置 | `R` / 「重置」 |
| 回放 M0 trace | 「回放 M0 trace」 |

> 目标在玩家 8 米内才可操作；移动是 2D 运动学 + 圆形/AABB 碰撞，点击移动走 A*，不含跳跃与物理。
> 导航网格由 `./worldc bake nav` 生成；编辑器「构建并试玩」会先烘焙。

## 验收

- `worldc ts-build --compare ../data/demo.harbor`：TS 包与 JSON 包同哈希。
- `node web/test_preview.cjs`：wasm 预览的 replay 与 600 tick 点击序列都得到 `0x7b176031a2be41c9`。
- 浏览器 CDP 实测：拾取 → 交互 → 对话后任务完成；回放 `PASS`；`system/light/dark` 三态与 `aria-pressed` 正确。

## 主题（R-016）

`index.html` 在 CSS 加载前预绘制主题，默认 `system`，存储键为 `localStorage['lrds-theme']`；三态按钮可键盘访问，当前项 `aria-pressed="true"`。
