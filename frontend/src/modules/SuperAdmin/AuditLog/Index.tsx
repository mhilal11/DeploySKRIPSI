import { useEffect, useRef, useState } from 'react';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
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

type AuditLogRecord = {
    id: number;
    user_name?: string | null;
    user_email?: string | null;
    user_role?: string | null;
    module: string;
    action: string;
    entity_type?: string | null;
    entity_id?: string | null;
    description?: string | null;
    old_values?: unknown;
    new_values?: unknown;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
    is_viewed?: boolean;
};

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

type FlatRecord = Record<string, unknown>;
type ChangeType = 'added' | 'removed' | 'changed';

type AuditChange = {
    key: string;
    label: string;
    type: ChangeType;
    before: unknown;
    after: unknown;
};

type AuditDetailState = {
    item: AuditLogRecord;
    changes: AuditChange[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const parseAuditPayload = (value: unknown): unknown => {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return value;
    }

    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    return value;
};

const flattenValue = (path: string, value: unknown, target: FlatRecord) => {
    if (isPlainObject(value)) {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            target[path] = value;
            return;
        }
        entries.forEach(([nestedKey, nestedValue]) => {
            flattenValue(path ? `${path}.${nestedKey}` : nestedKey, nestedValue, target);
        });
        return;
    }

    target[path] = value;
};

const toFlatRecord = (raw: unknown): FlatRecord => {
    const parsed = parseAuditPayload(raw);

    if (parsed == null) {
        return {};
    }
    if (isPlainObject(parsed)) {
        const output: FlatRecord = {};
        Object.entries(parsed).forEach(([key, value]) => {
            flattenValue(key, value, output);
        });
        return output;
    }
    if (Array.isArray(parsed)) {
        return { data: parsed };
    }
    return { value: parsed };
};

const isEqualValue = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return a == null && b == null;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let index = 0; index < a.length; index += 1) {
            if (!isEqualValue(a[index], b[index])) return false;
        }
        return true;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) => isEqualValue(a[key], b[key]));
    }
    return false;
};

const toTitleCase = (value: string) =>
    value
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const formatFieldLabel = (path: string) =>
    path
        .split('.')
        .map((segment) => toTitleCase(segment))
        .join(' > ');

const summarizeValue = (value: unknown): string => {
    if (value == null) return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
        return value.trim() ? value : '(kosong)';
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return '(kosong)';
        const isSimple = value.every(
            (item) =>
                item == null ||
                typeof item === 'string' ||
                typeof item === 'number' ||
                typeof item === 'boolean',
        );
        if (isSimple) {
            return value.map((item) => summarizeValue(item)).join(', ');
        }
        return `${value.length} item data`;
    }
    if (isPlainObject(value)) {
        const totalFields = Object.keys(value).length;
        return `Objek (${totalFields} field)`;
    }
    return String(value);
};

const normalizeComparableValue = (value: unknown): unknown => {
    if (value == null) return '';
    if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized === '' ? '' : normalized;
    }
    return value;
};

const extractChanges = (oldValues: unknown, newValues: unknown): AuditChange[] => {
    const before = toFlatRecord(oldValues);
    const after = toFlatRecord(newValues);
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    const changes: AuditChange[] = [];

    allKeys.forEach((key) => {
        const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
        const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
        const beforeValue = before[key];
        const afterValue = after[key];
        const normalizedBefore = normalizeComparableValue(beforeValue);
        const normalizedAfter = normalizeComparableValue(afterValue);

        if (!hasBefore && hasAfter && normalizedAfter === '') {
            return;
        }
        if (hasBefore && !hasAfter && normalizedBefore === '') {
            return;
        }
        if (key === 'password_reset' && normalizedAfter !== true) {
            return;
        }

        if (!hasBefore && hasAfter) {
            changes.push({
                key,
                label: formatFieldLabel(key),
                type: 'added',
                before: null,
                after: afterValue,
            });
            return;
        }
        if (hasBefore && !hasAfter) {
            changes.push({
                key,
                label: formatFieldLabel(key),
                type: 'removed',
                before: beforeValue,
                after: null,
            });
            return;
        }
        if (!isEqualValue(normalizedBefore, normalizedAfter)) {
            changes.push({
                key,
                label: formatFieldLabel(key),
                type: 'changed',
                before: beforeValue,
                after: afterValue,
            });
        }
    });

    return changes;
};

const asStringOrNull = (value: unknown): string | null => {
    if (value == null) return null;
    const normalized = String(value).trim();
    return normalized === '' ? null : normalized;
};

const extractEntityName = (item: AuditLogRecord): string | null => {
    const newValues = toFlatRecord(item.new_values);
    const oldValues = toFlatRecord(item.old_values);
    const candidates = [
        'name',
        'full_name',
        'user_name',
        'employee_name',
        'applicant_name',
        'division_name',
        'title',
        'subject',
        'code',
    ];

    for (const key of candidates) {
        const current = asStringOrNull(newValues[key]) ?? asStringOrNull(oldValues[key]);
        if (current) {
            return current;
        }
    }

    return null;
};

const formatObjectLabel = (item: AuditLogRecord): string => {
    const rawType = asStringOrNull(item.entity_type) ?? 'Objek';
    const typeLabel = toTitleCase(rawType.replace(/[._-]+/g, ' '));
    const idLabel = asStringOrNull(item.entity_id);
    const suffix = idLabel ? `#${idLabel}` : '';
    const displayName = extractEntityName(item);

    if (/^user$/i.test(rawType)) {
        if (displayName) {
            return `${typeLabel}${suffix} - ${displayName}`;
        }
        return `${typeLabel}${suffix}`.trim();
    }

    if (displayName) {
        return `${typeLabel}${suffix} - ${displayName}`;
    }

    return `${typeLabel}${suffix}`.trim();
};

const changeTypeMeta: Record<ChangeType, { label: string; className: string }> = {
    added: {
        label: 'Ditambah',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    removed: {
        label: 'Dihapus',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
    },
    changed: {
        label: 'Diubah',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
};

const renderChangesContent = (
    itemId: number,
    changes: AuditChange[],
    onOpenDetail: () => void,
) => {
    if (changes.length === 0) {
        return (
            <div className="space-y-2">
                <p className="text-xs text-slate-500">
                    Tidak ada perubahan field yang terdeteksi.
                </p>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start text-xs" onClick={onOpenDetail}>
                    Lihat detail log
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-2">
                {changes.slice(0, 2).map((change) => (
                    <div key={`${itemId}-${change.key}`} className="flex items-center justify-between gap-2 text-[11px]">
                        <p className="truncate font-medium text-slate-700">{change.label}</p>
                        <Badge
                            variant="outline"
                            className={changeTypeMeta[change.type].className}
                        >
                            {changeTypeMeta[change.type].label}
                        </Badge>
                    </div>
                ))}
                {changes.length > 2 && (
                    <p className="text-[11px] text-slate-500">
                        +{changes.length - 2} perubahan lainnya
                    </p>
                )}
            </div>

            <Button type="button" variant="outline" size="sm" className="w-full justify-start text-xs" onClick={onOpenDetail}>
                Lihat detail perubahan ({changes.length})
            </Button>
        </div>
    );
};

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

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
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
        setSearch(filters.search ?? '');
        setModule(filters.module || 'all');
        setAction(filters.action || 'all');
        setDateFrom(filters.date_from ?? '');
        setDateTo(filters.date_to ?? '');
    }, [filters.search, filters.module, filters.action, filters.date_from, filters.date_to]);

    const page = auditLogs.current_page || 1;
    const lastPage = auditLogs.last_page || 1;

    const visitPage = (targetPage: number) => {
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

            <Card className="space-y-4 p-4 md:p-6">
                <div className="grid gap-3 md:grid-cols-5">
                    <Input
                        placeholder="Cari user, deskripsi, entity ID..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="md:col-span-2"
                    />
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
                    <div className="grid grid-cols-2 gap-2">
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
                </div>

                <div className="space-y-3 md:hidden">
                    {auditLogs.data.length === 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                            Belum ada data log aktivitas.
                        </div>
                    )}
                    {auditLogs.data.map((item) => {
                        const changes = extractChanges(item.old_values, item.new_values);
                        const viewed = isViewed(item);
                        return (
                            <div
                                key={`mobile-${item.id}`}
                                className={`rounded-xl border p-3 shadow-sm ${viewed
                                    ? 'border-slate-200 bg-white'
                                    : 'border-amber-200 bg-amber-50/40'
                                    }`}
                            >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-slate-500">{item.created_at}</p>
                                        <p className="text-sm font-semibold text-slate-900">{item.user_name ?? '-'}</p>
                                        <p className="text-xs text-slate-500">{item.user_email ?? '-'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {!viewed && (
                                            <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-700">
                                                Belum dilihat
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                            {item.action}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{item.module}</Badge>
                                    <Badge variant="outline" className="text-slate-600">
                                        {formatObjectLabel(item)}
                                    </Badge>
                                </div>

                                <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Deskripsi</p>
                                    <p className="mt-1 text-xs text-slate-700">{item.description ?? '-'}</p>
                                </div>

                                {renderChangesContent(item.id, changes, () => handleOpenDetail(item, changes))}
                            </div>
                        );
                    })}
                </div>

                <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Waktu</TableHead>
                                <TableHead>Aktor</TableHead>
                                <TableHead>Modul</TableHead>
                                <TableHead>Aksi</TableHead>
                                <TableHead>Objek</TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead>Perubahan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditLogs.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                                        Belum ada data log aktivitas.
                                    </TableCell>
                                </TableRow>
                            )}
                            {auditLogs.data.map((item) => {
                                const changes = extractChanges(item.old_values, item.new_values);
                                const viewed = isViewed(item);
                                return (
                                    <TableRow key={item.id} className={viewed ? '' : 'bg-amber-50/40'}>
                                        <TableCell className="text-xs text-slate-600">
                                            <p>{item.created_at}</p>
                                            {!viewed && (
                                                <Badge variant="outline" className="mt-1 border-amber-300 bg-amber-100 text-amber-700">
                                                    Belum dilihat
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm font-medium text-slate-900">{item.user_name ?? '-'}</p>
                                            <p className="text-xs text-slate-500">{item.user_email ?? '-'}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{item.module}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                                {item.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {formatObjectLabel(item)}
                                        </TableCell>
                                        <TableCell className="max-w-[260px] text-xs text-slate-700">
                                            {item.description ?? '-'}
                                        </TableCell>
                                        <TableCell className="max-w-[420px]">
                                            {renderChangesContent(item.id, changes, () => handleOpenDetail(item, changes))}
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
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => visitPage(page - 1)}
                        >
                            Sebelumnya
                        </Button>
                        <span className="text-xs text-slate-600">
                            Halaman {page} / {lastPage}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={page >= lastPage}
                            onClick={() => visitPage(page + 1)}
                        >
                            Berikutnya
                        </Button>
                    </div>
                </div>
            </Card>

            <Dialog open={Boolean(activeDetail)} onOpenChange={(open) => !open && setActiveDetail(null)}>
                <DialogContent className="w-[92vw] max-w-4xl max-h-[90vh] overflow-hidden border-0 bg-white p-0">
                    {activeDetail && (
                        <>
                            <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4 text-left">
                                <DialogTitle>Detail Perubahan Log Aktivitas</DialogTitle>
                                <DialogDescription className="space-y-1">
                                    <span className="block text-xs text-slate-500">
                                        {activeDetail.item.created_at}
                                    </span>
                                    <span className="block text-sm text-slate-700">
                                        {formatObjectLabel(activeDetail.item)}
                                    </span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="max-h-[65vh] space-y-3 overflow-y-auto px-6 py-4">
                                {activeDetail.changes.length === 0 ? (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                        Log ini tidak memiliki perubahan field terstruktur, namun sudah ditandai sebagai dilihat.
                                    </div>
                                ) : (
                                    activeDetail.changes.map((change) => (
                                        <div key={`modal-${activeDetail.item.id}-${change.key}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-slate-800">{change.label}</p>
                                                <Badge variant="outline" className={changeTypeMeta[change.type].className}>
                                                    {changeTypeMeta[change.type].label}
                                                </Badge>
                                            </div>
                                            <div className="grid gap-2 md:grid-cols-2">
                                                <div className="rounded-md border border-slate-200 bg-white p-2">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sebelum</p>
                                                    <p className="mt-1 break-words text-xs text-slate-700">
                                                        {summarizeValue(change.before)}
                                                    </p>
                                                </div>
                                                <div className="rounded-md border border-slate-200 bg-white p-2">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sesudah</p>
                                                    <p className="mt-1 break-words text-xs text-slate-700">
                                                        {summarizeValue(change.after)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <DialogFooter className="border-t border-slate-100 px-6 py-4">
                                <Button type="button" variant="outline" onClick={() => setActiveDetail(null)}>
                                    Tutup
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </SuperAdminLayout>
    );
}
