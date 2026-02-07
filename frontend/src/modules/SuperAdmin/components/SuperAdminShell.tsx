import { Menu, Bell } from 'lucide-react';
import { PropsWithChildren, useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster } from 'sonner';

import NotificationDropdown from '@/modules/SuperAdmin/components/NotificationDropdown';
import QuickActions from '@/modules/SuperAdmin/components/QuickActions';
import Sidebar from '@/modules/SuperAdmin/components/Sidebar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { usePage } from '@/shared/lib/inertia';
import { cn } from '@/shared/lib/utils';
import { PageProps } from '@/shared/types';

/**
 * Persistent shell for all Super Admin pages.
 * Rendered once at the router level so the sidebar, navbar, and chrome
 * stay mounted across page navigations  no re-render / white flash.
 */
export default function SuperAdminShell({ children }: PropsWithChildren) {
    const {
        props: { auth, sidebarNotifications = {} },
    } = usePage<PageProps<{ sidebarNotifications?: Record<string, number> }>>();
    
    const user = auth?.user;

    //  Sidebar state 
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarOpen');
            return saved !== null ? JSON.parse(saved) : true;
        }
        return true;
    });

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    //  Live notification badges 
    const [liveNotifications, setLiveNotifications] =
        useState<Record<string, number>>(sidebarNotifications);

    const totalNotifications = Object.values(liveNotifications).reduce(
        (sum, count) => sum + count,
        0,
    );

    // Sync when server props change (e.g. after a fresh pagedata load)
    useEffect(() => {
        setLiveNotifications((prev) => {
            // Only update if values actually changed
            const hasChanges = Object.keys(sidebarNotifications).some(
                (key) => prev[key] !== sidebarNotifications[key]
            ) || Object.keys(prev).length !== Object.keys(sidebarNotifications).length;
            
            return hasChanges ? sidebarNotifications : prev;
        });
    }, [sidebarNotifications]);

    //  Responsive helper 
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    //  Realtime Echo listeners 
    useEffect(() => {
        if (!window.Echo) {
            return;
        }

        const pendingStatuses = ['Menunggu HR', 'Diajukan', 'Diproses'];
        const lettersBadgeKey = 'super-admin.letters.index';
        const recruitmentBadgeKey = 'super-admin.recruitment';
        const staffBadgeKey = 'super-admin.staff.index';
        const complaintsBadgeKey = 'super-admin.complaints.index';

        const lettersChannel = window.Echo.private('super-admin.letters');
        const handleLetterUpdated = (payload: {
            letter?: { status?: string; currentRecipient?: string };
        }) => {
            const letter = payload?.letter;
            if (!letter) return;
            const shouldCount =
                pendingStatuses.includes(letter.status ?? '') &&
                letter.currentRecipient === 'hr';
            setLiveNotifications((prev) => {
                const current = prev[lettersBadgeKey] ?? 0;
                const next = shouldCount
                    ? current + 1
                    : Math.max(current - 1, 0);
                return { ...prev, [lettersBadgeKey]: next };
            });
        };

        const recruitmentChannel = window.Echo.private(
            'super-admin.recruitment',
        );
        const handleApplicationUpdated = (payload: {
            application?: { status?: string };
        }) => {
            const application = payload?.application;
            if (!application) return;
            const shouldCount = ['Applied', 'Screening'].includes(
                application.status ?? '',
            );
            setLiveNotifications((prev) => {
                const current = prev[recruitmentBadgeKey] ?? 0;
                const next = shouldCount
                    ? current + 1
                    : Math.max(current - 1, 0);
                return { ...prev, [recruitmentBadgeKey]: next };
            });
        };

        const staffChannel = window.Echo.private('super-admin.staff');
        const handleTerminationUpdated = (payload: {
            termination?: { status?: string };
        }) => {
            const termination = payload?.termination;
            if (!termination) return;
            const shouldCount = ['Diajukan', 'Proses'].includes(
                termination.status ?? '',
            );
            setLiveNotifications((prev) => {
                const current = prev[staffBadgeKey] ?? 0;
                const next = shouldCount
                    ? current + 1
                    : Math.max(current - 1, 0);
                return { ...prev, [staffBadgeKey]: next };
            });
        };

        const complaintsChannel = window.Echo.private(
            'super-admin.complaints',
        );
        const handleComplaintUpdated = (payload: {
            complaint?: { status?: string };
        }) => {
            const complaint = payload?.complaint;
            if (!complaint) return;
            const shouldCount = complaint.status === 'Baru';
            setLiveNotifications((prev) => {
                const current = prev[complaintsBadgeKey] ?? 0;
                const next = shouldCount
                    ? current + 1
                    : Math.max(current - 1, 0);
                return { ...prev, [complaintsBadgeKey]: next };
            });
        };

        lettersChannel.listen('LetterUpdated', handleLetterUpdated);
        recruitmentChannel.listen(
            'ApplicationUpdated',
            handleApplicationUpdated,
        );
        staffChannel.listen('TerminationUpdated', handleTerminationUpdated);
        complaintsChannel.listen('ComplaintUpdated', handleComplaintUpdated);

        return () => {
            lettersChannel.stopListening('LetterUpdated');
            recruitmentChannel.stopListening('ApplicationUpdated');
            staffChannel.stopListening('TerminationUpdated');
            complaintsChannel.stopListening('ComplaintUpdated');

            window.Echo?.leave('super-admin.letters');
            window.Echo?.leave('super-admin.recruitment');
            window.Echo?.leave('super-admin.staff');
            window.Echo?.leave('super-admin.complaints');
        };
    }, []);

    //  Handlers (stabilized with useCallback) 
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev: boolean) => {
            const newState = !prev;
            localStorage.setItem('sidebarOpen', JSON.stringify(newState));
            return newState;
        });
    }, []);

    const toggleMobileMenu = useCallback(() => {
        setIsMobileMenuOpen((prev: boolean) => !prev);
    }, []);

    const closeMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(false);
    }, []);

    //  Render 
    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={toggleSidebar}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={closeMobileMenu}
                notifications={liveNotifications}
                user={user}
                initialNotifications={sidebarNotifications}
            />

            <div
                className={cn(
                    'flex-1 flex flex-col min-h-screen max-w-full overflow-x-hidden transition-[margin] duration-300 ease-in-out will-change-[margin]',
                    'ml-0 md:ml-52',
                    !isSidebarOpen && 'md:ml-16',
                )}
            >
                {/* Navbar */}
                <div className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-white border-b border-slate-200 px-4 py-3 w-full max-w-full">
                    {/* Left side  mobile menu + logo */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleMobileMenu}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 md:hidden"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="md:hidden">
                            <p className="text-xs text-slate-500">
                                PT. Lintas Data Prima
                            </p>
                            <p className="text-sm font-semibold text-blue-900">
                                Super Admin
                            </p>
                        </div>
                    </div>

                    {/* Right side  notifications & user (desktop) */}
                    <div className="hidden md:flex items-center gap-3">
                        <NotificationDropdown totalCount={totalNotifications}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative"
                            >
                                <Bell className="w-5 h-5" />
                                {totalNotifications > 0 && (
                                    <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-xs">
                                        {totalNotifications > 99
                                            ? '99+'
                                            : totalNotifications}
                                    </Badge>
                                )}
                            </Button>
                        </NotificationDropdown>

                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">
                                    {user?.name
                                        ? user.name.charAt(0).toUpperCase()
                                        : 'SA'}
                                </span>
                            </div>
                            <div className="text-left hidden lg:block">
                                <p className="text-sm font-medium text-gray-900">
                                    {user?.name || 'Super Admin'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content (rendered by each page via SuperAdminLayout) */}
                {children}

                {/* Quick actions  desktop only, when sidebar collapsed */}
                {!isSidebarOpen && !isMobile && (
                    <div className="sticky bottom-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] hidden md:block">
                        <QuickActions />
                    </div>
                )}
            </div>

            <Toaster richColors position="top-right" />
        </div>
    );
}

