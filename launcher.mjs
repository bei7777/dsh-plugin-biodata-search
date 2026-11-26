import { spawn } from 'node:child_process';
import { constants, accessSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pythonProxyEnvironment } from './proxy-env.mjs';

const executable = process.env.BIODATA_SEARCH_EXECUTABLE;
const uvx = process.env.BIODATA_SEARCH_UVX;
for (const [name, value] of Object.entries({ BIODATA_SEARCH_EXECUTABLE: executable, BIODATA_SEARCH_UVX: uvx })) {
  if (value !== undefined) {
    if (!isAbsolute(value)) throw new Error(`${name} 必须是可执行文件的绝对路径。`);
    accessSync(value, constants.X_OK);
  }
}

const wheel = fileURLToPath(new URL('./backend/biodata_search_mcp-0.2.0-py3-none-any.whl', import.meta.url));
if (!executable) accessSync(wheel, constants.R_OK);
const child = spawn(executable || uvx || 'uvx', executable ? [] : [
  '--python', '>=3.11', '--from', wheel, 'biodata-search-mcp',
], {
  stdio: 'inherit',
  env: { ...process.env, ...pythonProxyEnvironment(process.env) },
});
child.on('error', error => {
  throw new Error('BioData Search 后端启动失败。请安装 uv，并将 uvx 加入 DSH 的 PATH；或设置 BIODATA_SEARCH_UVX 为 uvx 的绝对路径；已安装后端可设置 BIODATA_SEARCH_EXECUTABLE。', { cause: error });
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  if (signal) {
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
  } else {
    process.exit(code);
  }
});
