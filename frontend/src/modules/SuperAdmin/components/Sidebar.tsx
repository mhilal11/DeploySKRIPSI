import {
    LayoutDashboard,
    Users,
    UserMinus,
    MessageSquare,
    UserPlus,
    Mail,
    ClipboardList,
    Building2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    LogOut,
    X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Link, router } from '@/shared/lib/inertia';
import { route } from '@/shared/lib/route';
import { cn } from '@/shared/lib/utils';
import { User } from '@/shared/types';

import type { ComponentType, SVGProps } from 'react';

interface NavItem {
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    routeName?: string;
    href?: string;
    pattern?: string | string[];
    exact?: boolean;
    children?: Array<{
        label: string;
        routeName?: string;
        href?: string;
        pattern: string | string[];
        exact?: boolean;
        badgeKey?: string;
    }>;
    superAdminOnly?: boolean;
    badgeKey?: string;
}

const defaultNavItems: NavItem[] = [
    {
        label: 'Dashboard',
        icon: LayoutDashboard,
        routeName: 'super-admin.dashboard',
        pattern: 'super-admin.dashboard',
    },
    {
        label: 'Kelola Akun',
        icon: Users,
        routeName: 'super-admin.accounts.index',
        pattern: 'super-admin.accounts.*',
        superAdminOnly: true,
    },
    {
        label: 'Recruitment',
        icon: UserPlus,
        routeName: 'super-admin.recruitment',
        pattern: ['super-admin.recruitment', 'super-admin.recruitment.analytics'],
        badgeKey: 'super-admin.recruitment',
        children: [
            {
                label: 'Kelola Rekrutmen',
                routeName: 'super-admin.recruitment',
                pattern: 'super-admin.recruitment',
                exact: true,
                badgeKey: 'super-admin.recruitment',
            },
            {
                label: 'Analytics Rekrutmen',
                href: '/super-admin/recruitment/analytics',
                pattern: 'super-admin.recruitment.analytics',
            },
        ],
    },
    {
        label: 'Kelola Divisi',
        icon: Building2,
        routeName: 'super-admin.divisions.index',
        pattern: 'super-admin.divisions.*',
    },
    {
        label: 'Kelola Surat',
        icon: Mail,
        routeName: 'super-admin.letters.index',
        pattern: 'super-admin.letters.*',
        badgeKey: 'super-admin.letters.index',
    },
    {
        label: 'Kelola Staff',
        icon: UserMinus,
        routeName: 'super-admin.staff.index',
        pattern: 'super-admin.staff.*',
        badgeKey: 'super-admin.staff.index',
    },
    {
        label: 'Kelola Pengaduan',
        icon: MessageSquare,
        routeName: 'super-admin.complaints.index',
        pattern: 'super-admin.complaints.*',
        badgeKey: 'super-admin.complaints.index',
    },
    {
        label: 'Audit Log',
        icon: ClipboardList,
        href: '/super-admin/audit-log',
        pattern: 'super-admin.audit-log',
        superAdminOnly: true,
        badgeKey: 'super-admin.audit-log',
    },
];

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
    /** When provided by the persistent shell, the sidebar uses these directly
     *  instead of maintaining its own Echo-driven state. */
    notifications?: Record<string, number>;
    /** User object from auth context */
    user?: User;
    /** Initial sidebar notifications from server (fallback) */
    initialNotifications?: Record<string, number>;
}

const pendingStatuses = ['Menunggu HR', 'Diajukan', 'Diproses'];
const lettersBadgeKey = 'super-admin.letters.index';

function Sidebar({ 
    isOpen, 
    onToggle, 
    isMobileOpen = false, 
    onMobileClose, 
    notifications,
    user,
    initialNotifications = {}
}: SidebarProps) {
    const pathname = usePathname();

    // If the shell provides live notifications, use them directly.
    // Otherwise fall back to local Echo-driven state (standalone usage).
    const hasExternalNotifications = notifications !== undefined;

    const [localBadges, setLocalBadges] = useState<Record<string, number>>(
        initialNotifications,
    );

    useEffect(() => {
        if (!hasExternalNotifications) {
            setLocalBadges((prev) => {
                // Only update if values actually changed
                const hasChanges = Object.keys(initialNotifications).some(
                    (key) => prev[key] !== initialNotifications[key]
                ) || Object.keys(prev).length !== Object.keys(initialNotifications).length;
                
                return hasChanges ? initialNotifications : prev;
            });
        }
    }, [initialNotifications, hasExternalNotifications]);

    useEffect(() => {
        // Skip Echo listener when shell already handles notifications
        if (hasExternalNotifications) {
            return;
        }
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.private('super-admin.letters');
        const handleLetterUpdated = (payload: { letter?: { status?: string; currentRecipient?: string } }) => {
            const letter = payload?.letter;
            if (!letter) {
                return;
            }

            const shouldCount =
                pendingStatuses.includes(letter.status ?? '') &&
                letter.currentRecipient === 'hr';

            setLocalBadges((prev) => {
                const current = prev[lettersBadgeKey] ?? 0;
                const next = shouldCount ? current + 1 : Math.max(current - 1, 0);
                return { ...prev, [lettersBadgeKey]: next };
            });
        };

        channel.listen('LetterUpdated', handleLetterUpdated).listen('.LetterUpdated', handleLetterUpdated);

        return () => {
            channel.stopListening('LetterUpdated');
            window.Echo?.leave('super-admin.letters');
        };
    }, [hasExternalNotifications]);

    // Resolved badge counts  external (from shell) or local (self-managed)
    const liveBadges = hasExternalNotifications ? notifications : localBadges;

    const isSuperAdmin = user?.role === 'Super Admin';
    const isHumanCapitalAdmin =
        user?.role === 'Admin' &&
        typeof user?.division === 'string' &&
        /human\s+(capital|resources)/i.test(user.division);
    const navItems: NavItem[] = useMemo(
        () =>
            isHumanCapitalAdmin
                ? [
                    {
                        label: 'Dashboard',
                        icon: LayoutDashboard,
                        routeName: 'super-admin.admin-hr.dashboard',
                        pattern: 'super-admin.admin-hr.dashboard',
                    },
                    ...defaultNavItems.filter((item) => item.routeName !== 'super-admin.dashboard'),
                ]
                : defaultNavItems,
        [isHumanCapitalAdmin],
    );
    const panelLabel = isHumanCapitalAdmin ? 'Admin HR' : 'Super Admin';
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const handleNavClick = () => {
        if (onMobileClose) {
            onMobileClose();
        }
    };

    const isHrefActive = useCallback((href?: string, exact?: boolean) => {
        if (!href) return false;
        const normalizedHref = href.endsWith('/') && href.length > 1 ? href.slice(0, -1) : href;
        const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

        if (exact) {
            return normalizedPath === normalizedHref;
        }

        return (
            normalizedPath === normalizedHref ||
            normalizedPath.startsWith(`${normalizedHref}/`)
        );
    }, [pathname]);

    const isChildActiveByPath = useCallback((child: {
        label: string;
        routeName?: string;
        href?: string;
        pattern: string | string[];
        exact?: boolean;
        badgeKey?: string;
    }) => {
        const childHref = child.href ?? (child.routeName ? route(child.routeName) : undefined);
        return isHrefActive(childHref, child.exact);
    }, [isHrefActive]);

    const isItemActiveByPath = useCallback((item: NavItem) => {
        if (item.children?.length) {
            return item.children.some((child) => isChildActiveByPath(child));
        }
        const itemHref = item.href ?? (item.routeName ? route(item.routeName) : undefined);
        return isHrefActive(itemHref, item.exact);
    }, [isChildActiveByPath, isHrefActive]);

    useEffect(() => {
        setExpandedGroups((previous) => {
            let changed = false;
            const next = { ...previous };

            navItems.forEach((item) => {
                if (!item.children?.length) return;
                const current = next[item.label];
                const shouldOpen = item.children.some((child) => isChildActiveByPath(child));
                if (current === undefined || (shouldOpen && !current)) {
                    next[item.label] = shouldOpen;
                    changed = true;
                }
            });

            return changed ? next : previous;
        });
    }, [isChildActiveByPath, navItems]);

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-50 bg-blue-950 text-white shadow-lg transition-[width,transform] duration-300 ease-in-out flex flex-col h-screen will-change-[width]",
                isOpen ? "w-52" : "w-16",
                "max-md:-translate-x-full max-md:w-52",
                isMobileOpen && "max-md:translate-x-0"
            )}
        >
            {/* Header - Fixed */}
            <div className={cn("flex items-center px-4 h-16 md:h-20 shrink-0", isOpen ? "justify-between" : "justify-center", "max-md:justify-between")}>
                <div className={cn(
                    "grid transition-[grid-template-columns] duration-300 ease-in-out",
                    isOpen || isMobileOpen ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                )}>
                    <div className={cn(
                        "overflow-hidden whitespace-nowrap transition-opacity duration-300",
                        isOpen || isMobileOpen ? "opacity-100" : "opacity-0"
                    )}>
                        <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-blue-200">
                            PT. Lintas Data Prima
                        </p>
                        <p className="text-base md:text-lg font-semibold">{panelLabel}</p>
                        <p className="text-[8px] md:text-[10px] text-blue-200">HRIS Portal</p>
                    </div>
                </div>
                {/* Desktop toggle button */}
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors hidden md:block"
                >
                    {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
                {/* Mobile close button */}
                <button
                    onClick={onMobileClose}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors md:hidden"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Navigation Label */}
            {/* Navigation Label */}
            <div className={cn(
                "px-4 md:px-6 mb-2 shrink-0 overflow-hidden transition-all duration-300",
                isOpen || isMobileOpen ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
            )}>
                <p className="text-[8px] md:text-[10px] uppercase tracking-wide text-blue-300">
                    Navigasi
                </p>
            </div>

            {/* Nav Items - Scrollable */}
            <nav className="flex-1 flex flex-col gap-1 px-2 md:px-3 overflow-y-auto py-2 min-h-0">
                {navItems
                    .filter((item) => (item.superAdminOnly ? isSuperAdmin : true))
                    .map((item) => {
                        const Icon = item.icon;
                        const hasChildren = Boolean(item.children?.length);
                        const itemHref = item.href ?? (item.routeName ? route(item.routeName) : '#');
                        const itemIsActive = isItemActiveByPath(item);

                        if (hasChildren && (isOpen || isMobileOpen)) {
                            const isExpanded = expandedGroups[item.label] ?? itemIsActive;
                            return (
                                <div key={item.label} className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedGroups((prev) => ({
                                                ...prev,
                                                [item.label]: !isExpanded,
                                            }))
                                        }
                                        className={cn(
                                            "flex w-full items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-1.5 md:py-2 transition-all duration-200",
                                            itemIsActive
                                                ? 'bg-white/10 text-white'
                                                : 'text-blue-100 hover:bg-white/5'
                                        )}
                                    >
                                        <Icon className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
                                        <span className="flex min-w-0 flex-1 items-center justify-between text-[10px] md:text-xs">
                                            <span className="truncate">{item.label}</span>
                                            <span className="ml-2 flex items-center gap-1">
                                                {(() => {
                                                    const rawCount = item.badgeKey
                                                        ? liveBadges[item.badgeKey] ?? 0
                                                        : 0;
                                                    if (!rawCount || rawCount <= 0) {
                                                        return null;
                                                    }
                                                    const displayCount = rawCount > 99 ? '99+' : rawCount;
                                                    return (
                                                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                                            {displayCount}
                                                        </span>
                                                    );
                                                })()}
                                                <ChevronDown
                                                    className={cn(
                                                        "h-3.5 w-3.5 transition-transform duration-200",
                                                        isExpanded ? "rotate-180" : "rotate-0",
                                                    )}
                                                />
                                            </span>
                                        </span>
                                    </button>

                                    <div
                                        className={cn(
                                            "ml-5 grid gap-1 overflow-hidden transition-all duration-200",
                                            isExpanded
                                                ? "max-h-40 opacity-100"
                                                : "max-h-0 opacity-0 pointer-events-none",
                                        )}
                                    >
                                        {item.children!.map((child) => {
                                            const childHref = child.href ?? (child.routeName ? route(child.routeName) : itemHref);
                                            const childIsActive = isHrefActive(childHref, child.exact);
                                            return (
                                                <Link
                                                    key={`${item.label}-${child.label}`}
                                                    href={childHref}
                                                    onClick={handleNavClick}
                                                    className={cn(
                                                        "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-[10px] md:text-xs transition-colors",
                                                        childIsActive
                                                            ? "bg-white/15 text-white"
                                                            : "text-blue-100 hover:bg-white/5",
                                                    )}
                                                >
                                                    <span className="truncate">{child.label}</span>
                                                    {(() => {
                                                        const rawCount = child.badgeKey
                                                            ? liveBadges[child.badgeKey] ?? 0
                                                            : 0;
                                                        if (!rawCount || rawCount <= 0) {
                                                            return null;
                                                        }
                                                        const displayCount = rawCount > 99 ? '99+' : rawCount;
                                                        return (
                                                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                                                {displayCount}
                                                            </span>
                                                        );
                                                    })()}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
                                href={itemHref}
                                title={!isOpen ? item.label : undefined}
                                onClick={handleNavClick}
                                className={cn(
                                    "flex items-center rounded-lg transition-all duration-200 group relative",
                                    isOpen || isMobileOpen ? "gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2" : "justify-center p-3",
                                    itemIsActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-blue-100 hover:bg-white/5'
                                )}
                            >
                                <Icon className={cn("shrink-0", isOpen || isMobileOpen ? "h-3 w-3 md:h-3.5 md:w-3.5" : "h-4 w-4")} />

                                <div className={cn(
                                    "grid transition-[grid-template-columns] duration-300 ease-in-out flex-1",
                                    isOpen || isMobileOpen ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                                )}>
                                    <span className={cn(
                                        "flex items-center justify-between overflow-hidden transition-opacity duration-300 min-w-0",
                                        isOpen || isMobileOpen ? "opacity-100" : "opacity-0"
                                    )}>
                                        <span className="truncate text-[10px] md:text-xs">{item.label}</span>
                                        {(() => {
                                            const rawCount = item.badgeKey
                                                ? liveBadges[item.badgeKey] ?? 0
                                                : 0;
                                            if (!rawCount || rawCount <= 0) {
                                                return null;
                                            }
                                            const displayCount = rawCount > 99 ? '99+' : rawCount;
                                            return (
                                                <span className="ml-2 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                                    {displayCount}
                                                </span>
                                            );
                                        })()}
                                    </span>
                                </div>

                                {/* Badge for collapsed state (desktop only) */}
                                {!isOpen && !isMobileOpen && item.badgeKey && (liveBadges[item.badgeKey] ?? 0) > 0 && (
                                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-blue-950 hidden md:block" />
                                )}
                            </Link>
                        );
                })}
            </nav>

            {/* Footer - Fixed at bottom */}
            <div className="border-t border-blue-900 p-3 md:p-4 shrink-0 overflow-hidden">
                <div className={cn(
                    "transition-all duration-300 ease-in-out",
                    isOpen || isMobileOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full absolute pointer-events-none"
                )}>
                    <div className="space-y-2 md:space-y-4">
                        <div>
                            <p className="text-[8px] md:text-[10px] uppercase tracking-wide text-blue-300">
                                Logged in as
                            </p>
                            <p className="text-[10px] md:text-xs font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-[8px] md:text-[10px] text-blue-200 truncate">{user?.email}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.post(route('logout'))}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold text-white transition hover:bg-white/20"
                        >
                            <LogOut size={12} className="md:w-3.5 md:h-3.5" />
                            <span>Keluar</span>
                        </button>
                    </div>
                </div>

                <div className={cn(
                    "flex flex-col items-center gap-4 transition-all duration-300 ease-in-out",
                    !isOpen && !isMobileOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full absolute pointer-events-none"
                )}>
                     <div className="h-6 w-6 rounded-full bg-blue-800 flex items-center justify-center text-[10px] font-bold text-white cursor-help" title={user?.name}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post(route('logout'))}
                        className="p-2 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
                        title="Keluar"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

// Custom comparison function for memo - compare props deeply
function arePropsEqual(prevProps: SidebarProps, nextProps: SidebarProps): boolean {
    // Compare primitives
    if (
        prevProps.isOpen !== nextProps.isOpen ||
        prevProps.isMobileOpen !== nextProps.isMobileOpen
    ) {
        return false;
    }

    // Compare functions (stable with useCallback, so reference comparison is fine)
    if (
        prevProps.onToggle !== nextProps.onToggle ||
        prevProps.onMobileClose !== nextProps.onMobileClose
    ) {
        return false;
    }

    // Compare user object by values
    if (prevProps.user?.id !== nextProps.user?.id ||
        prevProps.user?.name !== nextProps.user?.name ||
        prevProps.user?.role !== nextProps.user?.role ||
        prevProps.user?.division !== nextProps.user?.division
    ) {
        return false;
    }

    // Compare notifications object
    if (prevProps.notifications !== nextProps.notifications) {
        // If both are objects, compare deeply
        if (prevProps.notifications && nextProps.notifications) {
            const prevKeys = Object.keys(prevProps.notifications);
            const nextKeys = Object.keys(nextProps.notifications);
            
            if (prevKeys.length !== nextKeys.length) {
                return false;
            }
            
            for (const key of prevKeys) {
                if (prevProps.notifications[key] !== nextProps.notifications[key]) {
                    return false;
                }
            }
        } else {
            // One is undefined, the other is not
            return false;
        }
    }

    // Compare initialNotifications
    if (prevProps.initialNotifications !== nextProps.initialNotifications) {
        if (prevProps.initialNotifications && nextProps.initialNotifications) {
            const prevKeys = Object.keys(prevProps.initialNotifications);
            const nextKeys = Object.keys(nextProps.initialNotifications);
            
            if (prevKeys.length !== nextKeys.length) {
                return false;
            }
            
            for (const key of prevKeys) {
                if (prevProps.initialNotifications[key] !== nextProps.initialNotifications[key]) {
                    return false;
                }
            }
        } else if (prevProps.initialNotifications !== nextProps.initialNotifications) {
            return false;
        }
    }

    return true;
}

// Wrap with memo and custom comparison to prevent re-renders
export default memo(Sidebar, arePropsEqual);



