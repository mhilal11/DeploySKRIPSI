'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import StaffShell from '@/modules/Staff/components/StaffShell';
import SuperAdminShell from '@/modules/SuperAdmin/components/SuperAdminShell';
import {
  ROUTES,
  NotFound,
  findMatchedRoute,
  getWarmupApiEndpoints,
  getWarmupLoaders,
  normalizePathname,
  type LoaderContext,
  type RouteConfig,
} from '@/runtime/routing';
import { api, apiUrl, setCurrentRouteName, usePageManager } from '@/shared/lib';

interface CachedPagePayload {
  data: any;
  cachedAt: number;
}

const PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_CACHE_MAX_ENTRIES = 150;
const pageDataCache = new Map<string, CachedPagePayload>();
const warmedApiCacheKeys = new Set<string>();
const DISABLE_TRANSITION_FALLBACK_ROUTES = new Set([
  'landing',
  'login',
  'register',
  'password.request',
  'password.reset',
  'password.setup',
  'password.confirm',
  'verification.notice',
]);

function getCachedPageData(cacheKey: string | null): any | null {
  if (!cacheKey) {
    return null;
  }
  const cached = pageDataCache.get(cacheKey);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.cachedAt > PAGE_CACHE_TTL_MS) {
    pageDataCache.delete(cacheKey);
    warmedApiCacheKeys.delete(cacheKey);
    return null;
  }
  return cached.data;
}

function setCachedPageData(cacheKey: string | null, data: any): void {
  if (!cacheKey) {
    return;
  }
  if (pageDataCache.size >= PAGE_CACHE_MAX_ENTRIES) {
    const oldestKey = pageDataCache.keys().next().value as string | undefined;
    if (oldestKey) {
      pageDataCache.delete(oldestKey);
      warmedApiCacheKeys.delete(oldestKey);
    }
  }
  pageDataCache.set(cacheKey, { data, cachedAt: Date.now() });
}

function clearAllPageCache(): void {
  pageDataCache.clear();
  warmedApiCacheKeys.clear();
}

function buildPageCacheKey(apiEndpoint: string | null | undefined, search: string): string | null {
  if (!apiEndpoint) {
    return null;
  }
  const normalizedSearch = search.startsWith('?') ? search : `?${search}`;
  return `${apiEndpoint}${normalizedSearch}`;
}

interface RenderedPageSnapshot {
  routeKey: string;
  component: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>;
  props: any;
}

function PageShell({
  name,
  component: Component,
  apiEndpoint,
  loaderProps,
  searchString,
}: {
  name: string;
  component: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>;
  apiEndpoint?: string | null;
  loaderProps?: Record<string, any> | null;
  searchString: string;
}) {
  const { props, setProps, authLoaded, setRouteName } = usePageManager();
  const router = useRouter();
  const normalizedSearch = searchString ? `?${searchString}` : '';
  const routeKey = `${name}::${apiEndpoint ?? '__loader__'}::${normalizedSearch}`;
  const cacheKey = buildPageCacheKey(apiEndpoint ?? null, normalizedSearch);
  const disableTransitionFallback = DISABLE_TRANSITION_FALLBACK_ROUTES.has(name);
  const initialCachedProps = getCachedPageData(cacheKey);
  const [pageProps, setPageProps] = useState<any>(initialCachedProps);
  const [renderedPage, setRenderedPage] = useState<RenderedPageSnapshot | null>(
    initialCachedProps ? { routeKey, component: Component, props: initialCachedProps } : null,
  );
  const [transitionFallbackPage, setTransitionFallbackPage] = useState<RenderedPageSnapshot | null>(null);
  const renderedPageRef = useRef<RenderedPageSnapshot | null>(renderedPage);
  const [loaded, setLoaded] = useState(!apiEndpoint || Boolean(initialCachedProps));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    renderedPageRef.current = renderedPage;
  }, [renderedPage]);

  useEffect(() => {
    setCurrentRouteName(name);
    setRouteName(name);
  }, [name, setRouteName]);

  useEffect(() => {
    let active = true;
    const currentRendered = renderedPageRef.current;
    if (!disableTransitionFallback && currentRendered && currentRendered.routeKey !== routeKey) {
      setTransitionFallbackPage(currentRendered);
    } else if (disableTransitionFallback) {
      setTransitionFallbackPage(null);
    }

    const fetchData = async () => {
      if (!apiEndpoint) {
        const resolvedLoaderProps = loaderProps ?? {};
        setPageProps(resolvedLoaderProps);
        setRenderedPage({ routeKey, component: Component, props: resolvedLoaderProps });
        if (loaderProps) {
          setProps(loaderProps);
        }
        setLoadError(null);
        setLoaded(true);
        return;
      }

      if (cacheKey) {
        const cached = getCachedPageData(cacheKey);
        if (cached && typeof cached === 'object') {
          setPageProps(cached);
          setRenderedPage({ routeKey, component: Component, props: cached });
          setProps(cached);
          setLoaded(true);
          setLoadError(null);
        } else {
          setPageProps(null);
          setLoadError(null);
          setLoaded(false);
        }
      } else {
        setPageProps(null);
        setLoadError(null);
        setLoaded(false);
      }

      try {
        const query = new URLSearchParams(searchString);
        const params: Record<string, string> = {};
        query.forEach((value, key) => {
          params[key] = value;
        });

        const { data } = await api.get(apiUrl(apiEndpoint), { params });
        if (!active) {
          return;
        }

        if (data && typeof data === 'object') {
          if (typeof data.redirect_to === 'string' && data.redirect_to.length > 0) {
            router.replace(data.redirect_to);
            return;
          }
          if (cacheKey) {
            setCachedPageData(cacheKey, data);
          }
          setPageProps(data);
          setRenderedPage({ routeKey, component: Component, props: data });
          setProps(data);
        }
        setLoadError(null);
        setLoaded(true);
      } catch (error) {
        const status = (error as any)?.response?.status;
        if (status === 401) {
          router.replace('/login');
          return;
        }
        const message = (error as any)?.response?.data?.message as string | undefined;
        setLoadError(message ?? 'Gagal memuat data halaman.');
        setLoaded(true);
      }
    };

    if (authLoaded) {
      void fetchData();
    }

    return () => {
      active = false;
    };
  }, [
    routeKey,
    apiEndpoint,
    cacheKey,
    searchString,
    authLoaded,
    loaderProps,
    router,
    setProps,
    Component,
    disableTransitionFallback,
  ]);

  const currentRenderedPage = renderedPage && renderedPage.routeKey === routeKey ? renderedPage : null;
  if (loadError && loaded && !currentRenderedPage) {
    return <div className="p-6 text-red-600">{loadError}</div>;
  }

  if (!currentRenderedPage) {
    // Use transitionFallbackPage or the stale renderedPage (from the
    // previous route) to keep the old content visible while the new page
    // loads.  This eliminates the single-frame white flash.
    const immediateFallback = disableTransitionFallback
      ? null
      : transitionFallbackPage ||
        (renderedPage && renderedPage.routeKey !== routeKey ? renderedPage : null);

    if (immediateFallback) {
      const FallbackComponent = immediateFallback.component as React.ComponentType<any>;
      return <FallbackComponent {...immediateFallback.props} />;
    }
    if (apiEndpoint && !loaded && !pageProps && !disableTransitionFallback) {
      return null;
    }

    const SafeComponent = Component as React.ComponentType<any>;
    const safeProps = pageProps ?? props ?? {};
    return (
      <Suspense fallback={null}>
        <SafeComponent {...safeProps} />
      </Suspense>
    );
  }

  const ResolvedComponent = currentRenderedPage.component as React.ComponentType<any>;
  const suspenseFallback = !disableTransitionFallback && transitionFallbackPage
    ? (() => {
      const FallbackComponent = transitionFallbackPage.component as React.ComponentType<any>;
      return <FallbackComponent {...transitionFallbackPage.props} />;
    })()
    : null;

  return (
    <Suspense fallback={suspenseFallback}>
      <ResolvedComponent {...currentRenderedPage.props} />
    </Suspense>
  );
}

function PageRoute({
  route,
  params,
  searchString,
}: {
  route: RouteConfig;
  params: Record<string, string | undefined>;
  searchString: string;
}) {
  const ctx = useMemo<LoaderContext>(
    () => ({ params, search: new URLSearchParams(searchString) }),
    [params, searchString],
  );

  const apiEndpoint = useMemo(() => {
    if (!route.api) {
      return null;
    }
    if (typeof route.api === 'function') {
      return route.api(ctx);
    }
    return route.api;
  }, [route, ctx]);

  const loaderProps = useMemo(
    () => (route.loader ? route.loader(ctx) : null),
    [route, ctx],
  );

  return (
    <PageShell
      name={route.name}
      component={route.component}
      apiEndpoint={apiEndpoint}
      loaderProps={loaderProps}
      searchString={searchString}
    />
  );
}

export default function AppRoutes() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { props, authLoaded } = usePageManager();

  const normalizedPathname = useMemo(() => normalizePathname(pathname), [pathname]);
  const searchString = useMemo(() => searchParams?.toString() ?? '', [searchParams]);

  const matchedRoute = useMemo(
    () => findMatchedRoute(ROUTES, normalizedPathname),
    [normalizedPathname],
  );

  useEffect(() => {
    if (!authLoaded) {
      return;
    }
    const user = props?.auth?.user;
    if (!user) {
      return;
    }

    let active = true;
    const warmupLoaders = getWarmupLoaders(user);
    const warmupApiEndpoints = getWarmupApiEndpoints(user);

    warmupLoaders.forEach((loader) => {
      void loader();
    });

    warmupApiEndpoints.forEach((endpoint) => {
      const cacheKey = buildPageCacheKey(endpoint, '');
      if (!cacheKey || warmedApiCacheKeys.has(cacheKey)) {
        return;
      }
      warmedApiCacheKeys.add(cacheKey);
      void api
        .get(apiUrl(endpoint))
        .then(({ data }) => {
          if (!active || !data || typeof data !== 'object') {
            return;
          }
          setCachedPageData(cacheKey, data);
        })
        .catch(() => {
          warmedApiCacheKeys.delete(cacheKey);
        });
    });

    return () => {
      active = false;
    };
  }, [
    authLoaded,
    props?.auth?.user,
    props?.auth?.user?.id,
    props?.auth?.user?.role,
    props?.auth?.user?.division,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleInvalidate = () => {
      clearAllPageCache();
    };
    window.addEventListener('hris:cache:invalidate', handleInvalidate);
    return () => {
      window.removeEventListener('hris:cache:invalidate', handleInvalidate);
    };
  }, []);

  if (!matchedRoute) {
    return <NotFound />;
  }

  const isSuperAdminRoute = matchedRoute.route.name.startsWith('super-admin.');
  const isStaffRoute = matchedRoute.route.name.startsWith('staff.');

  const pageRoute = (
    <PageRoute
      route={matchedRoute.route}
      params={matchedRoute.params}
      searchString={searchString}
    />
  );

  // Wrap all super-admin routes in a persistent shell so the sidebar,
  // navbar, and chrome stay mounted across navigations.
  if (isSuperAdminRoute) {
    return <SuperAdminShell>{pageRoute}</SuperAdminShell>;
  }

  if (isStaffRoute) {
    return <StaffShell>{pageRoute}</StaffShell>;
  }

  return pageRoute;
}
