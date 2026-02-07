import { api, ensureCsrfToken, route } from '@/shared/lib';

// Expose helpers for legacy usage in components.
if (typeof window !== 'undefined') {
  window.axios = api;
  window.route = route;

  void ensureCsrfToken();
}
