import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { markLandingSplashSkipOnce } from '@/shared/lib/landing-splash';

const logo = '/img/LogoLDP.png';

type NavbarProps = {
  canLogin?: boolean;
  canRegister?: boolean;
};

export function Navbar({ canLogin = true, canRegister = true }: NavbarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Beranda aktif saat pertama kali masuk
  const [activeItem, setActiveItem] = useState<string>('#home');

  const closeSidebar = () => setIsSidebarOpen(false);
  const handleAuthNavigate = () => {
    markLandingSplashSkipOnce();
    setIsSidebarOpen(false);
  };

  const menuItems = [
    { label: 'Beranda', href: '#home' },
    { label: 'Layanan', href: '#services' },
    { label: 'Harga', href: '#pricing' },
    { label: 'Karir', href: '#careers' },
    { label: 'Kontak', href: '#contact' },
  ];

  const handleMenuClick = (
    e: MouseEvent<HTMLAnchorElement>,
    href: string,
    options?: { closeSidebar?: boolean }
  ) => {
    e.preventDefault();

    setActiveItem(href);

    const id = href.replace('#', '');
    const el = document.getElementById(id);

    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    if (options?.closeSidebar) {
      setIsSidebarOpen(false);
    }

    // opsional: update hash URL
    if (typeof window !== 'undefined' && href.startsWith('#')) {
      window.history.replaceState(null, '', href);
    }
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-[40px] border-b border-white/20 shadow-[0_8px_32px_rgba(139,92,246,0.15)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16 md:h-20">
            {/* Logo kiri */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Image
                src={logo}
                alt="Lintas Data Prima"
                width={48}
                height={48}
                className="w-10 h-10 md:w-12 md:h-12"
                priority
              />
              <span className="text-white hidden sm:inline">
                Lintas Data Prima
              </span>
            </div>

            {/* Menu desktop (tengah) */}
            <div
              className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2"
            >
              {menuItems.map((item) => {
                const isActive = activeItem === item.href;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleMenuClick(e, item.href)}
                    className={
                      'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-sm md:text-base transition-all duration-200 cursor-pointer hover:scale-105 ' +
                      (isActive
                        ? 'border-white/70 bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.15)]'
                        : 'border-transparent text-white/85 hover:text-white hover:border-white/40 hover:bg-white/5')
                    }
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>

            {/* Tombol kanan (desktop) */}
            <div className="hidden md:flex items-center gap-3 ml-auto">
              {canLogin && (
                <Button
                  asChild
                  variant="ghost"
                  className="text-white hover:text-white bg-white/10 hover:bg-white/15 border border-white/30 backdrop-blur-sm"
                >
                  <Link href="/login" onClick={handleAuthNavigate}>Masuk</Link>
                </Button>
              )}
              {canRegister && (
                <Button
                  asChild
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border border-cyan-400/40 shadow-[0_6px_20px_rgba(34,211,238,0.3)]"
                >
                  <Link href="/register" onClick={handleAuthNavigate}>Daftar</Link>
                </Button>
              )}
            </div>

            {/* Tombol menu mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden ml-auto p-2 text-white hover:text-white/80 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay sidebar mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar mobile */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-72 bg-white/10 backdrop-blur-[40px] shadow-[0_8px_32px_rgba(139,92,246,0.3)] z-50 lg:hidden border-l border-white/20 transition-transform duration-300 ease-out ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header sidebar */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-2">
              <Image src={logo} alt="Lintas Data Prima" width={32} height={32} className="w-8 h-8" />
              <span className="text-white">Lintas Data Prima</span>
            </div>
            <button
              onClick={closeSidebar}
              className="p-2 text-white hover:text-white/80 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu sidebar */}
          <div className="flex-1 overflow-y-auto py-6">
            <nav className="space-y-2 px-4">
              {menuItems.map((item) => {
                const isActive = activeItem === item.href;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) =>
                      handleMenuClick(e, item.href, { closeSidebar: true })
                    }
                    className={
                      'block px-4 py-3 rounded-2xl border transition-colors backdrop-blur-sm ' +
                      (isActive
                        ? 'bg-white/15 text-white border-white/40'
                        : 'border-transparent text-white/90 hover:text-white hover:bg-white/10 hover:border-white/30')
                    }
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Footer sidebar */}
          <div className="p-6 border-t border-white/20 space-y-3">
            {canLogin && (
              <Button
                asChild
                variant="ghost"
                className="w-full text-white hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20"
              >
                <Link href="/login" onClick={handleAuthNavigate}>Masuk</Link>
              </Button>
            )}
            {canRegister && (
              <Button
                asChild
                className="w-full bg-white/20 hover:bg-white/30 text-white shadow-[0_8px_32px_rgba(139,92,246,0.3)] border border-white/30 backdrop-blur-sm"
              >
                <Link href="/register" onClick={handleAuthNavigate}>Daftar</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}





