import {
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    User,
    X,
    ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Link, router, usePage } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

interface NavbarProps {
    // Reserved for future props if needed
}

interface NavItem {
    label: string;
    icon: any;
    routeName: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, routeName: 'pelamar.dashboard' },
    { label: 'Lamaran Saya', icon: FileText, routeName: 'pelamar.applications' },
];

export default function Navbar({ }: NavbarProps) {
    const { props: { auth } } = usePage<PageProps>();
    const user = auth?.user;
    const profilePhotoUrl = auth?.profilePhotoUrl;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            // Clear previous timeout
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }

            // Add debounce delay for smoother behavior
            scrollTimeout.current = setTimeout(() => {
                const currentScrollY = window.scrollY;

                // Don't hide navbar if dropdown is open
                if (isDropdownOpen) {
                    return;
                }

                // Show navbar when at top
                if (currentScrollY < 10) {
                    setIsVisible(true);
                }
                // Hide when scrolling down, show when scrolling up
                else if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
                    setIsVisible(false);
                    setIsMobileMenuOpen(false); // Close mobile menu when hiding
                } else if (currentScrollY < lastScrollY.current - 10) {
                    setIsVisible(true);
                }

                lastScrollY.current = currentScrollY;
            }, 150); // 150ms debounce delay
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, [isDropdownOpen]);

    return (
        <nav
            className={`
                fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm
                transition-transform duration-500 ease-in-out
                ${isVisible ? 'translate-y-0' : '-translate-y-full'}
            `}
        >
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/Brand - Left */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/img/LogoLDP.png"
                                alt="LDP Logo"
                                width={40}
                                height={40}
                                className="h-10 w-10 object-contain"
                            />
                            <div className="hidden sm:block">
                                <p className="text-[9px] uppercase tracking-widest text-blue-900 font-semibold">
                                    PT. Lintas Data Prima
                                </p>
                                <p className="text-sm font-bold text-slate-900">Portal Pelamar</p>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Navigation - Center */}
                    <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = route().current(item.routeName);

                            return (
                                <Link
                                    key={item.routeName}
                                    href={route(item.routeName)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                        transition-all
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Profile & Mobile Toggle - Right */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* Profile Menu - Responsive */}
                        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2 px-2 md:px-3 py-2 h-auto"
                                >
                                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                                        {profilePhotoUrl ? (
                                            <Image
                                                src={profilePhotoUrl}
                                                alt="Foto profil"
                                                width={32}
                                                height={32}
                                                unoptimized
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-4 w-4 text-white" />
                                        )}
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                                        <p className="text-[10px] text-slate-500">{user?.email}</p>
                                    </div>
                                    <ChevronDown className="hidden md:block h-4 w-4 text-slate-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <p className="text-xs font-semibold">{user?.name}</p>
                                    <p className="text-[10px] text-slate-500 font-normal">{user?.email}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('pelamar.profile')}
                                        className="cursor-pointer flex items-center"
                                    >
                                        <User className="h-4 w-4 mr-2" />
                                        Profil
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => router.post(route('logout'))}
                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Keluar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white">
                    <div className="px-4 py-3 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = route().current(item.routeName);

                            return (
                                <Link
                                    key={item.routeName}
                                    href={route(item.routeName)}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                                        transition-all
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}



