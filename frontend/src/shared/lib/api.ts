import axios, { AxiosError } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || '/api';

export const api = axios.create({
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

export function apiUrl(path: string): string {
  if (!path) {
    return API_BASE;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith(API_BASE)) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE.replace(/\/$/, '') + normalized;
}

function backendOrigin(): string {
  const envOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
  if (envOrigin && envOrigin.trim() !== '') {
    return envOrigin.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  return 'http://localhost:8080';
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
    return `${base}${normalized}`;
  }
  if (normalized.startsWith('storage/')) {
    return `${base}/${normalized}`;
  }
  if (normalized.startsWith('/')) {
    return `${base}${normalized}`;
  }

  return `${base}/storage/${normalized}`;
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

