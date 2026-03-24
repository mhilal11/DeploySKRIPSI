import { Wifi, Zap, Globe } from 'lucide-react';

const ORBIT_POINTS = [
  { x: 100, y: 0 },
  { x: 50, y: 86.6025 },
  { x: -50, y: 86.6025 },
  { x: -100, y: 0 },
  { x: -50, y: -86.6025 },
  { x: 50, y: -86.6025 },
];

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden px-4 pb-12 pt-24 sm:px-6 md:pb-20 md:pt-32 lg:px-8"
    >
      {/* Animated Background Elements */}
      <div className="absolute right-4 top-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl animate-pulse sm:right-10 sm:h-48 sm:w-48 md:h-72 md:w-72" />
      <div
        className="absolute bottom-16 left-0 h-52 w-52 rounded-full bg-purple-500/20 blur-3xl animate-pulse sm:left-10 sm:h-64 sm:w-64 md:h-96 md:w-96"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl animate-pulse sm:h-80 sm:w-80 md:h-96 md:w-96"
        style={{ animationDelay: '0.5s' }}
      />

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6 md:space-y-8 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              Internet Cepat &amp; Terpercaya untuk{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(34,211,238,0.3)]">
                Semua Orang
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/90 max-w-xl mx-auto lg:mx-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              Menghubungkan Anda ke dunia dengan kecepatan kilat.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
              {/* tombol CTA sementara disembunyikan */}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-3 md:gap-6 md:pt-8">
              <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  1J+
                </div>
                <div className="text-xs md:text-sm text-white/80">
                  Pengguna Aktif
                </div>
              </div>
              <div className="space-y-1 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  99.9%
                </div>
                <div className="text-xs md:text-sm text-white/80">Uptime</div>
              </div>
              <div className="space-y-1 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-2xl md:text-3xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  24/7
                </div>
                <div className="text-xs md:text-sm text-white/80">
                  Dukungan
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Illustration */}
          <div className="relative mx-auto w-full max-w-[22rem] sm:max-w-[26rem] lg:max-w-none">
            <div className="relative rounded-[28px] border border-white/30 bg-white/15 p-5 shadow-[0_8px_32px_rgba(139,92,246,0.4)] backdrop-blur-[30px] sm:p-8 md:p-12">
              {/* Network Illustration */}
              <div className="relative">
                {/* Center Node */}
                <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/50 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 shadow-[0_8px_32px_rgba(34,211,238,0.5)] backdrop-blur-sm sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <Wifi className="h-8 w-8 text-cyan-300 sm:h-10 sm:w-10 md:h-12 md:w-12" />
                </div>

                {/* Orbiting Nodes */}
                <div className="relative w-full aspect-square">
                  {ORBIT_POINTS.map((point, index) => {
                    return (
                      <div
                        key={index}
                        className="absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-[0_8px_32px_rgba(139,92,246,0.3)] animate-pulse backdrop-blur-lg sm:h-12 sm:w-12 md:h-16 md:w-16"
                        style={{
                          transform: `translate(calc(-50% + ${point.x * 0.7}px), calc(-50% + ${point.y * 0.7}px))`,
                          animationDelay: `${index * 0.2}s`,
                        }}
                      >
                        {index % 3 === 0 ? (
                          <Zap className="h-5 w-5 text-cyan-400 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                        ) : index % 3 === 1 ? (
                          <Globe className="h-5 w-5 text-blue-400 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                        ) : (
                          <Wifi className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Connection Lines */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  style={{ zIndex: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="lineGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        style={{
                          stopColor: 'rgba(34,211,238,0.6)',
                          stopOpacity: 1,
                        }}
                      />
                      <stop
                        offset="100%"
                        style={{
                          stopColor: 'rgba(139,92,246,0.2)',
                          stopOpacity: 1,
                        }}
                      />
                    </linearGradient>
                  </defs>
                  {ORBIT_POINTS.map((point, index) => {
                    return (
                      <line
                        key={index}
                        x1="50%"
                        y1="50%"
                        x2={`calc(50% + ${point.x * 0.7}px)`}
                        y2={`calc(50% + ${point.y * 0.7}px)`}
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        className="animate-pulse"
                        style={{ animationDelay: `${index * 0.2}s` }}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Floating Card */}
            <div className="mt-4 w-full max-w-[16rem] rounded-[24px] border border-cyan-400/40 bg-white/20 p-4 shadow-[0_8px_32px_rgba(34,211,238,0.4)] backdrop-blur-[30px] sm:absolute sm:-bottom-6 sm:-left-4 sm:mt-0 md:-left-6 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_4px_16px_rgba(34,211,238,0.6)] md:h-12 md:w-12">
                  <span className="text-lg md:text-xl">⚡</span>
                </div>
                <div>
                  <div className="text-xl md:text-2xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    1000 Mbps
                  </div>
                  <div className="text-xs md:text-sm text-white/80">
                    Max Speed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
