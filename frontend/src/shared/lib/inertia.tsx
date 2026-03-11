'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, apiUrl } from '@/shared/lib/api';
import { setCurrentRouteName } from '@/shared/lib/route';

import { PageContext } from './inertia-context';
import { useForm } from './inertia-form';
import { Head, Link, router, type InertiaLinkProps } from './inertia-navigation';
import { setRouterStore } from './inertia-store';

import type {
  FormOptions,
  InertiaFormProps,
  NavigateOptions,
  PageContextValue,
  VisitOptions,
} from './inertia-types';

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
    const isSuperAdmin = user.role === 'SuperAdmin' || user.role === 'Super Admin';
    const isHumanCapitalAdmin =
      user.role === 'Admin' &&
      typeof user.division === 'string' &&
      /human\s+(capital|resources)/i.test(user.division);

    if (!isSuperAdmin && !isHumanCapitalAdmin) {
      return;
    }

    let active = true;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get(apiUrl('/super-admin/notifications'), {
          params: { page: 1 },
        });
        if (!active) {
          return;
        }
        const counts: Record<string, number> = {
          'super-admin.letters.index': 0,
          'super-admin.recruitment': 0,
          'super-admin.staff.index': 0,
          'super-admin.complaints.index': 0,
          'super-admin.audit-log': 0,
        };

        if (data?.sidebarNotifications && typeof data.sidebarNotifications === 'object') {
          Object.entries(data.sidebarNotifications as Record<string, unknown>).forEach(
            ([key, value]) => {
              if (key in counts && typeof value === 'number' && Number.isFinite(value)) {
                counts[key] = value;
              }
            },
          );
          setSidebarNotifications(counts);
          return;
        }

        if (data?.data && Array.isArray(data.data)) {
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
              case 'audit':
                counts['super-admin.audit-log'] += 1;
                break;
              default:
                break;
            }
          }
          setSidebarNotifications(counts);
        }
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

export { Head, Link, router, useForm };
export type {
  FormOptions,
  InertiaFormProps,
  InertiaLinkProps,
  NavigateOptions,
  VisitOptions,
};
