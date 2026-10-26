# Notes · 青橙全栈 P1 示例

最小可运行示例：文件路由、SQLite、迁移、HTML 表单、动作、布局，以及 P2 的注册/登录/CSRF/个人笔记。

```bash
npm run db:migrate
npm run dev
# http://127.0.0.1:3100
```

或：

```bash
npm run doctor
npm test
```

范围：P3 核心；邮箱/OAuth/上传/部署在 P4。先注册账号，再创建笔记；每个用户只看到自己的笔记。数据库文件在 `data/app.db`（已忽略）。

生产构建：

```bash
npm run build
npm start      # 自动使用 dist/server.mjs
# 默认 DB 在 dist/data/app.db；持久化请设置 QC_DB_PATH
```
