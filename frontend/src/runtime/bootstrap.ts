import { ensureCsrfToken } from '@/shared/lib';
import { route as routeHelper } from '@/shared/lib/route';

if (typeof window !== 'undefined') {
  window.route = routeHelper as typeof window.route;
  void ensureCsrfToken();
}
