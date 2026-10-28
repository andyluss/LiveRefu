# LiveAtelier CI 模板

> 复制到项目 CI；路径按仓库结构调整。LiveAtelier 本身不接云、不上传。

| 文件 | 用途 |
| --- | --- |
| [`github-actions.yml`](github-actions.yml) | GitHub Actions 的 `livedso` job |
| [`gitlab-ci.yml`](gitlab-ci.yml) | GitLab CI 的 `livedso` job |

共同点：

- Node 24；
- 工作目录 `design/projects/livedso`；
- 运行 `node src/cli.ts ci --strict --adopt ../../design --out reports/ci.md`；
- 报告作为 artifact。

详见 [`../docs/06_CI集成.md`](../docs/06_CI集成.md)。
