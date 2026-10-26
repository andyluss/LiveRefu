# 04 · Web 优先实现

> 青橙全栈 · 技术框架提案 ｜ 状态：提案 / 未实现 ｜ 日期：2026-10-26 13:24
> 这一篇把“第一版 Web 全栈”落到具体选型与实现路径；不是最终代码。

## 一、运行时：Node 第一，Bun 可选

**推荐：核心跑 Node 24 LTS；Bun 作为可选 adapter/开发运行时。**

理由来自工作区实测：

- 网站构建产物在 Bun 1.4.0 下曾触发 `NAPI FATAL ERROR`（SIGABRT）；
- 同一产物用 Node 跑正常；
- Node 的 `Request`/`Response`/`node:sqlite`/生态更稳；
- Bun 的开发速度和单文件部署仍然有价值，但不能让核心依赖它的实验性行为。

实现：

- 核心只用 Web 标准 + Node 24 API；
- `runtime/node.ts` 用 `node:http` 适配 `Request`/`Response`；
- `runtime/bun.ts` 用 `Bun.serve`；
- 不在核心 `import 'bun:*'` 或 `import 'node:*'`（除 adapter）；
- CI 至少跑 Node；Bun 作为兼容性 job。

## 二、HTTP / 路由

**推荐：自研薄 router，不引入 Express/Hono/Fastify。**

范围：

- 方法 + 路径匹配（静态/参数/通配）；
- `GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS`；
- 中间件链（安全头/session/CSRF/日志）；
- 404/405/错误边界；
- 请求体限制、cookie、redirect、stream；
- 路由表可打印（`qc doctor`）。

不自己写：

- HTTP 解析（用 runtime）；
- TLS/反向代理（用部署层）；
- WebSocket（后续）。

规模目标：核心 router ≤ 500 行（不含测试），可读、可替换。

## 三、渲染：HTML-first + 可选 islands

**推荐：服务端 HTML 模板 + 表单；客户端交互按 island 挂载；不做全站 SPA。**

- `html` tagged template 自动转义；
- 页面/布局/组件都是函数；
- 表单直接 POST 到 action；
- 需要交互时：
  - 优先原生 JS/Web Components；
  - 可选 Preact/Vue island adapter；
  - 不强制客户端路由。

为什么：

- 首屏快、SEO 好、可访问性更稳；
- 依赖少、心智少；
- 大部分网站/后台/内容应用不需要 SPA；
- 复杂交互可以局部升级。

流式渲染：第一版可先整页；P2 再支持 `renderToStream`。

## 四、数据：SQLite 第一，SQL-first

**推荐：SQLite + 明确迁移 + typed helper；不用 Prisma/Drizzle 作为核心。**

- 默认 `data/app.db`；
- 开发/测试独立文件；
- 迁移是 SQL 文件/DSL 输出，可审、可回滚/forward-only；
- 查询 API：
  ```ts
  db.query<T>('select ... where id = ?', [id])
  db.insert('posts', {...})
  db.transaction(async tx => {...})
  ```
- 复杂查询直接 SQL；不强行 query builder；
- Postgres adapter 后续实现同一接口。

SQLite 驱动选项：

| 选项 | 优点 | 风险 |
| --- | --- | --- |
| `node:sqlite`（Node 24） | 平台内置、零依赖 | API 仍较新，需版本约束 |
| `bun:sqlite` | Bun 原生、快 | 仅 Bun，违背 Node 优先 |
| `better-sqlite3` | 成熟、同步、生态好 | 原生模块/编译/ABI，Bun 曾有 NAPI 问题 |
| **推荐：`node:sqlite` 优先，`better-sqlite3` 作为兼容 adapter** | 零依赖 + 成熟后备 | 需要两套 adapter 测试 |

## 五、Auth：内置 session，OAuth 可选

- session id 随机、HttpOnly/SameSite=Lax/Secure（生产）；
- session 存 SQLite；过期/轮换/注销；
- 密码哈希用 `argon2id`（成熟库），不自己写；
- CSRF：表单 token + SameSite；API 用 header token；
- 登录失败限流；错误不泄露账号是否存在；
- OAuth/OIDC 通过 adapter；
- 角色/权限在应用层，框架只提供 `requireUser/requireRole`。

不第一版做：SSO、SCIM、多租户计费、Magic Link 全家桶。

## 六、校验：Standard Schema 接口 + 默认 adapter

- 定义 `StandardSchema` 兼容接口（Zod/Valibot 等可实现）；
- 默认带一个轻量 validator（或选 Zod 作为默认 adapter）；
- 表单错误结构统一：`{ field: message }`；
- 服务端永远再校验一次；客户端校验只是体验。

推荐：**接口自有，默认用成熟 validator**；不自己写正则/类型推断引擎。

## 七、构建与开发

- `qc dev`：启动 Node 进程 + 文件监听 + 重启；HTML/CSS 改动快速反馈；
- `qc build`：esbuild 打包 server entry + 复制 public + 生成 manifest；
- CSS：标准 CSS + LRDS token；不强制 Tailwind/PostCSS；
- 资源：内容哈希、缓存头；
- 产物：
  ```text
  dist/
  ├── server.mjs
  ├── public/
  └── manifest.json
  ```
- `qc start` 读取 manifest，启动 Node；
- 不在生产做运行时代码生成。

HMR：第一版可只做整页刷新；island HMR 后置。

## 八、部署

默认：

```text
Internet → Caddy/Nginx → Node (qc start) → SQLite file
```

- 单进程；水平扩展时 SQLite 换 Postgres/共享存储；
- Dockerfile 由 `qc build` 生成/模板提供；
- 健康检查 `/health`；
- 备份 `data/app.db`（WAL checkpoint）；
- 不在第一版做 serverless/edge。

## 九、安全默认值

- HTML 自动转义；raw 需显式；
- 安全头（CSP 可配置，默认保守）；
- CSRF、SameSite、HttpOnly；
- 请求体大小限制；
- SQL 参数化；
- 上传类型/大小/路径限制；
- 错误页不泄露堆栈；
- 依赖审计/锁文件；
- 密钥只从 env/secret 文件读取，不写仓库。

## 十、性能

- SSR HTML + 静态资源缓存；
- 数据库索引/查询计划可查看；
- 连接复用；
- 避免每请求 new 框架对象；
- 基准：首页 TTFB、1000 次 CRUD、冷启动；
- 不追“跑分”，先追“不慢得莫名其妙”。

## 十一、与现有项目的关系

- 不重写网站/LiveFab；
- 先做 **并行新应用** 或 **子路径/子域**；
- 内容型页面可从 Nuxt/Astro 迁移；
- 迁移按页面/路由逐步，不搞大爆炸；
- 现有 LRDS token/组件直接复用。

## 十二、第一版依赖预算（提案）

| 依赖 | 用途 | 是否核心 |
| --- | --- | --- |
| TypeScript | 类型/构建 | dev |
| esbuild | 打包 | dev |
| `node:sqlite` | 数据库 | 平台 |
| argon2/bcrypt | 密码哈希 | 核心（可替换） |
| 默认 validator | 校验 | 核心（可替换） |
| 无 | HTTP 框架 | —— |

目标：运行时核心依赖 **≤5**；每个都有“为什么不用平台原语”的说明。
