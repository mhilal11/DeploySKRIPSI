import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LandingSSRPage from './page';

vi.mock('@/shared/components/SplashScreen', () => ({
  default: () => null,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LandingSSRPage', () => {
  it('renders fallback content when API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const ui = await LandingSSRPage();
    render(ui);

    expect(screen.getByText('Bergabung dengan')).toBeInTheDocument();
    expect(
      screen.getByText('Belum ada data lowongan ditampilkan saat ini.'),
    ).toBeInTheDocument();
  });

  it('renders jobs from API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        canLogin: true,
        canRegister: true,
        jobs: [
          {
            id: 1,
            title: 'Backend Engineer',
            division: 'Engineering',
            description: 'Go, SQL, and distributed systems',
            isHiring: true,
          },
        ],
      }),
    } as Response);

    const ui = await LandingSSRPage();
    render(ui);

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
  });
});
