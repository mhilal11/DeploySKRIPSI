import { Check, Star } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';

const plans = [
  {
    name: 'Dasar',
    price: '299',
    speed: '100 Mbps',
    features: [
      'Kecepatan download hingga 100 Mbps',
      'Data tidak terbatas',
      'Instalasi gratis',
      'Dukungan via email',
      'Termasuk 1 pengguna',
    ],
    popular: false,
  },
  {
    name: 'Standar',
    price: '499',
    speed: '500 Mbps',
    features: [
      'Kecepatan download hingga 500 Mbps',
      'Data tidak terbatas',
      'Instalasi & router gratis',
      'Dukungan prioritas 24/7',
      'Hingga 5 pengguna',
      'Paket keamanan gratis',
    ],
    popular: true,
  },
  {
    name: 'Premium',
    price: '799',
    speed: '1000 Mbps',
    features: [
      'Kecepatan download hingga 1 Gbps',
      'Data tidak terbatas',
      'Instalasi & router premium gratis',
      'Dukungan VIP 24/7',
      'Pengguna tidak terbatas',
      'Paket keamanan & kontrol orang tua gratis',
      'Alamat IP statis',
    ],
    popular: false,
  },
];

export function PricingSection() {
  useEffect(() => {
    let mounted = true;
    void import('aos').then(({ default: AOS }) => {
      if (!mounted) {
        return;
      }
      AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="pricing" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16" data-aos="fade-up">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Harga yang Sederhana & <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Transparan</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            Pilih paket yang sempurna untuk kebutuhan Anda. Semua paket termasuk data tidak terbatas dan tanpa kontrak.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              data-aos="fade-up"
              data-aos-delay={index * 100}
              className={`relative transition-transform duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-2 hover:scale-[1.03] ${
                plan.popular ? 'md:-mt-4' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1 rounded-full text-sm flex items-center gap-1 shadow-[0_4px_16px_rgba(34,211,238,0.5)] z-10 backdrop-blur-sm border border-cyan-400/30">
                  <Star className="w-4 h-4 fill-current" />
                  Paling Populer
                </div>
              )}

              {/* Card */}
              <div
                className={`h-full bg-white/15 backdrop-blur-[30px] rounded-[24px] p-6 md:p-8 shadow-[0_8px_32px_rgba(139,92,246,0.3)] border-2 ${
                  plan.popular
                    ? 'border-cyan-400/60 shadow-[0_8px_32px_rgba(34,211,238,0.4)]'
                    : 'border-white/30'
                }`}
              >
                {/* Plan Name */}
                <h3 className="text-2xl text-white mb-2">
                  {plan.name}
                </h3>
                
                {/* Speed */}
                <div className="text-cyan-400 mb-6">{plan.speed}</div>

                {/* Price */}
                <div className="mb-8">
                  <span className="text-4xl md:text-5xl text-white">Rp{plan.price}</span>
                  <span className="text-white/70">rb/bulan</span>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-400/40">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span className="text-white/90 text-sm md:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-[0_8px_32px_rgba(34,211,238,0.5)] border border-cyan-400/30'
                      : 'bg-white/20 border-2 border-white/40 text-white hover:bg-white/30 backdrop-blur-sm'
                  } rounded-[20px]`}
                >
                  Mulai Sekarang
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12" data-aos="fade-up" data-aos-delay="400">
          <p className="text-white/80">
            Semua paket dilengkapi dengan jaminan uang kembali 30 hari. Tanpa pertanyaan.
          </p>
        </div>
      </div>
    </section>
  );
}



