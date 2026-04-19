import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import AccountDetailDialog from '@/modules/SuperAdmin/components/accounts/AccountDetailDialog';
import AccountFilters from '@/modules/SuperAdmin/components/accounts/AccountFilters';
import AccountStats from '@/modules/SuperAdmin/components/accounts/AccountStats';
import AccountTable from '@/modules/SuperAdmin/components/accounts/AccountTable';
import {
    AccountRecord,
    PaginatedAccounts,
} from '@/modules/SuperAdmin/components/accounts/types';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { api, apiUrl, getApiOrigin, isAxiosError } from '@/shared/lib/api';
import { Head, Link, router, usePageManager } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

type IndexPageProps = PageProps<{
    users: PaginatedAccounts;
    filters: {
        search?: string | null;
        role?: string | null;
        status?: string | null;
        division?: string | null;
    };
    stats: {
        total: number;
        super_admin: number;
        admin: number;
        staff: number;
        pelamar: number;
    };
    roleOptions: string[];
    statusOptions: string[];
    divisionOptions: string[];
    flash?: {
        success?: string;
    };
}>;

const ACCOUNT_TOAST_ID = 'super-admin.accounts.feedback';
const ACCOUNT_TOAST_STORAGE_KEY = 'super-admin.accounts.toast';

const EMPTY_USERS: PaginatedAccounts = {
    data: [],
    links: [],
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

const EMPTY_STATS = {
    total: 0,
    super_admin: 0,
    admin: 0,
    staff: 0,
    pelamar: 0,
};

function decrementStatsByRole(stats: typeof EMPTY_STATS, role: string) {
    const normalizedRole = role.replace(/\s+/g, '').toLowerCase();
    const next = {
        ...stats,
        total: Math.max(0, (stats.total ?? 0) - 1),
    };

    if (normalizedRole === 'superadmin') {
        next.super_admin = Math.max(0, (stats.super_admin ?? 0) - 1);
        return next;
    }
    if (normalizedRole === 'admin') {
        next.admin = Math.max(0, (stats.admin ?? 0) - 1);
        return next;
    }
    if (normalizedRole === 'staff') {
        next.staff = Math.max(0, (stats.staff ?? 0) - 1);
        return next;
    }
    if (normalizedRole === 'pelamar') {
        next.pelamar = Math.max(0, (stats.pelamar ?? 0) - 1);
    }
    return next;
}



interface UserLoggedInPayload {
    id: number;
    last_login_at: string | null;
}

export default function Index(props: IndexPageProps) {
    const { setProps } = usePageManager();
    const users = props.users ?? EMPTY_USERS;
    const filters = props.filters ?? {};
    const stats = props.stats ?? EMPTY_STATS;
    const roleOptions = props.roleOptions ?? [];
    const statusOptions = props.statusOptions ?? [];
    const divisionOptions = props.divisionOptions ?? [];
    const flash = props.flash;

    const [search, setSearch] = useState(filters.search ?? '');
    const [roleFilter, setRoleFilter] = useState(filters.role ?? 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [divisionFilter, setDivisionFilter] = useState(filters.division ?? 'all');
    const [allUsers, setAllUsers] = useState<AccountRecord[]>(users.data ?? []);
    const [paginationLinks, setPaginationLinks] = useState(users.links ?? []);
    const [currentStats, setCurrentStats] = useState(stats);
    const [currentFrom, setCurrentFrom] = useState(users.from ?? 1);
    const [currentPage, setCurrentPage] = useState(users.current_page ?? 1);
    const [selectedUser, setSelectedUser] = useState<AccountRecord | null>(
        null,
    );
    const [detailOpen, setDetailOpen] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const filterRequestAbortRef = useRef<AbortController | null>(null);
    const isFirstRender = useRef(true);

    const clearPendingFilterFetch = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        if (filterRequestAbortRef.current) {
            filterRequestAbortRef.current.abort();
            filterRequestAbortRef.current = null;
        }
    };

    // Show queued toast from sessionStorage after page transition settles
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const queuedToast = sessionStorage.getItem(ACCOUNT_TOAST_STORAGE_KEY);
        if (queuedToast) {
            sessionStorage.removeItem(ACCOUNT_TOAST_STORAGE_KEY);
            const timer = window.setTimeout(() => {
                toast.success(queuedToast, {
                    id: ACCOUNT_TOAST_ID,
                    duration: 10000,
                });
            }, 300);
            return () => window.clearTimeout(timer);
        }

        if (flash?.success) {
            toast.success(flash.success, {
                id: ACCOUNT_TOAST_ID,
                duration: 10000,
            });
        }
    }, [flash?.success]);

    // Server-side search & filter via direct API call (bukan router.visit)
    // sehingga tidak ada navigasi Inertia dan fokus input TIDAK hilang.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        clearPendingFilterFetch();
        debounceRef.current = setTimeout(() => {
            const params: Record<string, string> = {};
            if (search) params.search = search;
            if (roleFilter !== 'all') params.role = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (divisionFilter !== 'all') params.division = divisionFilter;

            const controller = new AbortController();
            filterRequestAbortRef.current = controller;

            api.get(apiUrl('/super-admin/accounts'), {
                params,
                signal: controller.signal,
            })
                .then(({ data }) => {
                    if (data.users) {
                        setAllUsers(data.users.data ?? []);
                        setPaginationLinks(data.users.links ?? []);
                        setCurrentFrom(data.users.from ?? 1);
                        setCurrentPage(data.users.current_page ?? 1);
                    }
                    if (data.stats) {
                        setCurrentStats(data.stats);
                    }
                    if (data && typeof data === 'object') {
                        setProps(data);
                    }
                })
                .catch((error) => {
                    if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
                        return;
                    }
                    // Silently ignore search errors
                })
                .finally(() => {
                    if (filterRequestAbortRef.current === controller) {
                        filterRequestAbortRef.current = null;
                    }
                });
        }, 350);

        return () => {
            clearPendingFilterFetch();
        };
    }, [search, roleFilter, statusFilter, divisionFilter, setProps]);

    useEffect(() => {
        return () => {
            clearPendingFilterFetch();
        };
    }, []);

    useEffect(() => {
        setCurrentStats(stats);
    }, [stats]);

    useEffect(() => {
        if (!window.Echo) {
            return;
        }

        const channel = window.Echo.private('super-admin.accounts');

        const handleUserLoggedIn = (payload: UserLoggedInPayload) => {
            setAllUsers((current) =>
                current.map((account) =>
                    account.id === payload.id
                        ? { ...account, last_login_at: payload.last_login_at }
                        : account,
                ),
            );

            setSelectedUser((current) =>
                current && current.id === payload.id
                    ? { ...current, last_login_at: payload.last_login_at }
                    : current,
            );
        };

        channel.listen('UserLoggedIn', handleUserLoggedIn);

        return () => {
            channel.stopListening('UserLoggedIn');
            window.Echo?.leave('super-admin.accounts');
        };
    }, []);

    useEffect(() => {
        if (!selectedUser) {
            return;
        }

        const latestSelected = allUsers.find(
            (account) => account.id === selectedUser.id,
        );

        if (
            latestSelected &&
            latestSelected.last_login_at !== selectedUser.last_login_at
        ) {
            setSelectedUser(latestSelected);
        }
    }, [allUsers, selectedUser]);

    const openDetail = (user: AccountRecord) => {
        setSelectedUser(user);
        setDetailOpen(true);
    };

    const handlePaginationNavigate = (url: string) => {
        clearPendingFilterFetch();
        const baseOrigin =
            typeof window !== 'undefined'
                ? window.location.origin
                : getApiOrigin();
        const parsed = new URL(url, baseOrigin);
        const params: Record<string, string> = {};
        parsed.searchParams.forEach((value, key) => {
            params[key] = value;
        });

        api.get(apiUrl('/super-admin/accounts'), { params })
            .then(({ data }) => {
                if (data.users) {
                    setAllUsers(data.users.data ?? []);
                    setPaginationLinks(data.users.links ?? []);
                    setCurrentFrom(data.users.from ?? 1);
                    setCurrentPage(data.users.current_page ?? 1);
                }
                if (data.stats) {
                    setCurrentStats(data.stats);
                }
                if (data && typeof data === 'object') {
                    setProps(data);
                }
            })
            .catch(() => {
                router.visit(url, {
                    preserveScroll: true,
                });
            });
    };

    const handleToggleStatus = (user: AccountRecord) => {
        router.post(
            route('super-admin.accounts.toggle-status', user.id),
            {},
            {
                preserveScroll: true,
                onSuccess: (responseData) => {
                    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
                    const nextInactiveAt =
                        nextStatus === 'Inactive'
                            ? new Date().toISOString().split('T')[0]
                            : null;

                    setAllUsers((current) =>
                        current.map((account) =>
                            account.id === user.id
                                ? {
                                    ...account,
                                    status: nextStatus,
                                    inactive_at: nextInactiveAt,
                                }
                                : account,
                        ),
                    );

                    setSelectedUser((current) =>
                        current && current.id === user.id
                            ? {
                                ...current,
                                status: nextStatus,
                                inactive_at: nextInactiveAt,
                            }
                            : current,
                    );

                    const message =
                        typeof responseData?.status === 'string' && responseData.status.length > 0
                            ? responseData.status
                            : 'Status akun berhasil diperbarui.';
                    toast.success(message);
                },
                onError: () => {
                    toast.error('Gagal memperbarui status akun.');
                },
            },
        );
    };


    const handleDelete = (user: AccountRecord) => {
        router.delete(
            route('super-admin.accounts.destroy', user.id),
            {},
            {
                preserveScroll: true,
                onSuccess: (responseData) => {
                    setAllUsers((current) =>
                        current.filter((account) => account.id !== user.id),
                    );
                    setSelectedUser((current) =>
                        current && current.id === user.id ? null : current,
                    );
                    setCurrentStats((current) => decrementStatsByRole(current, user.role));

                    const message =
                        typeof responseData?.status === 'string' && responseData.status.length > 0
                            ? responseData.status
                            : 'Akun berhasil dihapus.';
                    toast.success(message);
                },
                onError: () => {
                    toast.error('Gagal menghapus akun.');
                },
            },
        );
    };

    const hasActiveFilters =
        search.trim() !== '' ||
        roleFilter !== 'all' ||
        statusFilter !== 'all' ||
        divisionFilter !== 'all';

    const handleResetFilters = () => {
        clearPendingFilterFetch();
        setSearch('');
        setRoleFilter('all');
        setStatusFilter('all');
        setDivisionFilter('all');
        setCurrentPage(1);
    };

    const buildAccountsListURL = () => {
        const params = new URLSearchParams();
        const trimmedSearch = search.trim();
        const trimmedRole = roleFilter.trim();
        const trimmedStatus = statusFilter.trim();
        const trimmedDivision = divisionFilter.trim();

        if (trimmedSearch !== '') {
            params.set('search', trimmedSearch);
        }
        if (trimmedRole !== '' && trimmedRole !== 'all') {
            params.set('role', trimmedRole);
        }
        if (trimmedStatus !== '' && trimmedStatus !== 'all') {
            params.set('status', trimmedStatus);
        }
        if (trimmedDivision !== '' && trimmedDivision !== 'all') {
            params.set('division', trimmedDivision);
        }
        if (currentPage > 1) {
            params.set('page', String(currentPage));
        }

        const base = route('super-admin.accounts.index');
        const query = params.toString();
        if (!query) {
            return base;
        }
        return `${base}?${query}`;
    };

    return (
        <SuperAdminLayout
            title="Account Management"
            description="Kelola akun pengguna sistem LDP HRIS"
            breadcrumbs={[
                { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Kelola Akun' },
            ]}

        >
            <Head title="Kelola Akun" />

            <AccountStats stats={currentStats} />

            <div className="rounded-xl md:rounded-2xl border bg-white p-3 md:p-6 shadow-sm">
                <div className="mb-3 md:mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-sm md:text-xl font-semibold text-blue-900">
                            Daftar Akun Pengguna
                        </h3>
                        <p className="text-[10px] md:text-sm text-slate-500">
                            Pantau status akun, role, dan divisi pengguna sistem
                        </p>
                    </div>
                    <Link
                        href={route('super-admin.accounts.create')}
                        className="inline-flex h-9 md:h-10 items-center justify-center rounded-lg bg-blue-900 px-4 text-xs md:text-sm font-semibold text-white transition hover:bg-blue-800"
                    >
                        Tambah Akun
                    </Link>
                </div>
                <div className="space-y-3 md:space-y-6">
                    <AccountFilters
                        search={search}
                        role={roleFilter}
                        status={statusFilter}
                        division={divisionFilter}
                        onSearchChange={setSearch}
                        onRoleChange={setRoleFilter}
                        onStatusChange={setStatusFilter}
                        onDivisionChange={setDivisionFilter}
                        onReset={handleResetFilters}
                        canReset={hasActiveFilters}
                        roleOptions={roleOptions}
                        statusOptions={statusOptions}
                        divisionOptions={divisionOptions}
                    />

                    <AccountTable
                        users={allUsers}
                        links={paginationLinks}
                        from={currentFrom}
                        onPaginationNavigateStart={clearPendingFilterFetch}
                        onPaginationNavigate={handlePaginationNavigate}
                        onView={openDetail}
                        onEdit={(user) =>
                            router.visit(
                                `${route('super-admin.accounts.edit', user.id)}?return_to=${encodeURIComponent(buildAccountsListURL())}`,
                            )
                        }
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDelete}
                    />
                </div>
            </div>

            <AccountDetailDialog
                user={selectedUser}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                onToggleStatus={handleToggleStatus}
            />
        </SuperAdminLayout>
    );
}
