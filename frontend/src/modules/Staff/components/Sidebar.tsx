import { FileText, LayoutDashboard, MessageSquare } from "lucide-react";

import { Link, router, usePage, usePageManager } from "@/shared/lib/inertia";
import { route } from "@/shared/lib/route";
import type { PageProps } from "@/shared/types";

import type { ComponentType, SVGProps } from "react";


interface NavItem {
    label: string;
    route: string;
    patterns: string | string[];
    icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface SidebarProps {
    className?: string;
    onClose?: () => void;
    isMobile?: boolean;
}

const navItems: NavItem[] = [
    {
        label: "Dashboard",
        route: "staff.dashboard",
        patterns: "staff.dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Keluhan & Saran",
        route: "staff.complaints.index",
        patterns: ["staff.complaints.index", "staff.complaints.*"],
        icon: MessageSquare,
    },
    {
        label: "Pengajuan Resign",
        route: "staff.resignation.index",
        patterns: "staff.resignation.*",
        icon: FileText,
    },
];

export default function StaffSidebar({
    className = "",
    onClose,
    isMobile = false,
}: SidebarProps) {
    const {
        props: { auth },
    } = usePage<PageProps>();
    const { authLoaded } = usePageManager();
    const user = auth.user;
    const logoutDisabled = !authLoaded;

    const isActive = (patterns: string | string[]) => {
        if (Array.isArray(patterns)) {
            return patterns.some((pattern) => route().current(pattern));
        }
        return route().current(patterns);
    };

    return (
        <aside
            className={`
                flex flex-col h-full w-64 bg-blue-900 text-white shadow-xl
                ${
                    isMobile
                        ? "fixed inset-y-0 left-0 z-40"
                        : "hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40"
                }
                ${className}
            `}
        >
            {/* HEADER */}
            <div className="px-6 py-5 border-b border-blue-800">
                <div className="flex items-center justify-between md:block">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-blue-200">
                            Staff Portal
                        </p>
                        <p className="text-lg md:text-2xl font-semibold leading-tight">
                            LDP HRIS
                        </p>
                        <p className="hidden md:block text-xs text-blue-200">
                            Empowering People
                        </p>
                    </div>

                    {isMobile && (
                        <button
                            type="button"
                            aria-label="Tutup menu"
                            onClick={onClose}
                            className="rounded p-2 text-blue-100 hover:bg-white/10 md:hidden"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M6 6l12 12M18 6L6 18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 overflow-y-auto pt-4 px-4 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.patterns);

                    return (
                        <Link
                            key={item.label}
                            href={route(item.route)}
                            className={`
                                flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm
                                transition-all
                                ${
                                    active
                                        ? "bg-white/15 text-white"
                                        : "text-blue-100 hover:bg-white/10"
                                }
                            `}
                            onClick={onClose}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* USER PANEL */}
            <div className="border-t border-blue-800 px-6 py-5">
                <p className="text-xs uppercase tracking-wide text-blue-200">
                    Logged in as
                </p>
                <p className="text-sm font-semibold text-white">{user.name}</p>
                {user.division && (
                    <p className="text-xs text-blue-200">{user.division}</p>
                )}

                <button
                    type="button"
                    onClick={() => {
                        if (logoutDisabled) return;
                        router.post(route("logout"));
                    }}
                    disabled={logoutDisabled}
                    className="
                        mt-4 w-full text-center rounded-lg bg-white/10 px-4 py-2 
                        text-sm font-semibold text-white transition hover:bg-white/20
                        disabled:cursor-not-allowed disabled:opacity-60
                    "
                >
                    Keluar
                </button>
            </div>
        </aside>
    );
}



