import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

const logo = '/img/LogoLDP.png';

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
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center" data-aos="fade-up">
            <div>
              <h3 className="text-2xl md:text-3xl mb-2 text-white">Tetap Terhubung</h3>
              <p className="text-white/80">
                Berlangganan newsletter kami untuk pembaruan terbaru dan penawaran eksklusif.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Masukkan email Anda"
                className="bg-white/15 border-white/30 text-white placeholder:text-white/60 focus:border-cyan-400/50 backdrop-blur-sm rounded-[16px]"
              />
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white whitespace-nowrap backdrop-blur-sm border border-cyan-400/30 rounded-[16px] shadow-[0_4px_16px_rgba(34,211,238,0.4)]">
                Berlangganan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
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
              {[
                { icon: Facebook, href: '#' },
                { icon: Twitter, href: '#' },
                { icon: Instagram, href: '#' },
                { icon: Linkedin, href: '#' },
              ].map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 bg-white/15 hover:bg-cyan-500/30 border border-white/20 hover:border-cyan-400/50 rounded-[12px] flex items-center justify-center transition-all backdrop-blur-sm"
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div data-aos="fade-up" data-aos-delay="100">
            <h4 className="mb-6 text-white">Tautan Cepat</h4>
            <ul className="space-y-3">
              {['Tentang Kami', 'Layanan', 'Harga', 'Karir', 'Blog', 'FAQ'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-white/80 hover:text-cyan-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div data-aos="fade-up" data-aos-delay="200">
            <h4 className="mb-6 text-white">Layanan</h4>
            <ul className="space-y-3">
              {['Internet Residensial', 'Solusi Bisnis', 'Fiber Optik', 'TV & Streaming', 'Layanan Telepon', 'Dukungan Teknis'].map((service) => (
                <li key={service}>
                  <a href="#" className="text-white/80 hover:text-cyan-400 transition-colors">
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div data-aos="fade-up" data-aos-delay="300">
            <h4 className="mb-6 text-white">Hubungi Kami</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-white/80 text-sm">
                  Jl. Sudirman No. 123<br />
                  Jakarta 12190, Indonesia
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <span className="text-white/80 text-sm">021-555-0123</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <span className="text-white/80 text-sm">info@lintasdataprima.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/70 text-sm">
            <p>&copy; 2025 Lintas Data Prima. Hak cipta dilindungi.</p>
            <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
              <a href="#" className="hover:text-cyan-400 transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Syarat Layanan</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Kebijakan Cookie</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}



