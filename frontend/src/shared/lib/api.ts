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

