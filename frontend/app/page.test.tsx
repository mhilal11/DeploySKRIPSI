import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LandingSSRPage from './page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LandingSSRPage', () => {
  it('renders fallback content when API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const ui = await LandingSSRPage();
    render(ui);

    expect(screen.getByText('Platform SDM Terintegrasi')).toBeInTheDocument();
    expect(screen.getByText('Belum ada lowongan aktif.')).toBeInTheDocument();
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
          },
        ],
      }),
    } as Response);

    const ui = await LandingSSRPage();
    render(ui);

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });
});
