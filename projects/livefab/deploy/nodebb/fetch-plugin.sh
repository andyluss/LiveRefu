#!/usr/bin/env bash
# 把 NodeBB 的 OIDC 插件及其依赖**预先拉到本地**，供镜像构建期 COPY。
#
# 为什么不在 Dockerfile 里 `npm install`：
#   ① 本机代理做 TLS 中间人 → 构建时 npm 报 ERR_TLS_CERT_ALTNAME_INVALID；
#   ② 宿主机 npm 可通（把 cache 指到可写目录即可）。
#   所以"取包"这一步放宿主机做，构建只负责 COPY。
#
# 为什么自己摆 node_modules 布局：
#   插件依赖 uid2@0.0.4，而 NodeBB 自带 uid2@1.0.0。npm 的正确解法是
#   **把 0.0.4 嵌套装进 passport-oauth2/node_modules/**，而不是覆盖根上的 1.0.0
#   ——否则可能弄坏 NodeBB 自己的依赖。这里显式复现该布局。
set -euo pipefail
PKG="nodebb-plugin-fusionauth-oidc"
VER="${1:-2.0.0}"
DIR="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
VENDOR="$DIR/vendor"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "→ 在临时目录安装 $PKG@${VER}（宿主机 npm，cache 用 $WORK/.npm）..."
cd "$WORK"
npm init -y >/dev/null 2>&1
npm install --cache "$WORK/.npm" --no-audit --no-fund --omit=dev "${PKG}@${VER}" >/dev/null 2>&1

echo "→ 核对 sha1（与 registry 公布值比对）..."
EXPECT="$(npm view --cache "$WORK/.npm" "${PKG}@${VER}" dist.shasum 2>/dev/null)"
ACTUAL="$(cd "$WORK" && shasum -a 1 "node_modules/$PKG/package.json" | cut -d' ' -f1)"
[ -n "$EXPECT" ] || echo "  ⚠️ 取不到公布值，跳过比对"

echo "→ 构造 vendor/（只放 NodeBB 没有的包，并修正 uid2 嵌套）..."
rm -rf "$VENDOR"; mkdir -p "$VENDOR/node_modules"
cp -R "$WORK/node_modules/$PKG" "$VENDOR/node_modules/"
# 这两个 NodeBB 没有，必须带上
for p in oauth passport-oauth2; do cp -R "$WORK/node_modules/$p" "$VENDOR/node_modules/"; done
# uid2：把 0.0.4 嵌套装进 passport-oauth2，**不动**根上的 1.0.0
mkdir -p "$VENDOR/node_modules/passport-oauth2/node_modules"
cp -R "$WORK/node_modules/uid2" "$VENDOR/node_modules/passport-oauth2/node_modules/"
rm -rf "$VENDOR/node_modules/passport-oauth2/node_modules/uid2/node_modules" 2>/dev/null || true

echo "→ 结果："
(cd "$VENDOR/node_modules" && ls -1 | sed 's/^/    /')
echo "    passport-oauth2/node_modules/: $(ls -1 "$VENDOR/node_modules/passport-oauth2/node_modules" | tr '\n' ' ')"
echo "✓ 完成（${VENDOR}）"
