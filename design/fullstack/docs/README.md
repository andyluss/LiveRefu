# 青橙全栈 · 文档索引

> 返回：[全栈 README](../README.md) ｜ 代码：[qc/](../qc/README.md) ｜ 示例：[notes](../examples/notes/README.md) · [bookmarks](../examples/bookmarks/README.md)

## 设计文档（为什么 / 怎么想）

| # | 文档 | 内容 |
| --- | --- | --- |
| 01 | [理念与边界](design/01_理念与边界.md) | 拥有应用契约，不拥有整个宇宙 |
| 02 | [架构总览](design/02_架构总览.md) | 分层、生命周期、项目结构 |
| 03 | [应用契约与开发者体验](design/03_应用契约与开发者体验.md) | page/action/table/auth 四个词 |
| 04 | [Web 优先实现](design/04_Web优先实现.md) | 运行时、HTTP、数据、auth、构建、部署 |
| 05 | [多端扩展](design/05_多端扩展.md) | 共享契约，不共享渲染 |
| 06 | [路线图与验收](design/06_路线图与验收.md) | P1–P9 阶段与停止条件 |
| 07 | [依赖治理与风险](design/07_依赖治理与风险.md) | 依赖预算、退出测试、风险 |
| 08 | [决策清单](design/08_决策清单.md) | F1–F12 决策 |

## 实现记录（做了什么 / 还差什么）

| # | 记录 | 内容 |
| --- | --- | --- |
| 09 | [P1](implementation/09_P1实现记录.md) | 最小骨架、notes |
| 10 | [P2](implementation/10_P2实现记录.md) | auth/CSRF/校验/安全头 |
| 11 | [P3](implementation/11_P3实现记录.md) | bundle、表单回填、health |
| 12 | [P4](implementation/12_P4实现记录.md) | 日志、备份、Docker |
| 13 | [P5](implementation/13_P5实现记录.md) | 密码重置、StandardSchema、上传 |
| 14 | [P6](implementation/14_P6实现记录.md) | 邮箱验证、异步校验、bookmarks |
| 15 | [P7](implementation/15_P7实现记录.md) | OAuth/OIDC、API 邮件 |
| 16 | [P8](implementation/16_P8实现记录.md) | OAuth 路由/预设、文档分区 |
| 17 | [P9](implementation/17_P9实现记录.md) | SMTP、存储接口、开发刷新、CI |
| 18 | [P10](implementation/18_P10实现记录.md) | S3 存储、OAuth PKCE |
| 19 | [P11](implementation/19_P11实现记录.md) | 预编译包、`qc new` 包导入 |
| 20 | [P12](implementation/20_P12实现记录.md) | S3 预签名/删除、OAuth refresh |

## 约定

- `design/` 是**设计与决策**，尽量不随实现漂移；
- `implementation/` 是**实施记录**，允许写“当前没做到”；
- 代码在 `qc/`，示例在 `examples/`，部署模板在 `templates/`。
