#!/bin/bash
# LiveFab · 单实例 PostgreSQL 的初始化脚本（L12 方案 A）
#
# ⚠️ 为什么需要它：官方 postgres 镜像的 `POSTGRES_DB`/`POSTGRES_USER` 只能建**一个**库与一个用户。
#    方案 A 要把 Authelia 与 NodeBB 合到一个 PG 实例上，所以第二个库必须自己建。
#
# 触发时机：**仅在数据目录为空时执行一次**（官方镜像的 /docker-entrypoint-initdb.d 语义）。
#    所以改这个脚本**不会**对已有数据卷生效——要重新初始化必须删卷。
#
# 幂等性说明：本脚本本身不做 if-not-exists 判断，因为官方只在首次初始化时调用它；
#    但为了安全（例如卷半初始化），仍用 DO 块做了存在性判断。

set -e

echo "[init] 为 NodeBB 创建独立库与用户（与 Authelia 共用同一个 PG 实例）"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- NodeBB 用独立用户与独立库，与 Authelia 互不可见
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nodebb') THEN
            CREATE ROLE nodebb LOGIN PASSWORD '$NODEBB_DB_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

# CREATE DATABASE 不能在 DO 块里执行，故单独判断
if ! psql -tAc "SELECT 1 FROM pg_database WHERE datname='nodebb'" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" | grep -q 1; then
    createdb --username "$POSTGRES_USER" --owner nodebb nodebb
    echo "[init] 已创建数据库 nodebb（owner=nodebb）"
else
    echo "[init] 数据库 nodebb 已存在，跳过"
fi

echo "[init] 完成。当前库列表："
psql -tAc "SELECT datname FROM pg_database WHERE datistemplate = false" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
