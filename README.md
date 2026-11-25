# BioData Search for DeepSeek Harness

在 DeepSeek Harness 中按关键词检索生物数据，或按编号读取记录详情。搜索可选择 NGDC、NCBI、Europe PMC、UniProt 和 RCSB PDB，结果包含原始记录链接。

## 安装

需要 Node.js 24.9 或更高版本、DeepSeek Harness 0.2.2-rc.5 兼容版本，以及能从 DSH 进程的 `PATH` 启动的 `uvx`。`uvx` 随 uv 安装。插件内含 Python 后端，首次启动时，uv 会准备 Python 3.11 或更高版本的运行环境并安装依赖。[uv 安装说明](https://docs.astral.sh/uv/getting-started/installation/)

```sh
dsh plugin --profile web add dsh-plugin-biodata-search
dsh web
```

对于终端界面，将命令中的 `web` 换成 `tui`。如果已经安装了相同版本的 BioData Search 后端，可以将 `BIODATA_SEARCH_EXECUTABLE` 设为其可执行文件的绝对路径，插件将直接启动它。

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

插件调用 DeepSeek Harness 官方 MCP 客户端完成工具发现、参数传递和子进程管理。该依赖通过 npm 安装，采用 MIT 许可证，再分发该依赖时保留其版权与许可声明。[DSH MCP 客户端说明](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/mcp/mcp-client)

## 从源码打包

仓库的 `backend/` 包含对应版本的 Python wheel。在仓库根目录执行 `npm pack` 即可生成 npm 安装包。发布前运行的 `prepack` 会检查该后端文件。

更新后端时，从下面的 MCP 仓库检出对应版本，运行 `uv build --wheel`，将生成的 wheel 放入 `backend/`，并同步 `package.json` 中的版本。可以用 `node tests/live.mjs <安装包.tgz>` 在隔离的 DSH 配置中进行实际查询验证。[Python MCP 后端源码](https://github.com/bei7777/biodata-search-mcp)
