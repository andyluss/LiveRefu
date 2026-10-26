# Tools · 生成器与闸门

> 零第三方依赖；Node / Deno / Bun 兼容；Node **22.18+** 默认 strip types，用 `node` 直接跑（无需 flag）。
> **每个检查器都必须带 `--self-test`，且负向用例断言错误类型**——只断言“有错”会让用例因无关错误而假通过。

## 一、工具

| 工具 | 作用 | 自检 |
| --- | --- | --- |
| [`token_lib.ts`](token_lib.ts) | 加载、别名解析、校验、CSS/Godot/Markdown 生成 | — |
| [`build_tokens.ts`](build_tokens.ts) | 生成 8 个产物；`--check` 校验生成物无 diff | 8/8 |
| [`check_tokens.ts`](check_tokens.ts) | 结构 / 类型 / 别名 / 字阶 / 间距 / 产品层 | 7/7 |
| [`check_contrast.ts`](check_contrast.ts) | 68 组对比度 + 7 组层级 + 3 组 focus 分离 | 7/7 |
| [`check_no_raw_values.ts`](check_no_raw_values.ts) | 网站 app 全量裸色值；`--all` 报告游戏未迁移面（注释已剥离） | 8/8 |
| [`check_tomorrows_channel_skin.ts`](check_tomorrows_channel_skin.ts) | 《明日频道》磁带 `.tres` ↔ `product.tomorrows-channel.*` 对账 | 7/7 |
| [`check_component_contracts.ts`](check_component_contracts.ts) | 组件契约五节齐全、token 存在、无裸值；共享组件 CSS | 8/8 |
| [`build_web_kit.ts`](build_web_kit.ts) | 把 `kits/web/components.css` 复制到设计产物与两个产品；`--check` 比对 | 3/3 |
| [`check_component_usage.ts`](check_component_usage.ts) | 审计 button/panel/field 的真实消费者数与引用数 | 4/4 |
| [`build_hub.ts`](build_hub.ts) | 生成 `design/HUB.html`（一页式可视化）；`--check` 防过期 | 4/4 |
| [`capture_products.ts`](capture_products.ts) | **手动**：真实页面截图 + Tab 焦点审计（需本地服务与 Chrome CDP） | 2/2 |
| [`check.sh`](check.sh) | 一键跑全部自检 + 闸门 | — |

## 二、手动工具

`capture_products.ts` 不在 CI/pre-commit 里跑：它需要两个已构建的产品服务与一个开启 CDP 的 Chrome。用法见 [`../docs/09_产品走查_v0.2.md`](../docs/09_产品走查_v0.2.md)。

## 三、常用命令

```bash
bash design/tools/check.sh                  # 全部
node design/tools/build_tokens.ts
node design/tools/build_tokens.ts --check
node design/tools/check_no_raw_values.ts --all
```

## 四、加一个新闸门

1. 在 `token_lib.ts` 里放**纯函数**（便于自检），CLI 只做 I/O；
2. 写 `--self-test`：至少一个“好数据不误报”、一个“坏数据必须报错”，并断言**错误类型**；
3. 接入 `check.sh`；
4. 更新 [`../docs/02_系统架构.md`](../docs/02_系统架构.md) 的闸门表与 [`../CHANGELOG.md`](../CHANGELOG.md)。

## 五、边界

- 不在检查器里硬编码设计值：从 token 读。
- 不为了通过审计而弱化阈值：对比度不达标时改设计或改 token。
- 不静默跳过：读不到、解析不出、没有生成物，一律判失败而不是“通过”。
