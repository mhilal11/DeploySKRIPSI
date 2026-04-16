export function HeroSection() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden px-4 pb-12 pt-24 sm:px-6 md:pb-20 md:pt-32 lg:px-8"
    >
      <div className="absolute right-4 top-20 h-40 w-40 animate-pulse rounded-full bg-cyan-500/20 blur-3xl sm:right-10 sm:h-48 sm:w-48 md:h-72 md:w-72" />
      <div
        className="absolute bottom-16 left-0 h-52 w-52 animate-pulse rounded-full bg-purple-500/20 blur-3xl sm:left-10 sm:h-64 sm:w-64 md:h-96 md:w-96"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-blue-500/10 blur-3xl sm:h-80 sm:w-80 md:h-96 md:w-96"
        style={{ animationDelay: '0.5s' }}
      />

      <div className="mx-auto w-full max-w-5xl">
        <div className="flex justify-center">
          <div className="max-w-3xl space-y-6 text-center md:space-y-8">
            <h1 className="text-4xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-6xl xl:text-7xl">
              Internet Cepat &amp; Terpercaya untuk{' '}
              <span className="text-[#2F6DB5] drop-shadow-[0_2px_10px_rgba(47,109,181,0.35)]">
                Semua Orang
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-xl">
              Menghubungkan Anda ke dunia dengan kecepatan kilat.
            </p>

            <div className="flex flex-col flex-wrap justify-center gap-4 sm:flex-row">
              {/* tombol CTA sementara disembunyikan */}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-3 md:gap-6 md:pt-8">
              <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-2xl text-[#2F6DB5] md:text-3xl">
                  1K+
                </div>
                <div className="text-xs text-white/80 md:text-sm">
                  Pengguna Aktif
                </div>
              </div>
              <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-2xl text-[#2F6DB5] md:text-3xl">
                  99.9%
                </div>
                <div className="text-xs text-white/80 md:text-sm">Uptime</div>
              </div>
              <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-2xl text-[#2F6DB5] md:text-3xl">
                  24/7
                </div>
                <div className="text-xs text-white/80 md:text-sm">
                  Dukungan
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
