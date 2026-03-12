import { ensureCsrfToken } from '@/shared/lib';

if (typeof window !== 'undefined') {
  void ensureCsrfToken();
}
