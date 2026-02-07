import { Ziggy } from '@/shared/config';

let currentRouteName = '';

export function setCurrentRouteName(name: string) {
  currentRouteName = name;
}

export function getCurrentRouteName() {
  return currentRouteName;
}

type RouteParams =
  | string
  | number
  | Record<string, string | number | boolean | null | undefined>
  | Array<string | number>
  | null
  | undefined;

function buildPath(name: string, params?: RouteParams): string {
  const routeDef = (Ziggy as any).routes?.[name];
  if (!routeDef) {
    return '/' + name;
  }

  let uri: string = routeDef.uri ?? '';
  const paramNames = Array.from(uri.matchAll(/\{([^}]+)\}/g)).map((match) =>
    match[1].replace('?', ''),
  );

  const used = new Set<string>();
  if (Array.isArray(params)) {
    paramNames.forEach((param, index) => {
      if (params[index] !== undefined && params[index] !== null) {
        uri = uri.replace(`{${param}}`, encodeURIComponent(String(params[index])));
        used.add(param);
      }
    });
  } else if (params && typeof params === 'object') {
    paramNames.forEach((param) => {
      const value = (params as Record<string, any>)[param];
      if (value !== undefined && value !== null) {
        uri = uri.replace(`{${param}}`, encodeURIComponent(String(value)));
        used.add(param);
      }
    });
  } else if (params !== undefined && params !== null) {
    if (paramNames.length > 0) {
      uri = uri.replace(`{${paramNames[0]}}`, encodeURIComponent(String(params)));
      used.add(paramNames[0]);
    }
  }

  uri = uri.replace(/\{[^}]+\}/g, '');
  uri = uri.replace(/\/+$/, '');

  let query = '';
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    const extras: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (used.has(key)) {
        return;
      }
      if (value === undefined || value === null || value === '') {
        return;
      }
      extras[key] = String(value);
    });
    const search = new URLSearchParams(extras);
    if (Array.from(search.keys()).length > 0) {
      query = `?${search.toString()}`;
    }
  }

  const normalized = '/' + uri.replace(/^\//, '');
  return normalized + query;
}

function matchesPattern(pattern: string, routeName: string): boolean {
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return routeName === prefix || routeName.startsWith(prefix + '.');
  }
  return routeName === pattern;
}

export function route(name?: string, params?: RouteParams): any {
  if (!name) {
    return {
      current: (pattern: string | string[]) => {
        const routeName = currentRouteName;
        if (!routeName) {
          return false;
        }
        if (Array.isArray(pattern)) {
          return pattern.some((p) => matchesPattern(p, routeName));
        }
        return matchesPattern(pattern, routeName);
      },
    };
  }

  return buildPath(name, params);
}



