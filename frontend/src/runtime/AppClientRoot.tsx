'use client';

import '@/runtime/bootstrap';
import AppErrorBoundary from '@/runtime/AppErrorBoundary';
import AppRoutes from '@/runtime/router';
import { PageProvider } from '@/shared/lib';

export default function AppClientRoot() {
  return (
    <AppErrorBoundary>
      <PageProvider>
        <AppRoutes />
      </PageProvider>
    </AppErrorBoundary>
  );
}
