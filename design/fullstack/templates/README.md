# 部署模板

P4 提供最小 Docker 模板：

```bash
# 在应用根目录
qc build
docker build -t my-app -f /path/to/qc/templates/Dockerfile dist
docker run -p 3000:3000 -v my-data:/data -e QC_DB_PATH=/data/app.db my-app
```

或把 `Dockerfile` 复制到应用根目录、`compose.yml` 放在应用根目录，再 `docker compose up -d`。

- `dist/` 作为构建上下文，包含 `server.mjs`、迁移、静态资源。
- 数据库在 `/data/app.db`；必须挂载卷。
- 健康检查走 `/health`。
- 备份：`qc db backup backup.db`；恢复：`qc db restore backup.db --force`。
