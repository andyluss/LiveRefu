# 青橙全栈 P4 部署模板
# 构建：在应用根目录执行 `qc build`，然后用 `dist/` 作为构建上下文：
#   docker build -t my-app -f ../qc/templates/Dockerfile dist
FROM node:24-bookworm-slim AS runtime

WORKDIR /app
COPY . .

ENV NODE_ENV=production \
    QC_APP_ROOT=/app \
    QC_DB_PATH=/data/app.db \
    PORT=3000

RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
