# Contributing to LiveDesign / LiveDSO

> **代号**：LiveDSO ｜ **正式名（暂定）**：LiveDesign / 灵动设计 ｜ **许可**：Apache-2.0
> 贡献者政策：**DCO 1.1**（Developer Certificate of Origin），不使用 CLA。

## 一、开发环境

- Node.js **24+**；
- 零第三方运行时依赖；
- 不提交 `node_modules/`、`reports/`、`dist/`、`.DS_Store`。

```bash
cd lab/livedso
node src/cli.ts check
node src/cli.ts check vault-lrds
npm test
node src/cli.ts serve 4173
```

## 二、提交前

- 代码通过 `npm test`；
- 改动 token/契约/风格卡时，跑 `node src/cli.ts check` 与 `check vault-lrds`；
- 更新 `CHANGELOG.md`（非琐碎改动）；
- 不在 PR 中提交密钥、个人路径、用户 vault 内容；
- UI 改动附截图或说明如何验证。

## 三、DCO（必须）

每个提交必须带 `Signed-off-by`：

```bash
git commit -s -m "feat: ..."
```

提交信息包含：

```text
Signed-off-by: Your Name <you@example.com>
```

这表示你同意仓库根部的 [`DCO`](DCO) 1.1。**不要**伪造他人的 sign-off。

## 四、贡献范围

欢迎：

- 新的检查规则（可解释、可测试）；
- 新投影（CSS/JSON/其他）；
- 文档/示例 vault；
- 无障碍/性能改进；
- 真实 case 的 bug 报告。

先开 issue 讨论大改动；不要在没有设计的情况下重写核心。

## 五、许可

提交即表示你的贡献按 **Apache-2.0** 许可（见 [`LICENSE`](LICENSE)）。不要求 CLA；若未来需要双许可/重新许可，会另开决策并征得贡献者同意。

## 六、行为

- 对事不对人；
- 不提交他人的私密数据/未授权资产；
- 不伪造测试/截图/来源；
- 维护者可以拒绝不符合许可/伦理边界的贡献。
