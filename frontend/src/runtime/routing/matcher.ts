import type { MatchedRoute, RouteConfig } from '@/runtime/routing/types';

export function normalizePathname(pathname: string | null): string {
  if (!pathname) {
    return '/';
  }
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function matchRoutePattern(
  pattern: string,
  pathname: string,
): Record<string, string | undefined> | null {
  const normalizedPattern = normalizePathname(pattern);
  const normalizedPath = normalizePathname(pathname);

  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const pathSegments = normalizedPath.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string | undefined> = {};
  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i];
    const pathSegment = decodePathSegment(pathSegments[i]);

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = pathSegment;
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

export function findMatchedRoute(
  routes: RouteConfig[],
  pathname: string,
): MatchedRoute | null {
  for (const route of routes) {
    const params = matchRoutePattern(route.path, pathname);
    if (params) {
      return { route, params };
    }
  }
  return null;
}
