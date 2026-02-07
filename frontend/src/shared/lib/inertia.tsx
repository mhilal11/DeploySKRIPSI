'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { api, apiUrl, isAxiosError } from '@/shared/lib/api';
import { setCurrentRouteName } from '@/shared/lib/route';

interface NavigateOptions {
  replace?: boolean;
}

export interface InertiaFormProps<T> {
  data: T;
  setData: (key: keyof T | string | T | ((prev: T) => T), value?: any) => void;
  errors: Record<string, string>;
  processing: boolean;
  recentlySuccessful: boolean;
  post: (url: string, options?: FormOptions<T>) => Promise<void>;
  put: (url: string, options?: FormOptions<T>) => Promise<void>;
  patch: (url: string, options?: FormOptions<T>) => Promise<void>;
  delete: (url: string, options?: FormOptions<T>) => Promise<void>;
  reset: (...fields: string[]) => void;
  clearErrors: (...fields: string[]) => void;
  setError: (field: string, message: string) => void;
  transform: (callback: (data: T) => any) => void;
}

export interface FormOptions<T> {
  onSuccess?: (data: any) => void;
  onError?: (errors: Record<string, string>) => void;
  onFinish?: () => void;
  preserveScroll?: boolean;
  preserveState?: boolean;
  replace?: boolean;
  only?: string[];
  forceFormData?: boolean;
}

export interface VisitOptions {
  method?: string;
  data?: Record<string, any>;
  onSuccess?: (data: any) => void;
  onError?: (errors: Record<string, string>) => void;
  onFinish?: () => void;
  preserveScroll?: boolean;
  preserveState?: boolean;
  replace?: boolean;
  only?: string[];
}

interface PageContextValue {
  props: any;
  setProps: (next: any) => void;
  mergeProps: (next: any, only?: string[]) => void;
  setRouteName: (name: string) => void;
  authLoaded: boolean;
  setAuthUser: (user: any | null) => void;
  setSidebarNotifications: (next: Record<string, number>) => void;
}

const PageContext = createContext<PageContextValue | null>(null);

interface RouterStore {
  navigate: (to: string, options?: NavigateOptions) => void;
  setProps: (next: any) => void;
  mergeProps: (next: any, only?: string[]) => void;
  getProps: () => any;
  setRouteName: (name: string) => void;
  setAuthUser: (user: any | null) => void;
}

let routerStore: RouterStore | null = null;

function setRouterStore(store: RouterStore | null) {
  routerStore = store;
}

const baseProps = {
  auth: { user: null, profilePhotoUrl: null },
  flash: {},
  sidebarNotifications: {},
};

export function PageProvider({ children }: { children: React.ReactNode }) {
  const [props, setPropsState] = useState<any>(baseProps);
  const [routeName, setRouteNameState] = useState('');
  const [authLoaded, setAuthLoaded] = useState(false);
  const nextRouter = useRouter();
  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (options?.replace) {
        nextRouter.replace(to);
        return;
      }
      nextRouter.push(to);
    },
    [nextRouter],
  );

  useEffect(() => {
    setCurrentRouteName(routeName);
  }, [routeName]);

  const setAuthUser = useCallback((user: any | null) => {
    setPropsState((prev: any) => ({
      ...prev,
      auth: {
        ...prev.auth,
        user: user ?? null,
      },
    }));
  }, []);

  const setProps = useCallback((next: any) => {
    setPropsState((prev: any) => ({
      ...baseProps,
      ...next,
      auth: {
        ...baseProps.auth,
        ...prev.auth,
        ...next?.auth,
      },
      sidebarNotifications:
        next?.sidebarNotifications ?? prev.sidebarNotifications ?? baseProps.sidebarNotifications,
      flash: next?.flash ?? {},
    }));
  }, []);

  const setSidebarNotifications = useCallback((next: Record<string, number>) => {
    setPropsState((prev: any) => ({
      ...prev,
      sidebarNotifications: next,
    }));
  }, []);

  const mergeProps = useCallback((next: any, only?: string[]) => {
    setPropsState((prev: any) => {
      if (!next || typeof next !== 'object') {
        return prev;
      }
      if (only && only.length > 0) {
        const partial = { ...prev };
        only.forEach((key) => {
          if (key in next) {
            (partial as any)[key] = (next as any)[key];
          }
        });
        return {
          ...partial,
          auth: {
            ...prev.auth,
            ...next.auth,
          },
          flash: next.flash ?? prev.flash,
        };
      }
      return {
        ...baseProps,
        ...prev,
        ...next,
        auth: {
          ...prev.auth,
          ...next.auth,
        },
        flash: next.flash ?? prev.flash,
      };
    });
  }, []);

  const setRouteName = useCallback((name: string) => {
    setRouteNameState(name);
  }, []);

  useEffect(() => {
    setRouterStore({
      navigate,
      setProps,
      mergeProps,
      getProps: () => props,
      setRouteName,
      setAuthUser,
    });

    return () => {
      setRouterStore(null);
    };
  }, [navigate, props, setProps, mergeProps, setRouteName, setAuthUser]);

  useEffect(() => {
    let active = true;
    const fetchMe = async () => {
      try {
        const { data } = await api.get(apiUrl('/me'));
        if (!active) {
          return;
        }
        if (data && data.user) {
          setAuthUser(data.user);
        }
      } catch {
        // ignore
      } finally {
        if (active) {
          setAuthLoaded(true);
        }
      }
    };
    void fetchMe();

    return () => {
      active = false;
    };
  }, [setAuthUser]);

  useEffect(() => {
    const user = props?.auth?.user;
    if (!user) {
      return;
    }
    const isSuperAdmin = user.role === 'SuperAdmin';
    const isHumanCapitalAdmin =
      user.role === 'Admin' &&
      typeof user.division === 'string' &&
      /human\\s+(capital|resources)/i.test(user.division);

    if (!isSuperAdmin && !isHumanCapitalAdmin) {
      return;
    }

    let active = true;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get(apiUrl('/super-admin/notifications'), {
          params: { page: 1 },
        });
        if (!active || !data?.data) {
          return;
        }
        const counts: Record<string, number> = {
          'super-admin.letters.index': 0,
          'super-admin.recruitment': 0,
          'super-admin.staff.index': 0,
          'super-admin.complaints.index': 0,
        };
        for (const item of data.data as Array<{ type: string }>) {
          switch (item.type) {
            case 'letter':
              counts['super-admin.letters.index'] += 1;
              break;
            case 'application':
              counts['super-admin.recruitment'] += 1;
              break;
            case 'termination':
              counts['super-admin.staff.index'] += 1;
              break;
            case 'complaint':
              counts['super-admin.complaints.index'] += 1;
              break;
            default:
              break;
          }
        }
        setSidebarNotifications(counts);
      } catch {
        // ignore
      }
    };
    void fetchNotifications();

    return () => {
      active = false;
    };
  }, [props?.auth?.user, setSidebarNotifications]);

  const value = useMemo<PageContextValue>(
    () => ({
      props,
      setProps,
      mergeProps,
      setRouteName,
      authLoaded,
      setAuthUser,
      setSidebarNotifications,
    }),
    [props, setProps, mergeProps, setRouteName, authLoaded, setAuthUser, setSidebarNotifications],
  );

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export function usePage<T = any>() {
  const ctx = useContext(PageContext);
  if (!ctx) {
    throw new Error('usePage must be used within PageProvider');
  }
  return {
    props: ctx.props as T,
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  };
}

export function usePageManager() {
  const ctx = useContext(PageContext);
  if (!ctx) {
    throw new Error('usePageManager must be used within PageProvider');
  }
  return ctx;
}

function toFormData(data: Record<string, any>): FormData {
  const form = new FormData();
  const append = (key: string, value: any) => {
    if (value === undefined || value === null) {
      return;
    }
    if (value instanceof Blob) {
      form.append(key, value);
      return;
    }
    if (Array.isArray(value)) {
      const allPrimitive = value.every(
        (entry) =>
          entry === null ||
          entry === undefined ||
          typeof entry !== 'object' ||
          entry instanceof Blob,
      );
      if (allPrimitive) {
        value.forEach((entry) => append(`${key}[]`, entry));
      } else {
        form.append(key, JSON.stringify(value));
      }
      return;
    }
    if (typeof value === 'object') {
      form.append(key, JSON.stringify(value));
      return;
    }
    form.append(key, String(value));
  };

  Object.entries(data).forEach(([key, value]) => append(key, value));
  return form;
}

function containsFile(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (data instanceof Blob) {
    return true;
  }
  if (Array.isArray(data)) {
    return data.some(containsFile);
  }
  return Object.values(data).some(containsFile);
}

export function useForm<T extends Record<string, any>>(initialData: T): InertiaFormProps<T> {
  const [data, setDataState] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [recentlySuccessful, setRecentlySuccessful] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transformRef = useRef<((data: T) => any) | null>(null);
  const initialRef = useRef<T>(initialData);
  const ctx = useContext(PageContext);

  const setData = useCallback((key: keyof T | string | T | ((prev: T) => T), value?: any) => {
    if (typeof key === 'function') {
      setDataState((prev) => (key as (prev: T) => T)(prev));
      return;
    }
    if (typeof key === 'string') {
      setDataState((prev) => ({
        ...prev,
        [key]: value,
      }));
      return;
    }
    setDataState(key as T);
  }, []);

  const clearErrors = useCallback((...fields: string[]) => {
    if (fields.length === 0) {
      setErrors({});
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        delete next[field];
      });
      return next;
    });
  }, []);

  const reset = useCallback((...fields: string[]) => {
    if (fields.length === 0) {
      setDataState(initialRef.current);
      return;
    }
    setDataState((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        (next as any)[field] = (initialRef.current as any)[field];
      });
      return next;
    });
  }, []);

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const submit = useCallback(async (method: string, url: string, options?: FormOptions<T>) => {
    setProcessing(true);
    setErrors({});

    const transform = transformRef.current;
    const payload = transform ? transform(data) : data;
    const shouldUseFormData = Boolean(options?.forceFormData) || containsFile(payload);

    try {
      const response = await api.request({
        method,
        url: apiUrl(url),
        data: shouldUseFormData ? toFormData(payload) : payload,
        headers: shouldUseFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      });

      const responseData = response.data;
      if (responseData?.user && ctx?.setAuthUser) {
        ctx.setAuthUser(responseData.user);
      }
      if (responseData?.flash) {
        ctx?.mergeProps({ flash: responseData.flash });
      }
      if (responseData?.redirect_to && routerStore) {
        routerStore.navigate(responseData.redirect_to, { replace: true });
      }
      setRecentlySuccessful(true);
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => setRecentlySuccessful(false), 2000);
      options?.onSuccess?.(responseData);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        const responseData = error.response?.data as any;
        if (status === 422 && responseData?.errors) {
          setErrors(responseData.errors);
          options?.onError?.(responseData.errors);
        } else if (status === 401 && routerStore) {
          routerStore.navigate('/login', { replace: true });
        } else {
          options?.onError?.(responseData?.errors || {});
        }
      } else {
        options?.onError?.({});
      }
    } finally {
      setProcessing(false);
      options?.onFinish?.();
    }
  }, [ctx, data]);

  const transform = useCallback((callback: (data: T) => any) => {
    transformRef.current = callback;
  }, []);

  const post = useCallback((url: string, options?: FormOptions<T>) => submit('post', url, options), [submit]);
  const put = useCallback((url: string, options?: FormOptions<T>) => submit('put', url, options), [submit]);
  const patch = useCallback((url: string, options?: FormOptions<T>) => submit('patch', url, options), [submit]);
  const remove = useCallback((url: string, options?: FormOptions<T>) => submit('delete', url, options), [submit]);

  return useMemo(
    () => ({
      data,
      setData,
      errors,
      processing,
      recentlySuccessful,
      post,
      put,
      patch,
      delete: remove,
      reset,
      clearErrors,
      setError,
      transform,
    }),
    [
      clearErrors,
      data,
      errors,
      patch,
      post,
      processing,
      put,
      recentlySuccessful,
      remove,
      reset,
      setData,
      setError,
      transform,
    ],
  );
}

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

export const router = {
  visit: async (url: string, options: VisitOptions = {}) => {
    const method = (options.method ?? 'get').toLowerCase();
    const data = options.data ?? {};

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
      const response = await api.request({
        method,
        url: apiUrl(url),
        data,
      });
      const responseData = response.data;
      if (url.includes('/logout') && routerStore) {
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
  reload: (options?: VisitOptions) =>
    router.visit(window.location.pathname + window.location.search, {
      ...options,
      method: 'get',
      replace: true,
    }),
};

export type InertiaLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  method?: string;
  data?: Record<string, any>;
  as?: 'button' | 'a';
};

export const Link = React.forwardRef<HTMLAnchorElement, InertiaLinkProps>(
  ({ href, method, data, as, onClick, ...rest }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
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
          onClick={(event) => {
            event.preventDefault();
            router.visit(href, { method: method ?? 'post', data });
          }}
          className={rest.className}
        >
          {rest.children}
        </button>
      );
    }

    if (method && method.toLowerCase() !== 'get') {
      return (
        <a ref={ref} href={href} onClick={handleClick} {...rest} />
      );
    }

    return (
      <NextLink ref={ref} href={href} onClick={handleClick} {...rest} />
    );
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


