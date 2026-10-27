# vault-lrds · 真实 LRDS 导入样本

> **生成物，不要手改。** 由 LiveDSO `import` 从工作区 `design/tokens/` 导入：
>
> ```bash
> cd lab/livedso
> node src/cli.ts import ../../design/tokens vault-lrds
> ```
>
> 导入内容：`core/ref.tokens.json`、`core/sys.tokens.json`、`products/*.tokens.json`（6 个文件 / 229 tokens）。
> `contracts/`、`style-cards/`、`checks.json` 从示例 vault 复制并按真实 case 调整（product 层允许裸值）。
>
> 使用：
>
> ```bash
> node src/cli.ts check vault-lrds
> LIVEDSO_VAULT="$PWD/vault-lrds" node src/cli.ts serve 4173
> ```
