# LiveDSO · Token 规模与扩展

> 版本：v1.19 ｜ 日期：2026-10-28

## 一、结论：没有硬上限

`loadVault` 读取 `tokens/*.json` 的全部 JSON，递归收集 `$value` 叶子；没有数量上限或白名单。

限制 Token 数量的不是加载器，而是可读性与维护成本。当前 11 个 vault 的规模在 **411–635** 之间，足够覆盖真实检查与风格卡。

## 二、当前分层

| 层 | 位置 | 作用 |
| --- | --- | --- |
| 厂商原生源 | `ref.source.<vendor>.*` | 保留 Material/Carbon/Tailwind 等原生命名 |
| 原始尺度 | `ref.color.*` / `ref.font.*` / `ref.space.*` / `ref.radius.*` / `ref.shadow.*` / `ref.motion.*` | 色阶、字体、间距、圆角、阴影、动效 |
| 默认语义 | `sys.color.*` | 16 个 A 档角色 |
| 组件 | `component.*` | button/input/card 的尺寸与部件 |
| 风格差异 | `product.<card>.role.*` | 非默认主题的稀疏覆盖 |

`theme-roles.tokens.json` 与 `theme.*` 全量副本已移除；不再作为新结构。

## 三、当前规模

| 藏库 | Token 总数 |
| --- | --- |
| LRDS sample | 463 |
| LRDS real | 635 |
| Minimal | 419 |
| Material 3 | 422 |
| Carbon | 422 |
| Polaris | 423 |
| Ant Design | 413 |
| Tailwind | 430 |
| Retro Futurism | 423 |
| Cassette Futurism | 425 |
| Atompunk | 411 |

11/11 vault 已通过严格 LRDS schema：

```text
meta + ref + sys + component + product
```

校验：

```bash
npm run schema:check
```

## 四、角色与规模的关系

- A 档 16 角色进 `sys.color.*`；
- 风格卡只写与默认主题不同的 `product.<card>.role.*`；
- 原始色进 `ref.generated`；
- 风格卡仍保留 50 个角色引用，缺口由 LiveDSO 预览 fallback；
- 不要求每张卡复制完整 50 角色。

## 五、真正的限制

1. **检查成本**：token 越多，投影/采用扫描/对比度计算越慢；
2. **契约引用**：契约只能引用已存在的 token；
3. **设计责任**：token 越多，命名/弃用/维护成本越高；
4. **测试计数**：部分回归测试固定 token 数，扩展后需同步更新。

## 六、如何继续扩

- 原生源继续放 `ref.source.<vendor>`；
- 新尺度放 `ref`，不要新增厂商顶层；
- 新语义先证明跨组件复用，再进 `sys.color.*`；
- 风格差异只进 `product.<card>.role.*`；
- 组件部件进 `component.*`；
- 跑：

```bash
node src/cli.ts check vaults/<id>
npm run schema:check
npm run skin:check
npm test
```
