# LiveFile Changelog

## [0.3.0] - 2026-10-28 07:30

### Added

- **批量补元数据**：Items 页勾选多个条目，一次补来源/许可/集合/标签/保留；`POST /api/items/batch`，只改 sidecar，不动原文件。
- 新增 [`docs/04_商品化路径.md`](docs/04_商品化路径.md)：Archive Book 未来提案；未实施、未排期。
- 新增跨项目 [`DOGFOOD.md`](../DOGFOOD.md) 与 `04` 狗粮计划：9 个未来案例、Wave 1–3、反馈回路；未启动。
- `04_商品化路径.md` 增加 3 个目标产品案例：家庭档案书、研究者田野档案书、自由职业者作品档案书。

### Changed

- `node:test` 从 6 项增至 7 项（批量元数据）。
- 家庭共享/权限/托管继续搁置。
- 保留期审计、继承包、恢复演练向导留到 v0.4。

## [0.2.0] - 2026-10-27 14:00

### Added

- v0.1 baseline：本地 archive 索引、sidecar、搜索/时间线/集合、健康/备份/继承、三种导出、CLI；示例 archive 10 条目。
- 元数据编辑：标题/类型/日期/来源/许可/保留/集合/标签/public，写回 sidecar。
- 未整理条目可补 sidecar；原始文件不动。
- 重复内容分组（hash），只提示不自动合并。
- 本地备份：复制 archive、写 `backup-manifest.json`、逐文件 hash 校验。
- 恢复校验：只读验证备份，不覆盖当前档案；记录恢复演练时间。
- 公开页：只导出 `public:true` 的条目，图片内嵌，可独立打开。
- CLI：`backup-run` / `restore-check` / `public`。
- Web：健康页重复分组、备份/恢复面板；条目录入编辑表单。
- 示例 archive 增至 11 条目，含 1 组重复。

### Changed

- 版本 0.2.0；健康分 84/100（0 errors / 4 warnings）。
- 家庭共享/权限、定时备份、批量导入留到 v0.3。
