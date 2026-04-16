import { Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';

const logo = '/img/LogoLDP.png';
const socialLinks = [
  {
    icon: Instagram,
    href: 'https://www.instagram.com/lintasdataprima/',
    label: 'Instagram',
  },
  {
    icon: Linkedin,
    href: 'https://www.linkedin.com/company/pt-lintas-data-prima/',
    label: 'LinkedIn',
  },
];

export function ContactSection() {
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
    <footer id="contact" className="bg-black/40 backdrop-blur-sm text-white border-t border-white/10">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-8 md:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* Company Info */}
          <div data-aos="fade-up" data-aos-delay="0">
            <div className="flex items-center gap-2 mb-6">
              <Image src={logo} alt="Lintas Data Prima" width={40} height={40} className="w-10 h-10" />
              <span className="text-xl text-white">Lintas Data Prima</span>
            </div>
            <p className="text-white/80 mb-6">
              Memberikan internet cepat dan andal kepada jutaan pelanggan di seluruh Indonesia.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="w-10 h-10 bg-white/15 hover:bg-[#0F4C81]/30 border border-white/20 hover:border-[#2F6DB5]/50 rounded-[12px] flex items-center justify-center transition-all backdrop-blur-sm"
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Contact Info */}
          <div data-aos="fade-up" data-aos-delay="100" className="lg:justify-self-end lg:max-w-md">
            <h4 className="mb-6 text-white">Hubungi Kami</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#4A90D9] flex-shrink-0 mt-0.5" />
                <span className="text-white/80 text-sm">
                  Darmo Residence No.1, Sonopakis Kidul, Ngestiharjo, Kasihan,
                  Bantul Regency, Special Region of Yogyakarta 55187
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#4A90D9] flex-shrink-0" />
                <span className="text-white/80 text-sm">(0274)415632</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#4A90D9] flex-shrink-0" />
                <span className="break-all text-sm text-white/80">sales@ldp.net.id</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center text-center text-sm text-white/70">
            <p>&copy; 2025 Lintas Data Prima. Hak cipta dilindungi.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}



