# 07 · 统一身份（OIDC）：进度、踩过的坑与剩余阻塞

> 状态：**✅ 全部打通并端到端实测**（Authelia OIDC Provider + NodeBB 统一登录）｜ 2026-10-05

## 一、为什么要做这件事

M1 的验收里有一条：**「用同一个账号发一条工单/帖」**。
但 NodeBB 一直用它自己的账号体系（实测：只有默认插件、**无任何 OIDC/SSO 插件**，
`/register` 匿名可开），所以**这条验收其实没达成**——这是本轮要补的缺口。

做法：让 **Authelia 从"网关鉴权"升级为"统一身份源"**（开 `identity_providers.oidc`），
NodeBB 用 OIDC 插件接进来。这样才谈得上"一个账号走遍全场"。

## 二、Authelia 侧：✅ 已完成并实测

实测结果（经 Caddy 反代）：

```
GET https://auth.livefab.localhost/.well-known/openid-configuration   → 200
  issuer:                 https://auth.livefab.localhost
  authorization_endpoint: https://auth.livefab.localhost/api/oidc/authorization
  token_endpoint:         https://auth.livefab.localhost/api/oidc/token
  userinfo_endpoint:      https://auth.livefab.localhost/api/oidc/userinfo
  scopes_supported:       [offline_access, openid, profile, email, address, phone, groups]

GET https://auth.livefab.localhost/jwks.json  → RS256 公钥（kid: a43825-rs256）
```

配置经**真实 Authelia**（`config validate`）验证通过。
客户端 `nodebb` 的密钥用**哈希**存储（明文会有弃用警告），跳转地址为
`https://forum.livefab.localhost/auth/fusionauth-oidc/callback`。

## 三、★ 踩过的坑（每条都是真启动才暴露，且**推翻了我先前的一些诊断**）

### 3.1 `{{ secret }}` 模板**默认不启用**（这条影响最大）

Authelia 的配置模板是**实验性过滤器**，默认关闭。

| 未开启过滤器 | 开启后 |
| --- | --- |
| `{{ secret "/s/x" }}` **作为字面量**原样传下去 | 真的去读文件 |
| 报错：`option 'level' must be one of ... but it's configured as '{{ secret "/s/lvl" }}'` | 正常求值 |

**这推翻了我先前写进文档的一个诊断。** 我原先写的是
「`{{ secret }}` 在文件缺失时静默返回空值」——**那是误判**。
真因是模板根本没启用，字面量被当成了值，于是数据库密码成了那串字面量。

启用方式：给 authelia 加 `--config.experimental.filters template`（已写进 compose）。

> 现在两套机制并存、各有用途：密钥文件用 `AUTHELIA_*_FILE` 环境变量（不依赖模板，最稳）；
> 需要嵌进 YAML 结构的值（OIDC 的 JWKS 密钥）用 `{{ secret }}`。

### 3.2 `--config=...` 的等号形式会让容器**起不来**

镜像 entrypoint 第 10 行：

```sh
if [ -n "$1" ] && [ "$1" != "--config" ]; then exec "$@"; else exec authelia "$@"; fi
```

写成 `--config=...` 时 `$1` 不等于 `--config`，于是走了 `exec "$@"` 分支，
把参数当**命令**执行 → 反复重启并报 `entrypoint.sh: exec: line 10: illegal option --`。
**必须用空格分隔形式**（`command: [--config, /path, --config.experimental.filters, template]`）。

### 3.3 注释里的 `{{ }}` 也会被**执行**

Go 模板不认 YAML 的 `#` 注释。我在注释里写了 `{{ secret "path" }}` 作为**说明文字**，
结果模板引擎真的去 `open path` → 配置加载失败。

**解**：注释里不要出现 `{{ }}`，写成 `secret` 模板函数即可。

### 3.4 JWKS 密钥：**必须内联为 YAML 块标量**，且要自己缩进

三种写法都被真实 Authelia 拒绝过：

| 写法 | 报错 |
| --- | --- |
| 单引号标量 `'...'` 里放多行 PEM | `either no PEM block was supplied or it was malformed` ← YAML 把多行**折成一行**（换行变空格） |
| base64 | `symmetric keys are not permitted for signing` ← 它把 base64 解出来当对称密钥 |
| 文件路径 | `illegal base64 data at input byte 0` ← 它先当 base64 试 |

**正解**：`key: |` 块标量 + 由 `authelia-prep` 用 `awk` 把 PEM **逐行加上一致缩进**注入。

### 3.5 `authelia crypto pair rsa generate --directory` 不会自己创建目录

不 `mkdir -p` 就**静默失败**（我把它 `>/dev/null` 了），表现为密钥卷里少一个文件。
已补 `mkdir` **并加失败即报错**，避免再次静默。

### 3.6 Bash：变量后紧跟中文全角字符会被并进变量名

`echo "$VER（宿主机…）"` → `VER（: unbound variable`。
因为 bash 把多字节字符也当成变量名的一部分。**必须写 `${VER}`**。
这个坑让取包脚本连续失败了两次。

### 3.7 **删掉密钥卷 = 数据库作废**

为了重新生成 OIDC 密钥，我删了 `authelia_secretview` 卷 ——
于是 `storage` 加密密钥被重新生成，而**数据库里记的是旧密钥**，Authelia 直接
`the configured encryption key does not appear to be valid for this database` 起来就崩。

**教训**：密钥必须与数据库**一起**备份（[`tools/backup.ts`](../tools/backup.ts) 已覆盖该卷并注明）。
本次靠重建 authelia 库解决（开发环境无损失；生产上这会是事故）。

## 四、NodeBB 侧：✅ 已打通（附四个真陷阱）

### 4.1 已做成的部分

| 项 | 状态 |
| --- | --- |
| 插件选型 | `nodebb-plugin-fusionauth-oidc@2.0.0`（BSD-2，"any OpenID Connect identity provider"） |
| 取包与校验 | 宿主机取 tarball 并核对 **sha1 == registry 公布值**（见 [`deploy/nodebb/fetch-plugin.sh`](../deploy/nodebb/fetch-plugin.sh)） |
| 镜像 | [`deploy/nodebb/Dockerfile`](../deploy/nodebb/Dockerfile) 预装插件及依赖，构建成功 |
| 激活与配置 | `nodebb-setup` 直接写库（`plugins:active` zset + `settings:<id>` hash），实测输出 `OIDC 插件已激活并配置` |

### 4.2 ★ 四个真陷阱（每一个都真的拦住过，逐个定位才通过）

**① 官方镜像的匿名卷遮住 COPY 的文件**

官方 NodeBB 镜像用 `VOLUME` 声明了 `/usr/src/app/node_modules` 为**匿名卷**。
它**遮住**我在派生镜像里 COPY 进去的插件 —— 镜像里 579 个包、匿名卷里 576 个，
差的正是我新加的 3 个。**"我在 Dockerfile 里 COPY 了"不等于"运行时文件在那里"。**

**② entrypoint 每次启动都跑 `npm install`**

镜像的 `main()` **无条件**调用 `install_dependencies`（无开关），
它把 `/opt/config/package.json` 软链进来、按依赖清单**裁剪**多余包。
所以"直接塞 node_modules"必然被清掉 —— 必须让插件成为**被声明的依赖**。

**③ 容器无外网 → 声明的依赖也装不上**

nodebb 只有 `internal` 网络（`internal: true`），拉不到 npm。

> ①②③ 的合解：把插件打成**自带依赖的 tarball**（npm 的 `bundledDependencies` 机制），
> 放进镜像，再由 `nodebb-setup` 声明为 `/opt/config/package.json` 的 **`file:` 依赖**。
> 这样那次 `npm install` 可以**完全离线**装好它——依赖已在 tarball 内。
> 实测：插件目录出现、`is active but not installed` 归零。

**④ 插件的设置命名空间**不是插件 id

插件源码里是 `new Settings("fusionauth-oidc", ...)`，所以要写
**`settings:fusionauth-oidc`**，而不是 `settings:nodebb-plugin-fusionauth-oidc`。
写错键的表现是插件只打 `OpenID Connect will not be available until it is configured!`、
登录路由 404 —— 而**键看起来完全合理**，很容易误判成"配置没生效"。

### 4.3 ★ 还差半步就成功的一处：服务端换 token 的两个前提

OIDC 的 token 换取是**服务端到服务端**调用：NodeBB 要 POST 到
`https://auth.<域>/api/oidc/token`。容器里有两个坑：

| 问题 | 现象 | 解法 |
| --- | --- | --- |
| 解析不了 `*.localhost` | `EAI_AGAIN` | 给 **Caddy 加公开域名的网络别名**（`networks.internal.aliases`），容器内即解析到 Caddy |
| 不信任 Caddy 的内网 CA | `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | 挂载 `caddy/ca/root.crt` 并设 `NODE_EXTRA_CA_CERTS` |

**最后一个坑（最隐蔽）**：`client_secret` 的 **plaintext 前缀**。
我先把占位符换成了哈希，却**忘了删模板里原有的前缀**，于是渲染出：

```yaml
client_secret: '$plaintext$$pbkdf2-sha512$310000$JuP...'
```

Authelia 把这整串当**明文**比对，换 token 报
`The provided client secret did not match the registered client secret.`
——报错只说"不匹配"，**不会告诉你是因为多了个前缀**。

### 4.4 ✅ 端到端实测结果

完整授权码流程实测通过：

```
① GET /auth/fusionauth-oidc            → 302 跳 Authelia 授权端点
② 未登录访问授权端点                     → 303 跳登录页（flow=openid_connect）
③ POST /api/firstfactor（admin）        → 200
④ 再访问授权端点                         → 302 带 code 跳回论坛回调
⑤ 论坛回调换 token                      → 307 → https://forum.livefab.localhost/
```

**身份确实统一**（这是 M1 验收「用**同一个账号**」的实证）：

```
NodeBB 库里：fusionauth-oidcId:uid = {"38e20de0-8b94-4da0-baa3-82598f8f1593": 1}
→ Authelia 的 admin（OIDC sub 38e20de0-…）登录论坛后就是 uid 1 = admin
```

首次 OIDC 登录时 NodeBB 会要求补全资料（`/register/complete`），
这是它自己的正常流程，不影响身份统一。

## 五、修订记录

| 版本 | 日期 | 变更 | 依据 |
| --- | --- | --- | --- |
| v0.1 | 2026-10-05 | 立文档：Authelia OIDC 完成并实测；记录 7 个真实坑（含**推翻先前对 `{{ secret }}` 的误判**）；NodeBB 侧阻塞于"匿名卷遮蔽 + entrypoint 每次 npm install + 容器无外网"三层原因，给出三个候选解法 | 用户要求接管 M0/M1 遗留项 ④ |
| v0.2 | 2026-10-05 | **NodeBB 侧从"阻塞"改为"已打通"**：记录四个真陷阱（匿名卷遮蔽 / entrypoint 每次 npm install / 容器无外网 / 设置命名空间不是插件 id）、服务端换 token 的两个前提（域名别名 + 信任内网 CA）与最隐蔽的 plaintext 前缀坑；补端到端实测结果与身份关联证据 | 本轮实测通过 |
