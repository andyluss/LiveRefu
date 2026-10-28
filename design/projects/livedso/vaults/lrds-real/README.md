# LiveDSO · LRDS real 导入样本

> **生成物，不要手改。** 由 LiveDSO `import` 从工作区 `design/tokens/` 导入：
>
> ```bash
> cd design/projects/livedso
> node src/cli.ts import ../../design/tokens vaults/lrds-real
> ```
>
> 导入内容：`core/ref.tokens.json`、`core/sys.tokens.json`、`products/*.tokens.json`（6 个文件 / 229 core tokens（另含 150 个 theme role tokens））。
> `contracts/`、`style-cards/`、`checks.json` 从示例 vault 复制并按真实 case 调整（product 层允许裸值）。
>
> 使用：
>
> ```bash
> node src/cli.ts check vaults/lrds-real
> LIVEDSO_VAULT="$PWD/vaults/lrds-real" node src/cli.ts serve 4173
> ```
