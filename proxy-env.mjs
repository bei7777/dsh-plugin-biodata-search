import { isIPv6 } from 'node:net';

export function pythonProxyEnvironment(environment) {
  const bypass = environment.no_proxy ?? environment.NO_PROXY;
  if (bypass === undefined) return {};
  // HTTPX 会自行添加 IPv6 方括号，带端口的地址需要显式协议。
  const hosts = bypass.split(',').map(value => {
    const host = value.trim();
    const literal = /^\[([^\]]+)\](?::(\d+))?$/.exec(host);
    if (!literal || !isIPv6(literal[1])) return host;
    return literal[2] ? `all://${host}` : literal[1];
  });
  const normalized = [...new Set(hosts)].join(',');
  return { NO_PROXY: normalized, no_proxy: normalized };
}
