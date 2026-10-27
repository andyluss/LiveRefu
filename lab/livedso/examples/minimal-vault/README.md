# LiveDSO · 最小 Vault 示例

一个可运行的最小设计系统 vault：

- 4 个 ref 颜色 + 6 个 sys token；
- 1 个 Button 契约；
- 1 张风格卡；
- 对比度/契约检查配置。

运行：

```bash
node src/cli.ts check examples/minimal-vault
LIVEDSO_VAULT=examples/minimal-vault node src/cli.ts serve 4173
node src/cli.ts report examples/minimal-vault reports/minimal-health.md
```

适合作为新 vault 的复制起点，不是完整产品 token 集。
