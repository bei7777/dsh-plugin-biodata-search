import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { pythonProxyEnvironment } from '../proxy-env.mjs';

const launcher = fileURLToPath(new URL('../launcher.mjs', import.meta.url));

test('PATH 中缺少 uvx 时输出可操作的错误并终止', () => {
  const result = spawnSync(process.execPath, [launcher], { env: { PATH: '' }, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BioData Search 后端启动失败/);
  assert.match(result.stderr, /BIODATA_SEARCH_UVX/);
  assert.match(result.stderr, /ENOENT/);
  assert.equal(result.stdout, '');
});

test('后端路径必须为存在且可以执行的绝对路径', () => {
  for (const value of ['', 'biodata-search-mcp', `${launcher}/missing`]) {
    const result = spawnSync(process.execPath, [launcher], {
      env: { PATH: '', BIODATA_SEARCH_EXECUTABLE: value }, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, value.startsWith('/') ? /ENOTDIR/ : /必须是可执行文件的绝对路径/);
  }
});

test('保留域名、IPv4 和带端口的 IPv6 代理例外', () => {
  assert.deepEqual(pythonProxyEnvironment({}), {});
  assert.deepEqual(pythonProxyEnvironment({ NO_PROXY: ' localhost,127.0.0.1,[::1],[::1]:8080,.ncbi.nlm.nih.gov,[::1]' }), {
    NO_PROXY: 'localhost,127.0.0.1,::1,all://[::1]:8080,.ncbi.nlm.nih.gov',
    no_proxy: 'localhost,127.0.0.1,::1,all://[::1]:8080,.ncbi.nlm.nih.gov',
  });
  assert.equal(pythonProxyEnvironment({ no_proxy: '', NO_PROXY: '[::1]' }).NO_PROXY, '');
});
