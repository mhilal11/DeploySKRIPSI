import type { route as routeFn } from '@/shared/lib/route';

import type { PageProps as AppPageProps } from './';
import type { AxiosInstance } from 'axios';
import type Echo from 'laravel-echo';
import type Pusher from 'pusher-js';

declare global {
  interface Window {
    axios: AxiosInstance;
    route: typeof routeFn;
    Echo?: Echo;
    Pusher?: typeof Pusher;
    Ziggy?: {
      routes?: Record<string, unknown>;
    };
  }

  var route: typeof routeFn;
}

export interface FlashProps {
  success?: string;
  error?: string;
  generated_password?: string;
}

export interface PageProps extends AppPageProps {
  flash?: FlashProps;
}


