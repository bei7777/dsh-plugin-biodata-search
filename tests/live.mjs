import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const tarball = process.argv[2];
assert.ok(tarball?.endsWith('.tgz'), '用法：node tests/live.mjs <npm pack 生成的 tgz 文件>');
const testDirectory = process.env.BIODATA_TEST_DIR || fileURLToPath(new URL('../dist/', import.meta.url));
await mkdir(testDirectory, {recursive: true});
const runDirectory = await mkdtemp(join(testDirectory, 'dsh-'));
const workspace = join(runDirectory, 'workspace');
await mkdir(workspace);
const profile = 'biodata-ci';
const environment = {...process.env, DSH_HOME: join(runDirectory, 'dsh'), TMPDIR: runDirectory, TMP: runDirectory, TEMP: runDirectory};

async function dsh(args) {
  console.log('执行 DSH', args.join(' '));
  const child = spawn(process.env.DSH_BIN || 'dsh', args, {cwd: workspace, env: environment, stdio: 'pipe', timeout: 240_000});
  let output = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => {
    output += chunk;
    if (process.env.BIODATA_TEST_VERBOSE === '1') process.stderr.write(chunk);
  });
  const [status] = await once(child, 'close');
  assert.equal(status, 0, output);
  return output;
}

await dsh(['--profile', profile, '--from-default-profile', 'sdk', '--dump-config']);
await dsh(['plugin', '--profile', profile, 'add', resolve(tarball)]);
const profileManifest = JSON.parse(await readFile(join(environment.DSH_HOME, 'profiles', profile, 'package.json'), 'utf8'));
assert.ok(profileManifest.dsh.profile.bundles.includes('dsh-plugin-biodata-search'));
const profileDirectory = join(environment.DSH_HOME, 'profiles', profile);
const workspaceConfig = await readFile(join(profileDirectory, 'pnpm-workspace.yaml'), 'utf8');
assert.match(workspaceConfig, /autoInstallPeers: false/);
await assert.rejects(access(join(profileDirectory, 'node_modules', '@deepseek-ai', 'dsh-mcp-client')), { code: 'ENOENT' });
const integrity = 'sha512-' + createHash('sha512').update(await readFile(tarball)).digest('base64');
const lockfile = await readFile(join(environment.DSH_HOME, 'profiles', profile, 'pnpm-lock.yaml'), 'utf8');
assert.ok(lockfile.includes(integrity), '已安装包的完整性校验值与待测发行包不一致');
const report = await dsh(['--profile', profile, '--patch', fileURLToPath(new URL('./live.patch.yml', import.meta.url))]);
assert.ok(report.includes('BIODATA_DSH_LIVE_OK'), report);
console.log(report.split('\n').filter(line => line.includes('真实 DSH') || line === 'BIODATA_DSH_LIVE_OK').join('\n'));
console.log('全新 profile 已验证，autoInstallPeers=false，profile 未安装 MCP 客户端依赖。');
