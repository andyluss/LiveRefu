# ADR-007 · M1 切片：TS DSL 与 Web 预览

- 状态：接受（2026-11-23）
- 关联：[07 · M1 切片](../docs/07_M1实现与验收.md)

## 决策

1. TS DSL 采用**对象式 `define*`**（`defineActor`/`defineRule`/…），不引入自定义 AST 或运行时。
2. 用 Node 24 的 type stripping 直接执行 `.ts`；**不做 tsc 类型检查**，类型由编辑器/后续任务负责。
3. `#world-authoring` 通过 `games/world/package.json` 的 `imports` 映射到本地包，避免 `node_modules` 与安装步骤。
4. 编译器只做「收集 → 必需性/重复 ID 检查 → 写规范化 JSON」，随后交给 Rust `worldc validate/hash`。
5. Web 预览用 `wasm-bindgen 0.2.129`（与 CLI 对齐）暴露 `PreviewWorld`；渲染用 Canvas 2D，不引入 Three.js。
6. Web 预览是**作者工具**，直接链接 `world-core`；引擎适配器仍走 C ABI，二者不混。
7. 主题按 R-016 做 `system/light/dark`，统一 `localStorage['lrds-theme']`。

## 理由

- 对象式 DSL 能直接映射到 schema/JSON，M1 不承担语言设计的风险；`on/cmd` 简写在有真实需求后再加。
- 不装 `node_modules` 让 M1 在 CI/新机器上零安装可跑；代价是类型检查延后。
- Canvas 2D 足够验证「wasm 内核 + 输入 + 事件 + HUD + 回放」；Three.js 留到需要 3D 时。
- `wasm-bindgen` 版本必须与 CLI 精确匹配；锁 `=0.2.129` 比每次升级两个组件便宜。

## 代价 / 后续

- 没有 source map、热重载、类型检查；M1 编辑器阶段补。
- 预览没有移动/碰撞/存档 UI；不是完整游戏客户端。
- 生成物（`web/pkg`、`node-pkg`、`pack.data`、`m0.trace.json`）不入库。
