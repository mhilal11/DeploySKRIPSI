'use client';

import '@/runtime/bootstrap';

import { usePathname } from 'next/navigation';

import AppErrorBoundary from '@/runtime/AppErrorBoundary';
import AppRoutes from '@/runtime/router';
import { PageProvider } from '@/shared/lib';

export default function AppClientRoot() {
  const pathname = usePathname();

  // Keep SSR landing page as the source of truth for "/" while preserving
  // a single persistent client runtime for all non-root routes.
  if (pathname === '/' || pathname === '') {
    return null;
  }

  return (
    <AppErrorBoundary>
      <PageProvider>
        <AppRoutes />
      </PageProvider>
    </AppErrorBoundary>
  );
}
