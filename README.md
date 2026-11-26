# BioData Search for DeepSeek Harness

在 DeepSeek Harness 中按关键词检索生物数据，或按编号读取记录详情。搜索可选择 NGDC、NCBI、Europe PMC、UniProt 和 RCSB PDB，结果包含原始记录链接。

## 安装

需要 Node.js 24.9 或更高版本和 DeepSeek Harness 0.2.2-rc.5 或更高版本，已在 0.2.2-rc.5 验证。插件内含 Python 后端 0.2.0，首次启动时，uv 会准备 Python 3.11 或更高版本的运行环境并安装依赖。请先安装包含 `uvx` 的 uv。[uv 安装说明](https://docs.astral.sh/uv/getting-started/installation/)

桌面 App 使用 `desktop` profile。在 App 的 **Plugins → Add plugin** 中输入以下 GitHub 版本地址。

```text
github:bei7777/dsh-plugin-biodata-search#v0.2.1
```

也可以完全退出桌面 App 后，通过终端安装，再重新打开 App。执行前检查 `dsh --version`，CLI 应与桌面 App 版本一致。安装器根据当前执行的 CLI 版本检查兼容性。CLI 低于 0.2.2-rc.5 时需要更新 CLI。

```sh
dsh --version
dsh plugin --profile desktop add github:bei7777/dsh-plugin-biodata-search#v0.2.1
```

Web 界面使用 `web` profile，终端界面使用 `tui` profile。各 profile 独立安装插件。

```sh
dsh plugin --profile web add github:bei7777/dsh-plugin-biodata-search#v0.2.1
dsh web
```

npm 安装前，使用官方 registry 检查版本已经发布。

```sh
npm view dsh-plugin-biodata-search@0.2.1 version --registry=https://registry.npmjs.org/
```

只有返回 `0.2.1` 后，才使用 `dsh plugin --profile desktop add dsh-plugin-biodata-search@0.2.1`。返回 404 或仅列出 `0.0.0-stage` 表示发布审批尚未完成，请使用上面的 GitHub 版本地址。

DSH 进程的 `PATH` 需要包含 `uvx`。桌面 App 从 Finder 启动时可能使用不同的环境，可以在 BioData Search 的 MCP 配置 `env` 中设置 `BIODATA_SEARCH_UVX`，值为 `uvx` 的绝对路径，例如 `/Users/你的用户名/.local/bin/uvx`。如果已经安装 Python 后端 0.2.0，可以设置 `BIODATA_SEARCH_EXECUTABLE` 为后端可执行文件的绝对路径。启动失败会报告缺失程序及配置方法。

## 使用

| 工具 | 调用示例 |
| --- | --- |
| `mcp__biodata__list_databases` | `{"providers":["uniprot","rcsb"]}` |
| `mcp__biodata__search_records` | `{"query":"hemoglobin","providers":["uniprot","rcsb"],"limit":2}` |
| `mcp__biodata__get_record` | `{"database":"uniprot:uniprotkb","identifier":"P69905"}` |

也可以直接对 DSH 说：“在欧洲的 Europe PMC 查找有关水稻开花的文献，返回三条并保留原文链接。”

机构标识为 `ngdc`、`ncbi`、`europepmc`、`uniprot` 和 `rcsb`。`databases` 可用于指定更具体的数据库，例如 `ncbi:gds` 或 `ngdc:omix`。要为后续会话设置默认来源，可在启动 DSH 前设置环境变量。

```sh
export BIODATA_SEARCH_PROVIDERS=uniprot,rcsb
dsh web
```

未设置默认来源时，关键词查询使用 NGDC 的 GSA、OMIX 和 NCBI 的 BioProject、GEO DataSets、PubMed。`limit` 和 `offset` 分别控制每个数据库的页大小和起始位置。

插件采用 DSH 配置 bundle，通过 `cordis.patch.yml` 使用宿主提供的官方 MCP 客户端，完成工具发现、参数传递和子进程管理。独立启动脚本处理可执行文件检查及 Python 的 IPv6 代理例外格式。官方客户端采用 MIT 许可证，由 DSH 分发。[DSH MCP 客户端说明](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/mcp/mcp-client)

## 从源码打包

仓库的 `backend/` 包含 Python wheel。在仓库根目录执行 `npm test` 检查启动错误及代理地址处理，再执行 `npm pack` 生成 npm 安装包。发布前运行的 `prepack` 会检查该后端文件。

插件版本与 Python 后端版本独立管理。更新后端时，从 MCP 仓库检出对应版本，运行 `uv build --wheel`，将 wheel 放入 `backend/`，同步 `package.json` 的文件清单、`launcher.mjs` 和 `scripts/bundle-wheel.mjs` 中的文件名。[Python MCP 后端源码](https://github.com/bei7777/biodata-search-mcp)

执行 `node tests/live.mjs <安装包.tgz>` 会创建独立的 DSH profile，通过真实安装器安装发行包，检查关闭 peer 自动安装且 profile 中没有 MCP 客户端时仍能注册工具，并实际查询 UniProt、RCSB PDB 和 Europe PMC。可用 `DSH_BIN` 指定 CLI 路径，用 `BIODATA_TEST_DIR` 指定测试目录。测试需要网络连接。
