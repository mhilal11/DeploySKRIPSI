'use client';

import '@/runtime/bootstrap';
import AppRoutes from '@/runtime/router';
import { PageProvider } from '@/shared/lib';

export default function AppClientRoot() {
  return (
    <PageProvider>
      <AppRoutes />
    </PageProvider>
  );
}
