import Link from 'next/link';

type LandingData = {
  canLogin: boolean;
  canRegister: boolean;
  jobs: Array<Record<string, unknown>>;
};

function backendBaseURL(): string {
  const envOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
  if (envOrigin && envOrigin.trim() !== '') {
    return envOrigin.replace(/\/$/, '');
  }
  return 'http://localhost:8080';
}

async function fetchLandingData(): Promise<LandingData> {
  const fallback: LandingData = {
    canLogin: true,
    canRegister: true,
    jobs: [],
  };

  try {
    const response = await fetch(`${backendBaseURL()}/api/public/landing`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return fallback;
    }
    const data = (await response.json()) as Partial<LandingData>;
    return {
      canLogin: Boolean(data.canLogin),
      canRegister: Boolean(data.canRegister),
      jobs: Array.isArray(data.jobs) ? data.jobs : [],
    };
  } catch {
    return fallback;
  }
}

export default async function LandingSSRPage() {
  const data = await fetchLandingData();
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">HRIS LDP</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Platform SDM Terintegrasi
            </h1>
            <p className="mt-4 max-w-2xl text-slate-300">
              Halaman ini dirender server-side untuk performa awal yang lebih cepat.
            </p>
          </div>
          <div className="flex gap-3">
            {data.canLogin && (
              <Link
                href="/login"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
              >
                Masuk
              </Link>
            )}
            {data.canRegister && (
              <Link
                href="/register"
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm text-slate-900 hover:bg-cyan-400"
              >
                Daftar
              </Link>
            )}
          </div>
        </header>

        <section className="mt-12">
          <h2 className="text-xl font-medium">Lowongan Aktif</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.jobs.length === 0 && (
              <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-300">Belum ada lowongan aktif.</p>
              </article>
            )}
            {data.jobs.map((job, index) => (
              <article
                key={`${String(job.id ?? 'job')}-${index}`}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <h3 className="text-lg font-medium text-cyan-200">{String(job.title ?? '-')}</h3>
                <p className="mt-2 text-sm text-slate-300">{String(job.division ?? '-')}</p>
                <p className="mt-2 text-sm text-slate-400">{String(job.description ?? '-')}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
