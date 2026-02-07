export interface LoaderContext {
  params: Record<string, string | undefined>;
  search: URLSearchParams;
}

export interface RouteConfig {
  path: string;
  name: string;
  component: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>;
  api?: string | ((ctx: LoaderContext) => string | null);
  loader?: (ctx: LoaderContext) => Record<string, any>;
}

export interface MatchedRoute {
  route: RouteConfig;
  params: Record<string, string | undefined>;
}
