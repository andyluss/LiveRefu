# LiveDSO · Vault 样本集

> 所有内置 vault 都在本目录；`vaults.json` 注册后可在 Workbench / CI 切换。每套含 3 张风格卡（原 LRDS 也为 3 张）。
> 这些是**原创近似样本**，用于验证通用性；不是任何品牌的官方 token 包，也不代表隶属、赞助或背书。

## 1. 目录

| id | 目录 | 类型 | 特点 |
| --- | --- | --- | --- |
| `sample` | `lrds-sample/` | 自有示例 | LRDS 示例；37 tokens；含弃用/契约/风格卡 |
| `lrds` | `lrds-real/` | 真实导入 | 从工作区 `design/tokens/` 导入；229 tokens |
| `minimal` | `minimal/` | 最小起点 | 10 tokens / 1 契约 / 1 风格卡 |
| `material-3` | `material-3/` | 流行系统启发 | Material 3 风格的角色命名与色调 |
| `carbon` | `carbon/` | 流行系统启发 | Carbon 风格的 layer/text/interactive |
| `polaris` | `polaris/` | 流行系统启发 | Polaris 风格的 bg/surface/text/interactive |
| `ant-design` | `ant-design/` | 流行系统启发 | Ant Design 风格的 camelCase token |
| `tailwind` | `tailwind/` | 流行系统启发 | Tailwind 色阶 + 深色底 |
| `retro-futurism` | `retro-futurism/` | 复古未来 | 纸、锈红、CRT 青、琥珀 |
| `cassette-futurism` | `cassette-futurism/` | 复古未来 | 炭黑、米色、橙色、青色指示 |
| `atompunk` | `atompunk/` | 复古未来 | 海军蓝、奶油、原子青、危险红 |

## 2. 使用

```bash
cd lab/livedso
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
