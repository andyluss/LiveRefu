# LiveDSO · Token 规模与扩展

> 版本：v1.9 ｜ 日期：2026-10-28

## 一、结论：没有硬上限

`loadVault` 会读取 `tokens/*.json` 下的全部 JSON，递归收集所有 `$value` 叶子；没有 `slice`、数量上限或白名单。

限制 Token 数量的从来不是加载器，而是早期样本的**设计选择**：

- 为了让 10 分钟能读懂一个 vault；
- 为了避免演示数据淹没检查结果；
- 每套示例最初只放 10–12 个核心语义 token。

## 二、原来看起来少的原因

每个藏库实际上有三个层次：

| 层 | 文件 | 作用 |
| --- | --- | --- |
| 原生 token | `tokens.json` / `core-*.tokens.json` | 各设计系统自己的命名体系 |
| 角色 token | `theme-roles.tokens.json` | `theme.<card>.color.<role>`，50 角色/卡 |
| 规模 token | `tokens.json`（新样本）或 `scales.tokens.json` | 色阶、字体、间距、圆角、阴影、动效、组件尺寸 |

之前只展示了第一层，所以看起来“只有 10 个”。

## 三、v1.9 新增的规模层

每套新增约 **144 个 token**：

- 6 组色阶 × 10 档；
- 字体家族/字号/行高/字重/字距；
- 间距/圆角/边框/阴影；
- 动效 duration/easing；
- opacity/z-index；
- control/component 尺寸（button/input/card/nav/table/modal/toast）。

当前总量：

| 藏库 | Token 总数 |
| --- | --- |
| LRDS sample | 463 |
| LRDS real | 635 |
| Minimal | 304 |
| Material 3 | 422 |
| Carbon | 422 |
| Polaris | 423 |
| Ant Design | 413 |
| Tailwind | 430 |
| Retro Futurism | 423 |
| Cassette Futurism | 425 |
| Atompunk | 411 |

## 四、严格 schema 试点

`vaults/minimal/` / `vaults/lrds-sample/` / `vaults/lrds-real/` / `vaults/material-3/` 已作为严格遵循 LRDS schema 的样板：

```text
meta + ref + sys + component + product
```

- 无 `theme` 顶层；
- A 档角色映射到现有 `sys.color.*`；
- 其余角色走 `product.<card>.role`；
- 原始色进 `ref.generated`；
- 校验：`npm run schema:check`。

## 五、真正的限制

1. **检查成本**：每加一个 token，检查/投影/采用扫描会多一点工作量；这是性能成本，不是上限。
2. **契约引用**：契约只能引用存在的 token；新增 token 不会自动进入契约。
3. **设计责任**：token 越多，命名/弃用/维护成本越高；不要为了数量堆 token。
4. **测试计数**：部分回归测试固定断言 token 数，扩展后需同步更新。

## 六、如何继续扩

- 新 token 放在对应 vault 的 `tokens/*.json`；
- 颜色保持 `$type: "color"`；尺寸用 `dimension`；数字用 `number`；
- 角色层继续通过 `theme.<card>.color.<role>` 引用；
- 跑：

```bash
node src/cli.ts check vaults/<id>
npm run skin:check
npm test
```
