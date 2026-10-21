# Tokens · 单一事实来源

> 这里只放 **JSON 源** 与 **可复算生成物**。任何设计值第一次出现，必须在这里；产品代码不允许再定义一遍。

## 一、三层

| 层 | 目录 | 回答什么 | 例子 |
| --- | --- | --- | --- |
| `ref.*` | [`core/ref.tokens.json`](core/ref.tokens.json) | “有哪些值” | `ref.color.neutral.0 = #0B0F14` |
| `sys.*` | [`core/sys.tokens.json`](core/sys.tokens.json) | “用在哪” | `sys.color.bg.base`、`sys.color.focus.ring` |
| `product.*` | [`products/`](products/) | “这个产品里叫什么” | `product.future-debris.color.power` |

**规则**：
- 业务代码只引用 `sys.*` 或 `product.*`；不得引用 `ref.*`，更不得写裸值。
- 产品语义（power / residue / phosphor）只存在于 `product.*`；三个以上产品都需要时，才提案上移到 `sys.*`。
- 颜色名只允许出现在 `ref.*`；`sys.*` 用角色名。

## 二、文件

```
tokens/
├── core/
│   ├── ref.tokens.json       # 原始值
│   └── sys.tokens.json       # 通用语义 + UI/Editorial 双字阶
├── products/
│   ├── future-archive.tokens.json
│   └── future-debris.atomic.tokens.json
├── schema/
│   └── tokens.schema.json    # 编辑器补全/早期报错
└── dist/                     # 生成物（勿手改）
    ├── web/tokens.css
    ├── godot/tokens.json
    └── docs/tokens.md
```

## 三、改一个值

```bash
# 1. 改 core/ 或 products/ 下的 JSON
# 2. 重新生成（会同时写产品副本）
node --experimental-strip-types design/tools/build_tokens.ts
# 3. 跑闸门
bash design/tools/check.sh
```

**不要手改** `dist/` 或产品副本（`projects/website/app/assets/tokens.generated.css`、`projects/mainline/future-debris/game/data/tokens.json`）。`build_tokens.ts --check` 会在 CI/pre-commit 里发现漂移。

## 四、当前尺度

- 颜色：见自动生成的 [`dist/docs/tokens.md`](dist/docs/tokens.md)；
- UI 字阶：5 级（28/20/16/14/32）；
- Editorial 字阶：7 级（48/36/28/22/16/14/12）；
- 间距：4/8/12/16/24/32；
- 圆角：control 4 / panel 8；
- 描边：control 1.5 / focus 2 / offset 1；
- 动效：120/220/420ms，standard/emphasis 两条曲线。
