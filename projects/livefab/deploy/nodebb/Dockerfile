# NodeBB + OIDC 插件（M1「用同一个账号发帖」的落地）
#
# ★ 为什么插件要在**构建期**装、而不能运行时装：
#   本栈的 nodebb 只接 `internal` 网络（`internal: true`），**运行时没有外网**
#   —— 实测 fetch('https://registry.npmjs.org/...') 报 EAI_AGAIN。
#   所以插件必须预先烤进镜像（构建走默认 bridge，有外网）。
#
# ★ 为什么不再往 node_modules 里 COPY 插件目录：
#   官方镜像用 `VOLUME` 把 /usr/src/app/node_modules 声明为**匿名卷**，
#   它会**遮住**派生镜像里 COPY 进去的文件；而且 entrypoint 每次启动都跑
#   `npm install`（main() 里无条件调用），按 /opt/config/package.json 裁剪多余包。
#   所以"塞进 node_modules"必然被清掉。
#
# ★ 正解：把插件打成**自带依赖的 tarball**（npm 的 bundledDependencies 机制），
#   放进镜像；再由 nodebb-setup 把它声明为 /opt/config/package.json 的
#   `file:` 依赖。这样 entrypoint 那次 npm install 可以**完全离线**装好它
#   ——依赖已在 tarball 内，无需访问 registry。
#   tarball 由 fetch-plugin.sh 生成（含 sha1 核对）。
FROM ghcr.io/nodebb/nodebb:4.16

# 放进一个稳定路径，供 /opt/config/package.json 用 file: 引用
COPY vendor/nodebb-plugin-fusionauth-oidc-2.0.0-livefab.tgz /opt/plugin/nodebb-plugin-fusionauth-oidc.tgz

# 插件的**激活**与**配置**不在构建期做——存在 NodeBB 数据库里，
# 由 nodebb-setup 在启动时写入（见 deploy/compose.yml）。
