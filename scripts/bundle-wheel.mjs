import { statSync } from 'node:fs';
const filename = 'biodata_search_mcp-0.2.0-py3-none-any.whl';
const wheel = new URL(`../backend/${filename}`, import.meta.url);
if (!statSync(wheel).isFile()) {
  throw new Error(`缺少 Python 后端安装包 ${filename}`);
}
