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
});

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

api.interceptors.request.use((config) => {
  const token = getCookie('XSRF-TOKEN');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['X-CSRF-Token'] = token;
  }
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

export async function ensureCsrfToken(): Promise<void> {
  try {
    await api.get(apiUrl('/csrf'));
  } catch {
    // ignore; server will still set token on next request
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
