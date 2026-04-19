import { Mail, LayoutDashboard, X, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
 
import { Link, usePage, usePageManager, router } from '@/shared/lib/inertia';
import { cn } from '@/shared/lib/utils'; // Pastikan Anda memiliki utility ini
import type { PageProps } from '@/shared/types';

type NavItem = {
    label: string;
    icon: any;
    route: string;
    pattern: string;
    notificationKey?: string;
};

const nav: NavItem[] = [
    {
        label: 'Dashboard',
        icon: LayoutDashboard,
        route: 'admin-staff.dashboard',
        pattern: 'admin-staff.dashboard',
    },
    {
        label: 'Kelola Surat',
        icon: Mail,
        route: 'admin-staff.letters',
        pattern: 'admin-staff.letters',
        notificationKey: 'admin-staff.letters',
    },
];

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

export default function Sidebar({ isOpen, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
    const {
        props: { auth, sidebarNotifications = {} },
    } = usePage<PageProps>();
    const { authLoaded } = usePageManager();

    const user = auth.user;
    const logoutDisabled = !authLoaded;

    const handleNavClick = () => {
        // Pada tampilan mobile, sidebar harus ditutup setelah navigasi
        onMobileClose();
    };

    // Tentukan apakah konten harus ditampilkan (expanded desktop atau mobile open)
    const isContentVisible = isOpen || isMobileOpen;
    
    // Kelas default untuk skema warna: bg-blue-900 text-white
    const baseColorClasses = 'bg-blue-900 text-white';

    return (
        <>
            {/* Overlay untuk Mobile */}
            {isMobileOpen && (
                <div 
                    onClick={onMobileClose} 
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden" 
                />
            )}
            
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 shadow-lg transition-[width,transform] duration-300 ease-in-out flex flex-col h-screen will-change-[width]',
                    // Skema warna UNIFORM (Biru Gelap / Putih)
                    baseColorClasses,
                    
                    // Desktop state
                    isOpen ? 'w-52' : 'w-16',
                    // Mobile state (default: hidden, if isMobileOpen: visible)
                    'max-md:-translate-x-full max-md:w-52',
                    isMobileOpen && 'max-md:translate-x-0'
                )}
            >
                {/* Header - Fixed */}
                <div
                    className={cn(
                        'flex items-center px-4 h-16 md:h-20 shrink-0 border-b border-blue-800',
                        isOpen ? 'justify-between' : 'justify-center',
                        'max-md:justify-between',
                    )}
                >
                    <div
                        className={cn(
                            'grid transition-[grid-template-columns] duration-300 ease-in-out',
                            isContentVisible ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
                        )}
                    >
                        <div
                            className={cn(
                                'overflow-hidden whitespace-nowrap transition-opacity duration-300',
                                isContentVisible ? 'opacity-100' : 'opacity-0'
                            )}
                        >
                            <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-blue-200">
                                PT. Lintas Data Prima
                            </p>
                            <p className="text-base md:text-lg font-semibold text-white">Staff Portal</p>
                            <p className="text-[8px] md:text-[10px] text-blue-200">
                                HRIS Portal
                            </p>
                        </div>
                    </div>
                    {/* Desktop toggle button */}
                    <button
                        onClick={onToggle}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors hidden md:block"
                        title={isOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
                    >
                        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {/* Mobile close button (Menggunakan skema warna Desktop) */}
                    <button
                        onClick={onMobileClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors md:hidden"
                        title="Tutup Menu"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Nav Items - Scrollable */}
                <nav className="flex-1 flex flex-col gap-1 px-2 md:px-3 overflow-y-auto py-2 min-h-0">
                    {nav.map((item) => {
                        const Icon = item.icon;
                        const active = route().current(item.pattern);
                        const notificationCount =
                            sidebarNotifications?.[item.notificationKey ?? item.route] ?? 0;

                        return (
                            <Link
                                key={item.label}
                                href={route(item.route)}
                                title={!isOpen ? item.label : undefined}
                                onClick={handleNavClick}
                                className={cn(
                                    'flex items-center rounded-lg transition-all duration-200 group relative',
                                    isContentVisible ? 'gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2' : 'justify-center p-3',
                                    // Warna Navigasi UNIFORM (menggunakan kelas desktop)
                                    active
                                        ? 'bg-white/15 text-white' // Active: Putih/15 di semua tampilan
                                        : 'text-blue-100 hover:bg-white/10' // Normal: Biru-100 di semua tampilan
                                )}
                            >
                                <Icon className={cn("shrink-0", isContentVisible ? "h-3.5 w-3.5" : "h-4 w-4")} />
                                
                                <div className={cn(
                                    "grid transition-[grid-template-columns] duration-300 ease-in-out flex-1",
                                    isContentVisible ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                                )}>
                                    <span className={cn(
                                        "flex items-center justify-between overflow-hidden transition-opacity duration-300 min-w-0",
                                        isContentVisible ? "opacity-100" : "opacity-0"
                                    )}>
                                        <span className="truncate text-xs">{item.label}</span>
                                        {notificationCount > 0 && (
                                            <span className="ml-auto inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                                {notificationCount > 99 ? '99+' : notificationCount.toString()}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                {/* Badge untuk collapsed state (desktop only) */}
                                {!isOpen && !isMobileOpen && notificationCount > 0 && (
                                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-blue-900 hidden md:block" />
                                )}

                            </Link>
                        );
                    })}
                </nav>

                {/* Footer - Fixed at bottom */}
                <div 
                    className={cn(
                        "p-3 md:p-4 shrink-0 overflow-hidden border-t border-blue-800",
                    )}
                >
                    {/* Expanded Footer (Desktop Open / Mobile Open) */}
                    <div className={cn(
                        "transition-all duration-300 ease-in-out",
                        isContentVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full absolute pointer-events-none"
                    )}>
                        <div className="space-y-2 md:space-y-4">
                            <div>
                                <p className="text-[8px] md:text-[10px] uppercase tracking-wide text-blue-300">
                                    Masuk sebagai
                                </p>
                                <p className="text-[10px] md:text-xs font-semibold truncate text-white">{user.name}</p>
                                {user.division && <p className="text-[8px] md:text-[10px] truncate text-blue-200">{user.division}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (logoutDisabled) return;
                                    router.post(route('logout'));
                                }}
                                disabled={logoutDisabled}
                                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold transition bg-white/10 text-white hover:bg-white/20"
                            >
                                <LogOut size={12} className="md:w-3.5 md:h-3.5" />
                                <span>Keluar</span>
                            </button>
                        </div>
                    </div>

                    {/* Collapsed Footer (Desktop Collapsed only) */}
                    <div className={cn(
                        "flex flex-col items-center gap-4 transition-all duration-300 ease-in-out",
                        !isOpen && !isMobileOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full absolute pointer-events-none"
                    )}>
                        <div className="h-6 w-6 rounded-full bg-blue-800 flex items-center justify-center text-[10px] font-bold text-white cursor-help" title={user.name}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (logoutDisabled) return;
                                router.post(route('logout'));
                            }}
                            disabled={logoutDisabled}
                            className="p-2 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
                            title="Keluar"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}


