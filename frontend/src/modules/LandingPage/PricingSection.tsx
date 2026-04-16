import { Check, Star } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';

const plans = [
  {
    name: 'Dasar',
    speed: '20 Mbps',
    features: [
      'Kecepatan download hingga 20 Mbps',
      'Data Tidak Terbatas Tanpa FUP',
      'Tanpa Biaya Tambahan Perangkat',
      'Powerfull Support Customer Service',
    ],
    popular: false,
  },
  {
    name: 'Standar',
    speed: '30 Mbps',
    features: [
      'Kecepatan download hingga 30 Mbps',
      'Data Tidak Terbatas Tanpa FUP',
      'Tanpa Biaya Tambahan Perangkat',
      'Powerfull Support Customer Service',
    ],
    popular: true,
  },
  {
    name: 'Premium',
    speed: '50 Mbps',
    features: [
      'Kecepatan download hingga 50 Mbps',
      'Data Tidak Terbatas Tanpa FUP',
      'Tanpa Biaya Tambahan Perangkat',
      'Powerfull Support Customer Service',
    ],
    popular: false,
  },
];

const whatsappBaseUrl = 'https://wa.me/628174770006';

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
            Paket yang Fleksibel & <span className="text-[#2F6DB5]">Responsif</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            Pilih paket yang sesuai kebutuhan Anda lalu hubungi tim kami via WhatsApp untuk konsultasi dan penawaran terbaik.
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
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0F4C81] text-white px-4 py-1 rounded-full text-sm flex items-center gap-1 shadow-[0_4px_16px_rgba(47,109,181,0.35)] z-10 backdrop-blur-sm border border-[#2F6DB5]/30">
                  <Star className="w-4 h-4 fill-current" />
                  Paling Populer
                </div>
              )}

              {/* Card */}
              <div
                className={`h-full bg-white/15 backdrop-blur-[30px] rounded-[24px] p-6 md:p-8 shadow-[0_8px_32px_rgba(24,39,75,0.35)] border-2 ${
                  plan.popular
                    ? 'border-[#2F6DB5]/60 shadow-[0_8px_32px_rgba(47,109,181,0.32)]'
                    : 'border-white/30'
                }`}
              >
                {/* Plan Name */}
                <h3 className="text-2xl text-white mb-2">
                  {plan.name}
                </h3>
                
                {/* Speed */}
                <div className="text-[#4A90D9] mb-6">{plan.speed}</div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0F4C81]/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#2F6DB5]/40">
                        <Check className="w-3 h-3 text-[#4A90D9]" />
                      </div>
                      <span className="text-white/90 text-sm md:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  asChild
                  className={`w-full ${
                    plan.popular
                      ? 'bg-[#0F4C81] hover:bg-[#0C3E6B] text-white shadow-[0_8px_32px_rgba(47,109,181,0.32)] border border-[#2F6DB5]/30'
                      : 'bg-white/20 border-2 border-white/40 text-white hover:bg-white/30 backdrop-blur-sm'
                  } rounded-[20px]`}
                >
                  <a
                    href={`${whatsappBaseUrl}?text=${encodeURIComponent(`Halo, saya ingin konsultasi paket ${plan.name} (${plan.speed}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Hubungi via WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12" data-aos="fade-up" data-aos-delay="400">
          <p className="text-white/80">
            Tim kami siap membantu memilih paket yang paling sesuai untuk kebutuhan rumah maupun bisnis Anda.
          </p>
        </div>
      </div>
    </section>
  );
}


