import {
    ChevronLeft,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    User,
    X,
} from 'lucide-react';

import { Link, router, usePage, usePageManager } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

interface SidebarProps {
    isOpen: boolean;          // desktop expand/collapse
    onToggle: () => void;
    isMobileOpen: boolean;    // mobile slide in
    onMobileClose: () => void;
}

interface SidebarNavItem {
    label: string;
    icon: any;
    routeName: string;
}

const navItems: SidebarNavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, routeName: 'pelamar.dashboard' },
    { label: 'Profil', icon: User, routeName: 'pelamar.profile' },
    { label: 'Lamaran Saya', icon: FileText, routeName: 'pelamar.applications' },
];

export default function Sidebar({
    isOpen,
    onToggle,
    isMobileOpen,
    onMobileClose,
}: SidebarProps) {
    const { props: { auth } } = usePage<PageProps>();
    const { authLoaded } = usePageManager();
    const user = auth?.user;
    const logoutDisabled = !authLoaded;

    return (
        <>
            {/* SIDEBAR */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-blue-950 text-white shadow-xl
                    transform transition-all duration-300 ease-in-out
                    flex flex-col
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0
                    ${isOpen ? 'md:w-52' : 'md:w-16'}
                `}
            >

                {/* === MOBILE CLOSE BUTTON === */}
                <div className="md:hidden flex justify-end p-4">
                    <button
                        onClick={onMobileClose}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* === DESKTOP TOGGLE BUTTON === */}
                <button
                    onClick={onToggle}
                    className="
                        hidden md:flex items-center justify-center
                        absolute -right-3 top-10 z-50
                        h-7 w-7 rounded-full bg-blue-800 text-white shadow
                        hover:bg-blue-700 transition
                    "
                >
                    <ChevronLeft
                        className={`
                            h-4 w-4 transition-transform
                            ${isOpen ? '' : 'rotate-180'}
                        `}
                    />
                </button>

                {/* === HEADER === */}
                <div
                    className={`
                        flex items-center gap-3 px-5 h-20 border-b border-blue-900
                        transition-all duration-300
                        ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-0'}
                    `}
                >
                    {isOpen && (
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-blue-300">
                                PT. Lintas Data Prima
                            </p>
                            <p className="text-lg font-semibold">Portal Pelamar</p>
                        </div>
                    )}
                </div>

                {/* === NAVIGATION === */}
                <nav className="mt-4 flex flex-col gap-1 px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = route().current(item.routeName);

                        return (
                            <Link
                                key={item.routeName}
                                href={route(item.routeName)}
                                onClick={onMobileClose}
                                className={`
                                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                                    transition-all
                                    ${isActive ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-900/40'}
                                `}
                            >
                                <Icon className="h-4 w-4" />

                                {/* Hide label when collapsed */}
                                <span
                                    className={`
                                        whitespace-nowrap transition-all duration-200
                                        ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}
                                    `}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* === USER SECTION (BOTTOM) === */}
                <div
                    className="
                        mt-auto border-t border-blue-900 px-4 py-5
                        text-blue-100
                    "
                >
                    {/* Hide info in collapsed mode */}
                    {isOpen && (
                        <>
                            <p className="text-xs uppercase tracking-wide text-blue-300">
                                Logged in as
                            </p>
                            <p className="text-sm font-semibold">{user?.name}</p>
                            <p className="text-xs text-blue-300">{user?.email}</p>
                        </>
                    )}

                    <button
                        onClick={() => {
                            if (logoutDisabled) return;
                            router.post(route('logout'));
                        }}
                        disabled={logoutDisabled}
                        className="
                            mt-4 w-full flex items-center justify-center gap-2 rounded-lg
                            bg-white/10 px-4 py-2 text-sm font-semibold text-white
                            hover:bg-white/20 transition disabled:cursor-not-allowed disabled:opacity-60
                        "
                    >
                        <LogOut className="h-4 w-4" />
                        {isOpen && 'Keluar'}
                    </button>
                </div>
            </aside>
        </>
    );
}



