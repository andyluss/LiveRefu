# 青橙全栈（QC Stack）Changelog

> 记录 **青橙全栈 / QC Stack** 自身的版本与实现变更。
> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 SemVer；时间一律东八区、精确到分。
> **工作区级**变更仍记根 [`CHANGELOG.md`](../../CHANGELOG.md)；本文件只记全栈框架。
> 设计系统自身的变更记 [`../CHANGELOG.md`](../CHANGELOG.md)。

## [0.1.0] - 2026-10-26 14:42

### 新增

- **青橙全栈可视化**：新增 [`HUB.html`](HUB.html)（项目开发/发布）与 [`GUIDE.html`](GUIDE.html)（功能/用法），沿用 LRDS token/焦点/圆角/暗亮主题；README/HUB/文档索引已加入口。
- **青橙全栈收尾**：新增 [`docs/TODO.md`](docs/TODO.md)，将推送/CI/npm/HMR/SMTP 等外部事项移出聊天；README/文档索引/design TODO/HUB 标记“已收尾”。
- **青橙全栈 P17 发布准备**：包 dry-run（4 files/32.3KB）、发布检查文档、外部依赖边界；10/10 测试；`25_P17实现记录`。
- **青橙全栈 P16 核心**：S3 `x-amz-checksum-sha256`、分片限速、`saveUpload({scan})`；10/10 测试；`24_P16实现记录`。
- **青橙全栈 P15 核心**：第三个 dogfood `examples/guestbook`、OAuth `previousTokenKeys` 密钥轮换；10/10 测试；`23_P15实现记录`。
- **青橙全栈 P14 核心**：S3 `uploadLarge`（并发/重试/checkpoint）、OAuth token AES-256-GCM 加密；9/9 测试；`22_P14实现记录`。
- **青橙全栈 P13 核心**：S3 multipart（create/upload/complete/abort）、OAuth refresh 并发锁/撤销、CI workflow；9/9 测试；`21_P13实现记录`。
- **青橙全栈 P12 核心**：S3 presign/delete、OAuth refresh token；9/9 测试；`20_P12实现记录`。
- **青橙全栈 P11 核心**：`qc pack` 预编译包（`dist/index.mjs`/`dist/cli.mjs`）、`qc new` 通过 `@qingcheng/qc` 包导入；`19_P11实现记录`。
- **青橙全栈 P10 核心**：S3 兼容存储（SigV4 PUT）、OAuth PKCE（S256）；9/9 测试；`18_P10实现记录`。
- **青橙全栈 P9 核心**：SMTP transport、`Storage`/`LocalStorage`/`MemoryStorage`、开发自动刷新、CI 模板；8/8 测试；`17_P9实现记录`。
- **青橙全栈 P8 核心 + 文档分区**：OAuth 通用路由、GitHub/Google 预设；全栈文档迁入 `docs/design/` 与 `docs/implementation/`，新增 `docs/README.md`；7/7 测试；`16_P8实现记录`。
- **青橙全栈 P7 核心**：OAuth/OIDC adapter（state/token/userinfo/session）、API 邮件 transport、可注入 fetch；6/6 测试；`15_P7实现记录`。
- **青橙全栈 P6 核心**：邮箱验证、异步 StandardSchema、`formValues/formErrors`、第二个 dogfood `examples/bookmarks`；notes 3/3 + bookmarks 1/1；`14_P6实现记录`。
- **青橙全栈 P5 核心**：mailer（console/file/memory）、密码重置（token 哈希/一次性/清 session）、`/forgot`、`/reset`、StandardSchema `fromStandard`、上传 `saveUpload`；3/3 测试；`13_P5实现记录`。
- **青橙全栈 P4 运维核心**：`x-request-id` + JSON 日志、`qc db backup/restore`、Docker/Compose 部署模板；`12_P4实现记录`。
- **青橙全栈 P3 核心**：esbuild bundle（`dist/server.mjs`）、`qc start` 自动识别 bundle、`qc start dist`、`Action.onError` 表单错误回填、内置 `/health`；新增 esbuild 0.25.12 devDependency；2/2 测试 + bundle smoke；`11_P3实现记录`。
- **青橙全栈 P2**：auth（session/scrypt/CSRF/角色）、表单校验、安全头、限流、2MiB 请求体上限；notes 升级为注册/登录/个人笔记/删除/退出；2 个集成测试通过；`10_P2实现记录`。
- **青橙全栈 P1 骨架落地**：`qc/`（Node 原生 HTTP + node:sqlite + 文件路由 + page/action + HTML 模板 + 迁移 + CLI）与 `examples/notes/`；2 个集成测试通过；P2 auth/打包待做。
- **新增青橙全栈（QC Stack）技术框架提案**：`docs/` 9 篇文档（理念/架构/应用契约/Web 实现/多端/路线/依赖治理/决策清单）；`D-018` 待决策；拍板前不写代码。
- **全栈 TODO 收拢**：`../TODO.md` 的 D-018–D-035 移入 [`docs/TODO.md`](docs/TODO.md)，并按设计 TODO 的 ID/层/优先级/状态/下一步/依赖格式重排；design TODO 只保留设计系统事项与一行链接。

### 变更

- 从根 [`CHANGELOG.md`](../../CHANGELOG.md) 与 [`design/CHANGELOG.md`](../CHANGELOG.md) 迁入全栈 P1–P17、可视化、TODO 与 QC 提案条目；根/设计日志不再重复。
