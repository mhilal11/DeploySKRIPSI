import { useCallback, useContext, useMemo, useRef, useState } from 'react';

import { api, apiUrl, isAxiosError } from '@/shared/lib/api';

import { PageContext } from './inertia-context';
import { getRouterStore } from './inertia-store';
import { FormOptions, InertiaFormProps } from './inertia-types';

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

function resolveProfilePhotoUrl(payload: any): string | null | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const direct = payload.profilePhotoUrl ?? payload.profile_photo_url;
  if (typeof direct === 'string') {
    return direct;
  }
  if (direct === null) {
    return null;
  }
  const user = payload.user;
  if (user && typeof user === 'object') {
    const fromUser = user.profilePhotoUrl ?? user.profile_photo_url;
    if (typeof fromUser === 'string') {
      return fromUser;
    }
    if (fromUser === null) {
      return null;
    }
  }
  return undefined;
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
      const nextProfilePhotoUrl = resolveProfilePhotoUrl(responseData);
      if (ctx?.setAuthUser && (responseData?.user || nextProfilePhotoUrl !== undefined)) {
        const currentUser = responseData?.user ?? ctx?.props?.auth?.user ?? null;
        ctx.setAuthUser(currentUser, nextProfilePhotoUrl);
      }
      if (responseData?.flash) {
        ctx?.mergeProps({ flash: responseData.flash });
      }
      if (
        typeof window !== 'undefined' &&
        responseData?.user?.role === 'Pelamar' &&
        typeof responseData?.redirect_to === 'string' &&
        responseData.redirect_to.startsWith('/pelamar/')
      ) {
        window.sessionStorage.setItem('pelamar_login_success_toast', '1');
      }

      const routerStore = getRouterStore();
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
        } else if (status === 401) {
          const routerStore = getRouterStore();
          if (routerStore) {
            routerStore.navigate('/login', { replace: true });
          }
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
