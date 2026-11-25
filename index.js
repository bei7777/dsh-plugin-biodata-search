import { isIPv6 } from 'node:net';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mcpClient from '@deepseek-ai/dsh-mcp-client';
import metadata from './package.json' with { type: 'json' };

export const name = 'biodata-search';
export const inject = ['tools'];

function pythonProxyEnvironment() {
  const bypass = process.env.no_proxy ?? process.env.NO_PROXY;
  if (bypass === undefined) return {};
  // DSH 将 [::1] 加入代理例外列表，HTTPX 会为 IPv6 地址自行添加方括号。
  const hosts = bypass.split(',').map(value => {
    const host = value.trim();
    const literal = /^\[([^\]]+)\](?::(\d+))?$/.exec(host);
    if (!literal || !isIPv6(literal[1])) return host;
    return literal[2] ? `all://${host}` : literal[1];
  });
  const normalized = [...new Set(hosts)].join(',');
  return { NO_PROXY: normalized, no_proxy: normalized };
}

export async function apply(ctx) {
  const executable = process.env.BIODATA_SEARCH_EXECUTABLE;
  if (executable && !isAbsolute(executable)) {
    throw new Error('BIODATA_SEARCH_EXECUTABLE 必须指向后端可执行文件的绝对路径。');
  }
  const wheel = fileURLToPath(new URL(`./backend/biodata_search_mcp-${metadata.version}-py3-none-any.whl`, import.meta.url));
  await ctx.plugin(mcpClient, {
    serverName: 'biodata',
    transport: 'stdio',
    command: executable || 'uvx',
    args: executable ? [] : ['--python', '>=3.11', '--from', wheel, 'biodata-search-mcp'],
    env: pythonProxyEnvironment(),
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    toolCallTimeoutMs: 300_000,
    failOnStartupError: true,
  });
}
