'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep console logging so errors remain visible during debugging and monitoring hooks.
    console.error('Unhandled UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
          <section className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg text-slate-900">Terjadi kesalahan pada halaman.</h1>
            <p className="mt-2 text-sm text-slate-600">
              Silakan muat ulang halaman. Jika masalah berulang, hubungi administrator.
            </p>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
