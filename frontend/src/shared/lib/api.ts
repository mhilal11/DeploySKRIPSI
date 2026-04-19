import axios, { AxiosError } from 'axios';

function normalizeApiOrigin(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\/api\/?$/i, '').replace(/\/$/, '');
}

export function getApiOrigin(): string {
  const envOrigin = normalizeApiOrigin(
    process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL,
  );
  if (envOrigin) {
    return envOrigin;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }

  return '';
}

export function getApiBaseUrl(): string {
  const origin = getApiOrigin();
  return origin ? `${origin}/api` : '/api';
}

export function getBackendBaseUrl(): string {
  return getApiOrigin();
}

const API_BASE = getApiBaseUrl();

if (typeof window !== 'undefined') {
  console.log('[api] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-CSRF-Token',
  // Cross-site requests still need to mirror the current XSRF cookie into the header.
  withXSRFToken: true,
});

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function extractCsrfToken(payload: unknown): string | null {
  const candidates: unknown[] = [payload];

  while (candidates.length > 0) {
    const current = candidates.shift();
    if (!current || typeof current !== 'object') {
      continue;
    }

    const record = current as Record<string, unknown>;
    const directToken =
      record.csrfToken ??
      record.csrf_token ??
      record.csrf ??
      record.token;
    if (typeof directToken === 'string' && directToken.trim() !== '') {
      return directToken.trim();
    }

    // Some clients wrap payloads under a `data` object; scan that too.
    if (record.data && typeof record.data === 'object') {
      candidates.push(record.data);
    }
  }

  return null;
}

export function getCsrfCookieToken(): string | null {
  return getCookie('XSRF-TOKEN');
}

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method ?? 'get').toLowerCase();
    if (typeof window !== 'undefined' && method !== 'get' && method !== 'head' && method !== 'options') {
      window.dispatchEvent(new Event('hris:cache:invalidate'));
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export function apiUrl(path: string): string {
  if (!path) {
    return API_BASE;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (normalized === '/api') {
    return API_BASE;
  }

  if (normalized.startsWith('/api/')) {
    const origin = getApiOrigin();
    return origin ? `${origin}${normalized}` : normalized;
  }

  return API_BASE.replace(/\/$/, '') + normalized;
}

function backendOrigin(): string {
  return getBackendBaseUrl();
}

export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  const raw = path.trim();
  if (raw === '') {
    return null;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const normalized = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  const base = backendOrigin();

  if (normalized.startsWith('/storage/')) {
    return base ? `${base}${normalized}` : normalized;
  }
  if (normalized.startsWith('storage/')) {
    return base ? `${base}/${normalized}` : `/${normalized}`;
  }
  if (normalized.startsWith('/')) {
    return base ? `${base}${normalized}` : normalized;
  }

  return base ? `${base}/storage/${normalized}` : `/storage/${normalized}`;
}

export async function ensureCsrfToken(): Promise<string | null> {
  try {
    // Refresh the cookie source of truth; protected requests should rely on the latest cookie value.
    const response = await api.get(apiUrl('/csrf'), {
      withCredentials: true,
    });
    console.log('[api] csrf response data:', response.data);
    console.log('[api] csrf response headers:', response.headers);
    const responseToken =
      typeof response.data?.csrf_token === 'string' && response.data.csrf_token.trim() !== ''
        ? response.data.csrf_token.trim()
        : extractCsrfToken(response.data);
    const cookieToken = getCsrfCookieToken();
    console.log('[api] csrf response token:', responseToken);
    console.log('[api] csrf cookie token:', cookieToken);
    return cookieToken ?? responseToken;
  } catch (error) {
    // Log the failure so the actual csrf payload or cookie problem is visible in devtools.
    if (axios.isAxiosError(error)) {
      console.log('[api] csrf response data:', error.response?.data);
      console.log('[api] csrf response headers:', error.response?.headers);
    }
    const cookieToken = getCsrfCookieToken();
    console.log('[api] csrf cookie token:', cookieToken);
    return cookieToken;
  }
}

export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

export async function testHealthzRequest(): Promise<Response> {
  const backendBase = getBackendBaseUrl();
  const url = backendBase ? `${backendBase}/healthz` : '/healthz';
  return fetch(url, {
    credentials: 'include',
  });
}

export async function testCsrfRequest(): Promise<Response> {
  return fetch(apiUrl('/csrf'), {
    credentials: 'include',
  });
}
