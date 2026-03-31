const HTTP_BASE_OVERRIDE = import.meta.env.VITE_MCP_HTTP_BASE?.trim();
const WS_URL_OVERRIDE = import.meta.env.VITE_MCP_WS_URL?.trim();

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getMcpApiBase(): string {
  if (HTTP_BASE_OVERRIDE) {
    const normalizedBase = trimTrailingSlash(HTTP_BASE_OVERRIDE);
    return normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;
  }

  return '/api';
}

export function getMcpWsUrl(): string {
  if (WS_URL_OVERRIDE) {
    return WS_URL_OVERRIDE;
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:4311/ws';
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws`;
}
