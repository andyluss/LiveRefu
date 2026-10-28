# Contributing to LiveFile / 灵动档案

> **正式名**：LiveFile / 灵动档案 ｜ **许可**：Apache-2.0（核心）+ 商业托管/团队/审计
> 贡献者政策：**DCO 1.1**，不使用 CLA。

## 开发环境

- Node.js **24+**；
- 零第三方运行时依赖；
- 不提交 `node_modules/`、`reports/`、个人档案数据、`.DS_Store`。

```bash
cd lab/livefile
node src/cli.ts check
npm test
node src/cli.ts serve 4175
```

## 提交前

- `npm test` 通过；
- 档案改动后跑 `check`；
- 更新 `CHANGELOG.md`；
- 不提交真实个人/客户档案；示例必须脱敏；
- UI 改动附验证说明。

## DCO（必须）

每个提交带 `Signed-off-by`：

```bash
git commit -s -m "feat: ..."
```

## 许可

贡献按 **Apache-2.0** 许可（见 [`LICENSE`](LICENSE)）。不要求 CLA；双许可/重新许可会另开决策。
