export interface NavigateOptions {
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

export interface PageContextValue {
  props: any;
  setProps: (next: any) => void;
  mergeProps: (next: any, only?: string[]) => void;
  setRouteName: (name: string) => void;
  authLoaded: boolean;
  setAuthUser: (user: any | null, profilePhotoUrl?: string | null) => void;
  setSidebarNotifications: (next: Record<string, number>) => void;
}

export interface RouterStore {
  navigate: (to: string, options?: NavigateOptions) => void;
  setProps: (next: any) => void;
  mergeProps: (next: any, only?: string[]) => void;
  getProps: () => any;
  setRouteName: (name: string) => void;
  setAuthUser: (user: any | null, profilePhotoUrl?: string | null) => void;
  isAuthReady: () => boolean;
}
