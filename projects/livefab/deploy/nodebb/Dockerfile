# NodeBB + OIDC 插件（M1「用同一个账号发帖」的落地）
#
# ★ 为什么插件要在**构建期**装、而不能运行时装：
#   本栈的 nodebb 只接 `internal` 网络（`internal: true`），**运行时没有外网**
#   —— 实测 fetch('https://registry.npmjs.org/...') 报 EAI_AGAIN。
#   而插件必须从 npm 装。所以只能预先烤进镜像（构建走默认 bridge，有外网）。
#
# ★ 为什么用**预先 vendor 好的目录**、而不在这里 `npm install`：
#   本机代理做 TLS 中间人，构建时 npm 直连 registry 会报
#     npm error code ERR_TLS_CERT_ALTNAME_INVALID
#     ... Cert does not contain a DNS name
#   与其在构建里关掉 TLS 校验（削弱供应链安全），不如让宿主机取包并校验，
#   构建只负责 COPY。取包脚本：./fetch-plugin.sh（含 sha1 核对）。
#
# ★ vendor/ 的布局是**手工摆的**，不是照搬宿主机 node_modules：
#   插件依赖 uid2@0.0.4，而 NodeBB 自带 uid2@1.0.0。npm 的正确解法是把 0.0.4
#   **嵌套装进 passport-oauth2/node_modules/**，而不是覆盖根上的 1.0.0——
#   否则可能弄坏 NodeBB 自己的依赖。fetch-plugin.sh 显式复现了这个布局。
FROM ghcr.io/nodebb/nodebb:4.16

# 镜像 WORKDIR=/usr/src/app、USER=nodebb(1001)。
# 只拷 NodeBB **没有**的那几个包，避免覆盖它自带的版本（async/base64url/
# passport-strategy/utils-merge 版本已一致，无需重复拷贝）。
COPY vendor/node_modules/nodebb-plugin-fusionauth-oidc /usr/src/app/node_modules/nodebb-plugin-fusionauth-oidc
COPY vendor/node_modules/oauth /usr/src/app/node_modules/oauth
COPY vendor/node_modules/passport-oauth2 /usr/src/app/node_modules/passport-oauth2

# 插件的**激活**与**配置**不在构建期做——它们存在 NodeBB 数据库里，
# 由 nodebb-setup 在启动时写入（见 deploy/compose.yml）。
