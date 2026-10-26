# 青橙全栈 · 收尾待办

> 状态：**青橙全栈暂时收尾**（P1–P17 核心/发布准备完成）｜ 日期：2026-10-26 14:42
> 原则：核心框架不再继续加功能；以下事项需要外部条件或独立立项。

## 一、立即（需要你决策）

| # | 事项 | 说明 | 依赖 |
| --- | --- | --- | --- |
| T01 | 推送 P5–P18 | 当前本地 ahead 14；先让远端有完整历史 | 网络 |
| T02 | 跑真实 CI | `.github/workflows/qc.yml` 在 GitHub Actions 跑一次 | T01 |
| T03 | 定 npm registry/访问级别 | 公共 npm / GitHub Packages / 私有 | 你的账号 |
| T04 | 发布 `@qingcheng/qc@0.1.0` | `npm publish`；发布后验证远程 `qc new` | T03 |
| T05 | 决定是否独立立项 HMR | 组件级 HMR 需要客户端运行时/HMR 协议 | 你 + 独立排期 |
| T06 | 提供真实 SMTP 服务 | 做 STARTTLS/DKIM/退信测试 | 域名/邮箱 |

## 二、发布后（工程项）

| # | 事项 | 说明 |
| --- | --- | --- |
| T07 | 远程 `qc new` | 从 registry 安装，不再依赖本机 file/symlink |
| T08 | TypeScript 声明 | 预编译包补 `.d.ts`，编辑器类型提示 |
| T09 | SMTP STARTTLS/DKIM | 真实服务验证；本地 fake 只能测明文/隐式 TLS |
| T10 | 组件级 HMR | 独立项目；当前只有整页自动刷新 |
| T11 | S3 校验失败重试/分片恢复 UI | 已有 checksum/checkpoint/限速；补校验失败重试与暂停/恢复 |
| T12 | 扫描器/图片解码 | 接 ClamAV/外部服务；当前只有 `scan` 钩子 |
| T13 | OAuth 多 key 元数据/自动重加密 | 已有 `previousTokenKeys`；补轮换编排 |
| T14 | Postgres adapter | 第一版 SQLite；多实例/大文件后再做 |
| T15 | 移动/游戏/CLI adapter | 按 `05_多端扩展.md` 的触发条件，不先做 |

## 三、可选（不阻塞收尾）

| # | 事项 |
| --- | --- |
| T16 | guestbook 的 auth 版本 |
| T17 | 第三个以上 dogfood / 真实项目迁移 |
| T18 | 镜像发布/日志采集/备份自动化 |
| T19 | 设计系统 kits 与全栈 UI 的进一步合并 |

## 四、恢复开发时先读

1. [`06 路线图与验收`](design/06_路线图与验收.md)
2. [`09 发布检查`](design/09_发布检查.md)
3. [`25 P17 实现记录`](implementation/25_P17实现记录.md)
4. 本 TODO 的 T01–T06

> 收尾不是完成所有事，而是把“还能做什么”从聊天里搬到可恢复的清单里。
