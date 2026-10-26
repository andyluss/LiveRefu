# TODO · 设计系统（LRDS）

> **设计系统专属待办**：App kit、组件、Archive 亮色、打印/实体、HUB、无障碍与发布。
> 根 [`TODO.md`](../TODO.md) 只收非设计系统事项；**本文件是设计系统的唯一明细与状态来源**。设计系统若阻塞工作区发布，根表只留一行摘要链接，不复制细节。
> 最后更新：2026-10-26 14:22

## 一、现在只看三件

1. **D-003 · Archive 亮色模式产品级落地**：双模承诺目前只有 Console 暗色；HUB 的亮色只是查看器主题，不算产品级。先在网站阅读页做。
2. **D-001 · 首个 App 消费者**：App kit 已有 `app/tokens.json`，但没有真实 App；先定载体，才能谈接入、真机走查与 v0.3。
3. **D-002 · Form Field 第二个真实消费者**：目前只有网站搜索框；没有真实表单，契约的 error/help/readonly 无法完整验收。

> `D-004 v0.3 发布` 被 D-001 阻塞，所以不在“现在三件”里；但它仍是 v0.3 的出口条件。

## 二、设计待办总表

| ID | 层 | 优先级 | 事项 | 状态 | 下一步 | 依赖 / 决策 |
| --- | --- | --- | --- | --- | --- | --- |
| **D-001** | 介质 · App | **P1** | 首个 App 消费者 | 待决策 | 定 App 载体与首个页面；接 `app/tokens.json`；建 `product.<app>` 风格卡；按 12 项清单真机走查 | 用户定项目/载体 |
| **D-002** | 组件 | **P1** | Form Field 第二消费者 | 阻塞 | 在 LiveFab/网站找真实表单；接 `lr-field`；补 error/help/readonly 状态 | 需真实表单 |
| **D-003** | 介质 · Web | **P1** | Archive 亮色产品级落地 | 待开始 | 网站阅读页先行：亮色 token/样式卡 → 对比度 → Tab 走查 → 推广 | 范围待定 |
| **D-004** | 治理 | **P1** | 设计系统 v0.3 发布 | 阻塞 | App 有真实消费者后，把 `[未发布]` 提升为 `0.3.0`，打 `design-v0.3.0` | D-001 |
| **D-005** | 介质 · 打印 | **P2** | 打印介质包 | 待开始 | 定第一件印刷物；再做 A4/出血/字体嵌入/CMYK | 需真实印刷需求 |
| **D-006** | 介质 · 实体 | **P2** | 实体产品设计规范 | 待决策 | 等产品形态；先列材质/工艺/包装决策清单 | 用户定产品 |
| **D-007** | 组件 | **P2** | 组件库扩展 | 待开始 | 只随真实消费者增加（dialog/tabs/toast 等） | 需真实需求 |
| **D-008** | 工具 | **P2** | 视觉回归自动化 | 待开始 | 把 `capture_products` 接入 CI/定时任务；先解决 Chrome/服务依赖 | 需 CI 环境 |
| **D-009** | HUB | **P2** | HUB 迭代 | 待开始 | 按反馈加版本 diff / 对比度矩阵 / token 变更对比 | 需使用反馈 |
| **D-010** | 介质 · App | **P2** | Swift/Kotlin 常量决策 | 待开始 | 首个消费者后再决定是否生成；当前先消费 JSON，避免两份代码 | D-001 |
| **D-011** | 无障碍 | **P2** | 跨组件无障碍审计 | 待开始 | 减少动态、屏幕阅读器标签、200% 字号、焦点顺序；先网站 + 首个 App | 首个 App / 网站 |
| **D-012** | 治理 | **P2** | Token 弃用演练 | 待开始 | 用一次真实改名/移除验证 D8 的弃用窗口与产品 pinning | 需真实变更 |
| **D-013** | 风格卡 | **P2** | 新风格卡接入清单 | 待开始 | 把四张卡的经验固化成 checklist：色板/材质/投影/对账 | 新产品 |
| **D-014** | 治理 | **P2** | 决策记录制度完善 | 已完成 | 已采纳 C 混合制；见[制度](docs/decisions/README.md)；D3 样例；2026-10-26 12:10 | — |
| **D-015** | 理念 | **P1** | 青橙理念第二批（03–05） | 已完成 | 03–05 已完稿；2026-10-26 12:48；见[理念](philosophy/README.md) | — | [理念](philosophy/README.md) |
| **D-016** | 理念 | **P2** | 青橙理念第三批（06–08） | 已完成 | 06–08 已完稿；9 篇全部完成；2026-10-26 13:02 | — | [理念](philosophy/README.md) |
| **D-017** | 理念 | **P2** | 青橙十问 × 未来残片试评审 | 已完成 | 桌面试评审完成；2026-10-26 13:10；关键红旗：照料型势力与受影响的人 | — | [评审](docs/13_青橙十问_未来残片试评审.md) |
| **D-018** | 技术 | **P1** | 青橙全栈 P0 决策 | 已完成 | F1–F12 按推荐采纳；2026-10-26 | — | [决策清单](fullstack/docs/design/08_决策清单.md) |
| **D-019** | 技术 | **P1** | 青橙全栈 P2：auth/表单/安全 | 已完成 | auth/CSRF/校验/安全头/限流/dogfood 已落地；2026-10-26 | — | [P2 记录](fullstack/docs/implementation/10_P2实现记录.md) |
| **D-020** | 技术 | **P1** | 青橙全栈 P3 核心：bundle/回填/health | 已完成 | esbuild bundle、`qc start` 自动用 bundle、auth 表单回填、`/health`；2026-10-26 | — | [P3 记录](fullstack/docs/implementation/11_P3实现记录.md) |
| **D-021** | 技术 | **P1** | 青橙全栈 P4 运维核心：日志/备份/部署 | 已完成 | request id/JSON 日志、`qc db backup/restore`、Docker/Compose 模板；2026-10-26 | — | [P4 记录](fullstack/docs/implementation/12_P4实现记录.md) |
| **D-022** | 技术 | **P1** | 青橙全栈 P5 核心：重置/StandardSchema/上传 | 已完成 | mailer、密码重置、StandardSchema 适配、上传工具；2026-10-26 | — | [P5 记录](fullstack/docs/implementation/13_P5实现记录.md) |
| **D-023** | 技术 | **P1** | 青橙全栈 P6 核心：邮箱验证/异步校验/第二 dogfood | 已完成 | 邮箱验证、异步 StandardSchema、form helper、bookmarks dogfood；2026-10-26 | — | [P6 记录](fullstack/docs/implementation/14_P6实现记录.md) |
| **D-024** | 技术 | **P1** | 青橙全栈 P7 核心：OAuth/API 邮件 | 已完成 | OAuth/OIDC adapter、API mail transport；6/6 测试；2026-10-26 | — | [P7 记录](fullstack/docs/implementation/15_P7实现记录.md) |
| **D-025** | 技术 | **P1** | 青橙全栈 P8 核心：OAuth 路由/预设/文档分区 | 已完成 | OAuth 通用路由、GitHub/Google 预设、docs 分区；7/7 测试；2026-10-26 | — | [P8 记录](fullstack/docs/implementation/16_P8实现记录.md) |
| **D-026** | 技术 | **P1** | 青橙全栈 P9 核心：SMTP/存储/刷新/CI | 已完成 | SMTP、存储接口、开发自动刷新、CI 模板；8/8 测试；2026-10-26 | — | [P9 记录](fullstack/docs/implementation/17_P9实现记录.md) |
| **D-027** | 技术 | **P1** | 青橙全栈 P10 核心：S3/PKCE | 已完成 | S3 SigV4、OAuth PKCE S256；9/9 测试；2026-10-26 | — | [P10 记录](fullstack/docs/implementation/18_P10实现记录.md) |
| **D-028** | 技术 | **P1** | 青橙全栈 P11 核心：预编译包/包导入 | 已完成 | `qc pack`、`qc new` 通过 `@qingcheng/qc` 导入（本地 file/symlink）；2026-10-26 | — | [P11 记录](fullstack/docs/implementation/19_P11实现记录.md) |
| **D-029** | 技术 | **P1** | 青橙全栈 P12 核心：S3 预签名/删除/Refresh | 已完成 | S3 presign/delete、OAuth refresh；9/9 测试；2026-10-26 | — | [P12 记录](fullstack/docs/implementation/20_P12实现记录.md) |
| **D-030** | 技术 | **P1** | 青橙全栈 P13 核心：multipart/锁/CI | 已完成 | S3 multipart、OAuth 并发锁/撤销、CI workflow；9/9 测试；2026-10-26 | — | [P13 记录](fullstack/docs/implementation/21_P13实现记录.md) |
| **D-031** | 技术 | **P1** | 青橙全栈 P14：分片/发布/HMR/第三 dogfood | 待开始 | S3 分片并发/重试/扫描、npm 发布/远程包、组件级 HMR、第三 dogfood、SMTP STARTTLS/DKIM | P13 核心已验收 | [P13 记录](fullstack/docs/implementation/21_P13实现记录.md) |

## 三、等你拍板

| 决策 | 选项 | 影响 | 关联 |
| --- | --- | --- | --- |
| **首个 App 载体** | 新建 App / 网站移动端 / 游戏 companion | 决定 App kit 何时有真实消费者、v0.3 何时能发 | D-001 / D-004 |
| **Archive 亮色范围** | 只网站阅读页 / 全产品 | 决定工作量与是否新增风格卡 | D-003 |
| **第一件印刷物** | 手册 / 海报 / 包装 | 决定打印 kit 的纸张、出血、字体与色彩规则 | D-005 |
| **实体产品形态与时间** | 品类 + 时间窗 | 决定实体规范何时启动 | D-006 |

## 四、维护规则

1. **层级**：根 [`TODO.md`](../TODO.md) 只收非设计系统事项；本文件是设计系统唯一明细与状态来源。设计系统若阻塞工作区发布，根表只留一行摘要链接，不复制细节。
2. **可执行**：每条必须有 ID、层、优先级、状态、下一步、依赖/决策；没有“下一步”的条目不算 TODO。
3. **完成即改状态**：完成项不单独维护；直接在总表把状态改为 `已完成`，并在“下一步”写完成提交/时间。
4. **定期清理**：每次设计系统发布、至少每月一次；已完成的旧项与过期项在清理时归档或删除，总表只保留近期完成项。
5. **不是日志**：版本历史写 [`CHANGELOG.md`](CHANGELOG.md)；本文件只回答“设计系统现在最该做什么”。
