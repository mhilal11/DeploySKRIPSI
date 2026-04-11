import { useEffect, useRef, useState } from 'react';

import {
    extractChanges,
} from '@/modules/SuperAdmin/AuditLog/audit-log-utils';
import type {
    AuditChange,
    AuditDetailState,
    AuditLogRecord,
} from '@/modules/SuperAdmin/AuditLog/audit-log-utils';
import { AuditChangesPreview } from '@/modules/SuperAdmin/AuditLog/AuditChangesPreview';
import { AuditDetailDialog } from '@/modules/SuperAdmin/AuditLog/AuditDetailDialog';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import { api, apiUrl } from '@/shared/lib/api';
import { Head, router, usePage, usePageManager } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';


type AuditLogPageProps = PageProps<{
    auditLogs: {
        data: AuditLogRecord[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        module: string;
        action: string;
        date_from: string;
        date_to: string;
    };
    moduleOptions: string[];
    actionOptions: string[];
}>;
export default function AuditLogIndex(initialProps: AuditLogPageProps) {
    const { props } = usePage<Partial<AuditLogPageProps>>();
    const { setSidebarNotifications } = usePageManager();

    const auditLogs = props.auditLogs ?? initialProps.auditLogs;
    const filters = props.filters ?? initialProps.filters;
    const moduleOptions = props.moduleOptions ?? initialProps.moduleOptions;
    const actionOptions = props.actionOptions ?? initialProps.actionOptions;

    const [search, setSearch] = useState(filters.search ?? '');
    const [module, setModule] = useState(filters.module || 'all');
    const [action, setAction] = useState(filters.action || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [activeDetail, setActiveDetail] = useState<AuditDetailState | null>(null);
    const [locallyViewed, setLocallyViewed] = useState<Record<number, boolean>>({});

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialRender = useRef(true);
    const isSyncingFiltersFromServer = useRef(false);
    const isPaginating = useRef(false);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }
        if (isSyncingFiltersFromServer.current || isPaginating.current) {
            return;
        }
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            router.visit('/super-admin/audit-log', {
                method: 'get',
                data: {
                    search: search || undefined,
                    module: module !== 'all' ? module : undefined,
                    action: action !== 'all' ? action : undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                },
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['auditLogs', 'filters', 'moduleOptions', 'actionOptions'],
            });
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [search, module, action, dateFrom, dateTo]);

    useEffect(() => {
        isSyncingFiltersFromServer.current = true;
        setSearch(filters.search ?? '');
        setModule(filters.module || 'all');
        setAction(filters.action || 'all');
        setDateFrom(filters.date_from ?? '');
        setDateTo(filters.date_to ?? '');
        const frame = window.requestAnimationFrame(() => {
            isSyncingFiltersFromServer.current = false;
        });
        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [filters.search, filters.module, filters.action, filters.date_from, filters.date_to]);

    const page = auditLogs.current_page || 1;
    const lastPage = auditLogs.last_page || 1;

    const visitPage = (targetPage: number) => {
        if (targetPage < 1 || targetPage > lastPage || targetPage === page) {
            return;
        }
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        isPaginating.current = true;
        router.visit('/super-admin/audit-log', {
            method: 'get',
            data: {
                page: targetPage,
                search: search || undefined,
                module: module !== 'all' ? module : undefined,
                action: action !== 'all' ? action : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['auditLogs', 'filters', 'moduleOptions', 'actionOptions'],
            onFinish: () => {
                isPaginating.current = false;
            },
        });
    };

    const markAuditLogViewed = async (id: number) => {
        if (locallyViewed[id]) {
            return;
        }

        try {
            const { data } = await api.post(apiUrl('/super-admin/audit-log/mark-viewed'), {
                ids: [id],
            });
            if (data?.sidebarNotifications && typeof data.sidebarNotifications === 'object') {
                setSidebarNotifications(data.sidebarNotifications as Record<string, number>);
            }
        } catch {
            // revert on failure
            setLocallyViewed((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const isViewed = (item: AuditLogRecord) =>
        locallyViewed[item.id] === true || item.is_viewed === true;

    const handleOpenDetail = (item: AuditLogRecord, changes: AuditChange[]) => {
        setLocallyViewed((prev) => {
            if (prev[item.id]) {
                return prev;
            }
            return { ...prev, [item.id]: true };
        });
        setActiveDetail({ item, changes });
        void markAuditLogViewed(item.id);
    };

    return (
        <SuperAdminLayout
            title="Log Aktivitas"
            description="Riwayat aktivitas perubahan data untuk kebutuhan monitoring dan audit."
            breadcrumbs={[
                { label: 'Super Admin', href: '/super-admin/dashboard' },
                { label: 'Log Aktivitas' },
            ]}
        >
            <Head title="Log Aktivitas" />

            <Card className="space-y-4 overflow-hidden p-3 sm:p-4 md:p-5 xl:p-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
                    <Input
                        placeholder="Cari user, deskripsi, entity ID..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="sm:col-span-2 xl:col-span-4"
                    />
                    <div className="sm:col-span-1 xl:col-span-2">
                        <Select value={module} onValueChange={setModule}>
                            <SelectTrigger>
                                <SelectValue placeholder="Semua Modul" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Modul</SelectItem>
                                {moduleOptions.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-1 xl:col-span-2">
                        <Select value={action} onValueChange={setAction}>
                            <SelectTrigger>
                                <SelectValue placeholder="Semua Aksi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Aksi</SelectItem>
                                {actionOptions.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2 xl:col-span-3">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                        />
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(event) => setDateTo(event.target.value)}
                        />
                    </div>
                    <div className="sm:col-span-2 xl:col-span-1">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setSearch('');
                                setModule('all');
                                setAction('all');
                                setDateFrom('');
                                setDateTo('');
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 xl:hidden md:grid-cols-2">
                    {auditLogs.data.length === 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 md:col-span-2">
                            Belum ada data log aktivitas.
                        </div>
                    )}
                    {auditLogs.data.map((item, index) => {
                        const changes = extractChanges(item.old_values, item.new_values);
                        const viewed = isViewed(item);
                        const rowNumber = (page - 1) * (auditLogs.per_page || 20) + index + 1;
                        return (
                            <div
                                key={`mobile-${item.id}`}
                                className={`min-w-0 overflow-hidden rounded-xl border p-3 shadow-sm ${viewed
                                    ? 'border-slate-200 bg-white'
                                    : 'border-amber-200 bg-amber-50/40'
                                    }`}
                            >
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400">No. {rowNumber}</p>
                                        <p className="text-xs text-slate-500">{item.created_at}</p>
                                        <p className="break-words text-sm font-semibold text-slate-900">{item.user_name ?? '-'}</p>
                                        <p className="break-all text-xs text-slate-500">{item.user_email ?? '-'}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                                        {!viewed && (
                                            <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-700">
                                                Belum dilihat
                                            </Badge>
                                        )}
                                        <Badge
                                            variant="outline"
                                            title={item.action}
                                            className="max-w-[12rem] truncate border-blue-200 bg-blue-50 text-blue-700"
                                        >
                                            {item.action}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{item.module}</Badge>
                                    <Badge
                                        variant="outline"
                                        title={item.action}
                                        className="max-w-[12rem] truncate border-blue-200 bg-blue-50 text-blue-700"
                                    >
                                        {item.action}
                                    </Badge>
                                </div>

                                <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Deskripsi</p>
                                    <p className="mt-1 text-xs text-slate-700">{item.description ?? '-'}</p>
                                </div>

                                <AuditChangesPreview itemId={item.id} changes={changes} onOpenDetail={() => handleOpenDetail(item, changes)} />
                            </div>
                        );
                    })}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 xl:block">
                    <Table className="min-w-[1180px] table-fixed">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="whitespace-nowrap w-12">No</TableHead>
                                <TableHead className="w-[132px] whitespace-nowrap">Waktu</TableHead>
                                <TableHead className="w-[172px] whitespace-nowrap">Aktor</TableHead>
                                <TableHead className="w-[116px] whitespace-nowrap">Modul</TableHead>
                                <TableHead className="w-[360px] whitespace-normal">Deskripsi</TableHead>
                                <TableHead className="w-[320px] whitespace-normal">Perubahan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditLogs.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                                        Belum ada data log aktivitas.
                                    </TableCell>
                                </TableRow>
                            )}
                            {auditLogs.data.map((item, index) => {
                                const changes = extractChanges(item.old_values, item.new_values);
                                const viewed = isViewed(item);
                                const rowNumber = (page - 1) * (auditLogs.per_page || 20) + index + 1;
                                return (
                                    <TableRow key={item.id} className={viewed ? 'align-top' : 'bg-amber-50/40 align-top'}>
                                        <TableCell className="whitespace-nowrap text-xs text-slate-600">
                                            {rowNumber}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-xs text-slate-600">
                                            <p>{item.created_at}</p>
                                            {!viewed && (
                                                <Badge variant="outline" className="mt-1 border-amber-300 bg-amber-100 text-amber-700">
                                                    Belum dilihat
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="break-words text-sm font-medium text-slate-900">{item.user_name ?? '-'}</p>
                                            <p className="break-all text-xs text-slate-500">{item.user_email ?? '-'}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{item.module}</Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-normal break-words text-xs leading-relaxed text-slate-700 align-top">
                                            {item.description ?? '-'}
                                        </TableCell>
                                        <TableCell className="whitespace-normal align-top">
                                            <AuditChangesPreview itemId={item.id} changes={changes} onOpenDetail={() => handleOpenDetail(item, changes)} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-xs text-slate-500">
                        Total {auditLogs.total} log.
                    </p>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-start">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={page <= 1}
                            onClick={() => visitPage(page - 1)}
                        >
                            Sebelumnya
                        </Button>
                        <span className="text-center text-xs text-slate-600">
                            Halaman {page} / {lastPage}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={page >= lastPage}
                            onClick={() => visitPage(page + 1)}
                        >
                            Berikutnya
                        </Button>
                    </div>
                </div>
            </Card>
            <AuditDetailDialog
                activeDetail={activeDetail}
                onClose={() => setActiveDetail(null)}
            />
        </SuperAdminLayout>
    );
}



