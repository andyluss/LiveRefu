# LiveDSO · Vault 样本集

> 所有内置 vault 都在本目录；`vaults.json` 注册后可在 Workbench / CI 切换。每套含 3 张风格卡（原 LRDS 也为 3 张）；全部 33 张卡都有 50 个显式角色，角色统一落在 `theme.<card>.color.<role>` token 命名空间，并通过 `npm run skin:check` 对比度门禁。
> 这些是**原创近似样本**，用于验证通用性；不是任何品牌的官方 token 包，也不代表隶属、赞助或背书。

## 1. 目录

| id | 目录 | 类型 | 特点 |
| --- | --- | --- | --- |
| `sample` | `lrds-sample/` | 自有示例 | LRDS 示例；463 tokens；LRDS schema 试点；含弃用/契约/风格卡 |
| `lrds` | `lrds-real/` | 真实导入 | 从工作区 `design/tokens/` 导入；635 tokens；LRDS schema 试点 |
| `minimal` | `minimal/` | 最小起点 | 10 tokens / 1 契约 / 1 风格卡 |
| `material-3` | `material-3/` | 流行系统启发 | Material 3；422 tokens；LRDS schema 试点 |
| `carbon` | `carbon/` | 流行系统启发 | Carbon；422 tokens；LRDS schema 试点 |
| `polaris` | `polaris/` | 流行系统启发 | Polaris；423 tokens；LRDS schema 试点 |
| `ant-design` | `ant-design/` | 流行系统启发 | Ant Design；413 tokens；LRDS schema 试点 |
| `tailwind` | `tailwind/` | 流行系统启发 | Tailwind；430 tokens；LRDS schema 试点 |
| `retro-futurism` | `retro-futurism/` | 复古未来 | 423 tokens；LRDS schema 试点 |
| `cassette-futurism` | `cassette-futurism/` | 复古未来 | 425 tokens；LRDS schema 试点 |
| `atompunk` | `atompunk/` | 复古未来 | 411 tokens；LRDS schema 试点 |

## 2. 使用

```bash
cd design/projects/livedso
node src/cli.ts check vaults/material-3
node src/cli.ts check vaults/retro-futurism
node src/cli.ts ci --strict
node src/cli.ts serve 4173
```

Workbench 左侧 vault 选择器会读取 `vaults.json`。

## 3. 命名差异

样本故意使用不同命名体系：

- `md.sys.color.*`（Material 风格）
- `cds.color.*`（Carbon 风格）
- `p.color.*`（Polaris 风格）
- `ant.colorPrimary`（Ant Design 风格）
- `tw.color.*`（Tailwind 风格）
- 复古未来使用 `rf.*` / `cf.*` / `ap.*`

这用于验证 LiveDSO 不依赖单一 token 命名，而是读取 DTCG 结构、别名、契约与风格卡。

## 4. 版权与商标

- 样本 token 名/色值为原创近似，**不是**官方文件；
- Material、Carbon、Polaris、Ant Design、Tailwind 等名称/商标归各自所有者；
- 如用于商业交付，请替换为你自己的 token 集并遵守上游许可；
- 详见 [`../TRADEMARKS.md`](../TRADEMARKS.md)。
