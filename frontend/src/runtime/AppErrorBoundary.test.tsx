import { render, screen } from '@testing-library/react';

import AppErrorBoundary from './AppErrorBoundary';

function CrashingComponent(): never {
  throw new Error('boom');
}

describe('AppErrorBoundary', () => {
  it('renders fallback UI when child throws', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <CrashingComponent />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Terjadi kesalahan pada halaman.')).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });
});
