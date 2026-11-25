import { statSync } from 'node:fs';
import metadata from '../package.json' with { type: 'json' };

const filename = `biodata_search_mcp-${metadata.version}-py3-none-any.whl`;
const wheel = new URL(`../backend/${filename}`, import.meta.url);
if (!statSync(wheel).isFile()) {
  throw new Error(`缺少 Python 后端安装包 ${filename}`);
}
