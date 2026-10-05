# LiveFab 门户 · 多阶段构建
#
# 为什么需要 Dockerfile 而不是"直接跑 nginx 挂静态页"：
#   门户要显示**已登录身份**，身份来自 Caddy 注入的请求头 → **必须服务端渲染**（SSR）。
#   静态页面读不到请求头。所以它是一个真正的 Node 服务，不是一组静态文件。
#
# 为什么在镜像里构建而不是本地构建后拷进去：
#   本机沙箱禁止包管理器写临时目录（EPERM）；而 Docker 构建走默认网络、不受影响。
#   而且镜像内构建才是可复现的路径——不依赖"我这台机器恰好装好了依赖"。

FROM node:22-alpine AS build
WORKDIR /app
# 先只拷 manifest，让依赖层可缓存（改页面不必重装依赖）
COPY package.json ./
COPY astro.config.mjs tsconfig.json ./
RUN npm install --no-audit --no-fund
# 再拷源码
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
# 只带运行需要的东西：产物 + 依赖 + manifest
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
# Astro 的 node standalone 适配器产物入口
CMD ["node", "./dist/server/entry.mjs"]
