import { Zap, Headphones, Network, DollarSign } from 'lucide-react';
import { MouseEvent, useEffect } from 'react';

const features = [
  {
    icon: Zap,
    title: 'Kecepatan Tinggi',
    description: 'Nikmati kecepatan internet super cepat hingga 50 Mbps untuk streaming dan gaming yang lancar.',
    iconClass: 'bg-[#0F4C81]',
    glowClass: 'bg-[#0F4C81]',
    animation: 'fade-right',
  },
  {
    icon: Headphones,
    title: 'Dukungan 24/7',
    description: 'Tim dukungan kami yang berdedikasi selalu siap membantu Anda, kapan saja, dimana saja.',
    iconClass: 'bg-[#1C5FA0]',
    glowClass: 'bg-[#1C5FA0]',
    animation: 'fade-up',
  },
  {
    icon: Network,
    title: 'Jaringan Fiber Optik',
    description: 'Infrastruktur masa depan dengan teknologi 100% fiber optik untuk konektivitas yang andal.',
    iconClass: 'bg-[#15508A]',
    glowClass: 'bg-[#15508A]',
    animation: 'fade-up',
  },
  {
    icon: DollarSign,
    title: 'Paket Terjangkau',
    description: 'Pilihan harga yang fleksibel sesuai dengan budget Anda tanpa mengorbankan kualitas.',
    iconClass: 'bg-[#0B3F6E]',
    glowClass: 'bg-[#0B3F6E]',
    animation: 'fade-left',
  },
];

export function FeaturesSection() {
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

  const handlePricingNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '#pricing');
    }
  };

  return (
    <section id="services" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16" data-aos="fade-up">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Mengapa Memilih <span className="text-[#2F6DB5]">Lintas Data Prima</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            Kami memberikan layanan internet luar biasa dengan teknologi terdepan dan pendekatan yang mengutamakan pelanggan.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                data-aos={feature.animation}
                data-aos-delay={index * 100}
                className="group relative"
              >
                {/* Card */}
                <div className="h-full bg-white/15 backdrop-blur-[30px] border border-white/30 rounded-[24px] p-8 shadow-[0_8px_32px_rgba(24,39,75,0.35)] hover:shadow-[0_16px_48px_rgba(47,109,181,0.32)] transition-all duration-300 hover:-translate-y-2">
                  {/* Icon */}
                  <div className={`w-16 h-16 ${feature.iconClass} rounded-[20px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-[0_4px_16px_rgba(47,109,181,0.3)]`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/80">
                    {feature.description}
                  </p>

                  {/* Hover Effect Border */}
                  <div className={`absolute inset-0 rounded-[24px] ${feature.glowClass} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center" data-aos="fade-up" data-aos-delay="400">
          <p className="text-white/80 mb-4">
            Siap merasakan perbedaannya?
          </p>
          <a
            href="#pricing"
            onClick={handlePricingNavigate}
            className="inline-block px-8 py-3 bg-[#0F4C81] hover:bg-[#0C3E6B] text-white rounded-[20px] transition-all shadow-[0_8px_32px_rgba(47,109,181,0.28)] hover:shadow-[0_8px_32px_rgba(47,109,181,0.4)] backdrop-blur-sm border border-[#2F6DB5]/30"
          >
            Lihat Paket Kami
          </a>
        </div>
      </div>
    </section>
  );
}
