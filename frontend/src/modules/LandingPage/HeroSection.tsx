import { gsap } from 'gsap';
import { ArrowRight, MapPin, Wifi, Zap, Globe } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/shared/components/ui/button';

const ORBIT_POINTS = [
  { x: 100, y: 0 },
  { x: 50, y: 86.6025 },
  { x: -50, y: 86.6025 },
  { x: -100, y: 0 },
  { x: -50, y: -86.6025 },
  { x: 50, y: -86.6025 },
];

export function HeroSection() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const illustrationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const buttonChildren = buttonsRef.current
      ? Array.from(buttonsRef.current.children)
      : [];
    const statChildren = statsRef.current
      ? Array.from(statsRef.current.children)
      : [];

    if (headingRef.current) {
      tl.from(headingRef.current, {
        opacity: 0,
        y: 50,
        duration: 1,
      });
    }

    if (subtextRef.current) {
      tl.from(
        subtextRef.current,
        {
          opacity: 0,
          y: 30,
          duration: 0.8,
        },
        '-=0.5'
      );
    }

    if (buttonChildren.length > 0) {
      tl.from(
        buttonChildren,
        {
          opacity: 0,
          y: 20,
          stagger: 0.2,
          duration: 0.6,
        },
        '-=0.4'
      );
    }

    if (statChildren.length > 0) {
      tl.from(
        statChildren,
        {
          opacity: 0,
          y: 20,
          stagger: 0.15,
          duration: 0.6,
        },
        '-=0.3'
      );
    }

    if (illustrationRef.current) {
      tl.from(
        illustrationRef.current,
        {
          opacity: 0,
          scale: 0.8,
          duration: 1,
        },
        '-=1'
      );
    }
  }, []);

  return (
    <section
      id="home"
      className="relative pt-24 md:pt-32 pb-12 md:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex items-center"
    >
      {/* Animated Background Elements */}
      <div className="absolute top-20 right-10 w-48 h-48 md:w-72 md:h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 left-10 w-64 h-64 md:w-96 md:h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '0.5s' }}
      />

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6 md:space-y-8 text-center lg:text-left">
            <h1
              ref={headingRef}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
            >
              Internet Cepat &amp; Terpercaya untuk{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(34,211,238,0.3)]">
                Semua Orang
              </span>
            </h1>

            <p
              ref={subtextRef}
              className="text-lg sm:text-xl text-white/90 max-w-xl mx-auto lg:mx-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            >
              Menghubungkan Anda ke dunia dengan kecepatan kilat.
            </p>

            <div
              ref={buttonsRef}
              className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start"
            >
              {/* <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-[0_8px_32px_rgba(34,211,238,0.5)] border border-cyan-400/30 backdrop-blur-sm group w-full sm:w-auto rounded-2xl"
              >
                Mulai Sekarang
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm group w-full sm:w-auto rounded-2xl shadow-[0_4px_16px_rgba(255,255,255,0.1)]"
              >
                <MapPin className="mr-2 w-5 h-5" />
                Cek Jangkauan
              </Button> */}
            </div>

            {/* Stats */}
            <div
              ref={statsRef}
              className="grid grid-cols-3 gap-4 md:gap-6 pt-8"
            >
              <div className="space-y-1 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
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
          <div ref={illustrationRef} className="relative">
            <div className="relative bg-white/15 backdrop-blur-[30px] rounded-[28px] p-8 md:p-12 shadow-[0_8px_32px_rgba(139,92,246,0.4)] border border-white/30">
              {/* Network Illustration */}
              <div className="relative">
                {/* Center Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(34,211,238,0.5)] z-10 border border-cyan-400/50">
                  <Wifi className="w-10 h-10 md:w-12 md:h-12 text-cyan-300" />
                </div>

                {/* Orbiting Nodes */}
                <div className="relative w-full aspect-square">
                  {ORBIT_POINTS.map((point, index) => {
                    return (
                      <div
                        key={index}
                        className="absolute top-1/2 left-1/2 w-12 h-12 md:w-16 md:h-16 bg-white/15 backdrop-blur-lg rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(139,92,246,0.3)] animate-pulse border border-white/30"
                        style={{
                          transform: `translate(calc(-50% + ${point.x}px), calc(-50% + ${point.y}px))`,
                          animationDelay: `${index * 0.2}s`,
                        }}
                      >
                        {index % 3 === 0 ? (
                          <Zap className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
                        ) : index % 3 === 1 ? (
                          <Globe className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                        ) : (
                          <Wifi className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />
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
                        x2={`calc(50% + ${point.x}px)`}
                        y2={`calc(50% + ${point.y}px)`}
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
            <div className="absolute -bottom-4 md:-bottom-6 -left-4 md:-left-6 bg-white/20 backdrop-blur-[30px] rounded-[24px] p-4 md:p-6 shadow-[0_8px_32px_rgba(34,211,238,0.4)] border border-cyan-400/40">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-[0_4px_16px_rgba(34,211,238,0.6)]">
                  <span className="text-lg md:text-xl"></span>
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



