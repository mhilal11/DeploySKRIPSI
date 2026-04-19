import NextLink from 'next/link';
import React, { useEffect } from 'react';

import { api, apiUrl, buildCsrfHeaders, ensureCsrfToken, isAxiosError } from '@/shared/lib/api';

import { getRouterStore } from './inertia-store';
import { VisitOptions } from './inertia-types';

function buildUrl(url: string, data?: Record<string, any>): string {
  if (!data || Object.keys(data).length === 0) {
    return url;
  }
  const query = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.append(key, String(value));
  });
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${query.toString()}`;
}

function isLogoutVisit(url: string, method: string): boolean {
  return method.toLowerCase() === 'post' && /(^|\/)logout(?:\?.*)?$/i.test(url);
}

export const router = {
  visit: async (url: string, options: VisitOptions = {}) => {
    const method = (options.method ?? 'get').toLowerCase();
    const data = options.data ?? {};
    const routerStore = getRouterStore();

    if (!routerStore) {
      return;
    }

    if (method === 'get') {
      const targetUrl = buildUrl(url, data);
      routerStore.navigate(targetUrl, { replace: options.replace });
      try {
        const response = await api.get(apiUrl(url), { params: data });
        const responseData = response.data;
        routerStore.mergeProps(responseData, options.only);
        options.onSuccess?.(responseData);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          routerStore.navigate('/login', { replace: true });
        }
        options.onError?.({});
      } finally {
        options.onFinish?.();
      }
      return;
    }

    try {
      const csrfToken = await ensureCsrfToken();
      if (isLogoutVisit(url, method)) {
        console.log('[auth] logout csrf response token:', csrfToken);
        console.log('[auth] logout header token:', csrfToken);
      }
      const response = await api.request({
        method,
        url: apiUrl(url),
        data,
        withCredentials: true,
        headers: buildCsrfHeaders(csrfToken),
      });
      const responseData = response.data;
      if (isLogoutVisit(url, method)) {
        console.log('[auth] logout response status:', response.status);
        console.log('[auth] logout response body:', responseData);
      }
      if (url.includes('/logout')) {
        routerStore.setAuthUser(null);
        routerStore.navigate('/login', { replace: true });
        return;
      }
      if (responseData?.redirect_to) {
        routerStore.navigate(responseData.redirect_to, { replace: true });
      }
      options.onSuccess?.(responseData);
    } catch (error) {
      if (isAxiosError(error)) {
        const responseData = error.response?.data as any;
        if (isLogoutVisit(url, method)) {
          console.log('[auth] logout response status:', error.response?.status);
          console.log('[auth] logout response body:', responseData);
        }
        options.onError?.(responseData?.errors || {});
        if (error.response?.status === 401) {
          routerStore.navigate('/login', { replace: true });
        }
      } else {
        options.onError?.({});
      }
    } finally {
      options.onFinish?.();
    }
  },
  get: (url: string, options?: VisitOptions) => router.visit(url, { ...options, method: 'get' }),
  post: (url: string, data: Record<string, any> = {}, options?: VisitOptions) =>
    router.visit(url, { ...options, method: 'post', data }),
  put: (url: string, data: Record<string, any> = {}, options?: VisitOptions) =>
    router.visit(url, { ...options, method: 'put', data }),
  patch: (url: string, data: Record<string, any> = {}, options?: VisitOptions) =>
    router.visit(url, { ...options, method: 'patch', data }),
  delete: (url: string, data: Record<string, any> = {}, options?: VisitOptions) =>
    router.visit(url, { ...options, method: 'delete', data }),
  reload: (options?: VisitOptions) => {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }
    return router.visit(window.location.pathname + window.location.search, {
      ...options,
      method: 'get',
      replace: true,
    });
  },
};

export type InertiaLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  method?: string;
  data?: Record<string, any>;
  as?: 'button' | 'a';
  disabled?: boolean;
};

export const Link = React.forwardRef<HTMLAnchorElement, InertiaLinkProps>(
  ({ href, method, data, as, onClick, disabled = false, ...rest }, ref) => {
    const routerStore = getRouterStore();
    const resolvedMethod = (method ?? 'get').toLowerCase();
    // Prevent manual logout clicks before the auth bootstrap has finished loading the session.
    const isDisabled =
      disabled || (isLogoutVisit(href, resolvedMethod) && !(routerStore?.isAuthReady?.() ?? true));

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      if (onClick) {
        onClick(event);
      }
      if (event.defaultPrevented) {
        return;
      }
      if (method && method.toLowerCase() !== 'get') {
        event.preventDefault();
        router.visit(href, { method, data });
      }
    };

    if (as === 'button') {
      return (
        <button
          type="button"
          disabled={isDisabled}
          onClick={(event) => {
            event.preventDefault();
            if (isDisabled) {
              return;
            }
            router.visit(href, { method: method ?? 'post', data });
          }}
          className={rest.className}
        >
          {rest.children}
        </button>
      );
    }

    if (method && method.toLowerCase() !== 'get') {
      return <a ref={ref} href={href} onClick={handleClick} aria-disabled={isDisabled} {...rest} />;
    }

    return <NextLink ref={ref} href={href} onClick={handleClick} {...rest} />;
  },
);
Link.displayName = 'Link';

export function Head({ title }: { title?: string }) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  return null;
}
