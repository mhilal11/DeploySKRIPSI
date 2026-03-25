import { AlertCircle, Briefcase, FileText, MessageSquare } from 'lucide-react';

import StaffLayout from '@/modules/Staff/components/Layout';
import StatsCard from '@/modules/Staff/components/StatsCard';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { Head, usePage } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';

interface DashboardStats {
    label: string;
    value: number;
    icon: 'alert' | 'message' | 'file' | 'briefcase';
}

interface ComplaintRecord {
    id: number;
    subject: string;
    status: string;
    priority: string;
    date: string;
}

interface TerminationSummary {
    reference: string;
    status: string;
    progress: number | null;
    requestDate: string;
    effectiveDate: string;
}

interface DashboardPageProps extends Record<string, unknown> {
    stats: DashboardStats[];
    recentComplaints: ComplaintRecord[];
    termination: {
        active: TerminationSummary | null;
        history: TerminationSummary[];
    };
}

const EMPTY_STATS: DashboardStats[] = [];
const EMPTY_COMPLAINTS: ComplaintRecord[] = [];
const EMPTY_TERMINATION: DashboardPageProps['termination'] = {
    active: null,
    history: [],
};

const statVisualMap: Record<DashboardStats['icon'], { icon: JSX.Element; accent: string }> = {
    alert: {
        icon: <AlertCircle className="h-4 w-4" />,
        accent: 'bg-blue-100 text-blue-900',
    },
    message: {
        icon: <MessageSquare className="h-4 w-4" />,
        accent: 'bg-green-100 text-green-900',
    },
    file: {
        icon: <FileText className="h-4 w-4" />,
        accent: 'bg-orange-100 text-orange-900',
    },
    briefcase: {
        icon: <Briefcase className="h-4 w-4" />,
        accent: 'bg-purple-100 text-purple-900',
    },
};
const ALLOWED_ICONS: ReadonlyArray<DashboardStats['icon']> = ['alert', 'message', 'file', 'briefcase'];

export default function StaffDashboard() {
    const { props } = usePage<PageProps<Partial<DashboardPageProps>>>();
    const stats = Array.isArray(props.stats)
        ? props.stats.filter(
            (item): item is DashboardStats =>
                Boolean(item) &&
                typeof item.label === 'string' &&
                typeof item.value === 'number' &&
                typeof item.icon === 'string' &&
                ALLOWED_ICONS.includes(item.icon as DashboardStats['icon']),
        )
        : EMPTY_STATS;
    const recentComplaints = Array.isArray(props.recentComplaints)
        ? props.recentComplaints
        : EMPTY_COMPLAINTS;
    const terminationRaw =
        props.termination && typeof props.termination === 'object'
            ? props.termination
            : EMPTY_TERMINATION;
    const termination: DashboardPageProps['termination'] = {
        active: terminationRaw.active ?? null,
        history: Array.isArray(terminationRaw.history) ? terminationRaw.history : [],
    };
    const statsByIcon = stats.reduce<Record<DashboardStats['icon'], number>>(
        (acc, item) => {
            acc[item.icon] = item.value;
            return acc;
        },
        { alert: 0, message: 0, file: 0, briefcase: 0 },
    );
    const activeComplaints = statsByIcon.alert;
    const totalComplaints = statsByIcon.message;
    const regulationsCount = statsByIcon.file;
    const resignationCount = statsByIcon.briefcase;
    const resolvedComplaints = Math.max(0, totalComplaints - activeComplaints);
    const completionRate =
        totalComplaints > 0
            ? Math.round((resolvedComplaints / totalComplaints) * 100)
            : 0;
    const activeRate =
        totalComplaints > 0
            ? Math.round((activeComplaints / totalComplaints) * 100)
            : 0;
    const highPriorityRecent = recentComplaints.filter((item) => isHighPriority(item.priority)).length;
    const onProgressRecent = recentComplaints.filter((item) => isInProgressStatus(item.status)).length;
    const statCards = [
        {
            key: 'active',
            label: 'Pengaduan Aktif',
            value: activeComplaints,
            icon: statVisualMap.alert.icon,
            accent: statVisualMap.alert.accent,
            subtext:
                totalComplaints > 0
                    ? `${activeRate}% dari total pengaduan`
                    : 'Belum ada pengaduan',
        },
        {
            key: 'total',
            label: 'Total Pengaduan',
            value: totalComplaints,
            icon: statVisualMap.message.icon,
            accent: statVisualMap.message.accent,
            subtext: `${resolvedComplaints} pengaduan selesai`,
        },
        {
            key: 'regulations',
            label: 'Regulasi Terbaru',
            value: regulationsCount,
            icon: statVisualMap.file.icon,
            accent: statVisualMap.file.accent,
            subtext: 'Update regulasi 3 bulan terakhir',
        },
        {
            key: 'resignation',
            label: 'Pengajuan Resign',
            value: resignationCount,
            icon: statVisualMap.briefcase.icon,
            accent: statVisualMap.briefcase.accent,
            subtext: termination.active ? `Aktif: ${termination.active.status}` : 'Tidak ada pengajuan aktif',
        },
    ];

    const getDisplayProgress = (item: TerminationSummary | null) => {
        if (!item) return 0;
        const statusLower = (item.status ?? '').toLowerCase();
        if (
            statusLower.includes('diajukan') ||
            statusLower.includes('menunggu') ||
            statusLower.includes('pending') ||
            statusLower.includes('baru')
        ) {
            return 0;
        }
        const raw = Number(item.progress ?? 0);
        return Number.isFinite(raw) ? Math.max(0, raw) : 0;
    };

    return (
        <>
            <Head title="Dashboard Staff" />
            <StaffLayout
                title="Dashboard Staff"
                description="Pantau status keluhan, dokumen terbaru, dan proses resign Anda."
            >
                {/* GRID TIDAK DIUBAH DI MOBILE  HANYA SCROLL */}
                <section className="w-full">
                    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {statCards.map((item) => {
                            return (
                                <StatsCard
                                    key={item.key}
                                    label={item.label}
                                    value={item.value}
                                    icon={item.icon}
                                    accent={item.accent}
                                    subtext={item.subtext}
                                />
                            );
                        })}
                    </div>
                </section>

                <section className="mt-6">
                    <Card className="p-4 sm:p-6">
                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <h2 className="text-lg font-semibold text-blue-900">Ringkasan Kinerja Pengaduan</h2>
                                <p className="text-sm text-slate-500">
                                    Pantau efektivitas penanganan keluhan berdasarkan data yang tersedia
                                </p>

                                <div className="mt-4 space-y-3">
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-700">Tingkat Penyelesaian</p>
                                            <p className="text-sm font-semibold text-emerald-700">{completionRate}%</p>
                                        </div>
                                        <Progress value={completionRate} className="mt-2" />
                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-700">Pengaduan Masih Aktif</p>
                                            <p className="text-sm font-semibold text-amber-700">
                                                {activeComplaints} dari {totalComplaints}
                                            </p>
                                        </div>
                                        <Progress value={activeRate} className="mt-2" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 p-4">
                                <h3 className="text-sm font-semibold text-slate-800">Snapshot Keluhan Terbaru</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Ringkasan dari {recentComplaints.length} keluhan terakhir
                                </p>
                                <div className="mt-3 space-y-2 text-sm text-slate-700">
                                    <div className="flex items-center justify-between">
                                        <span>Prioritas Tinggi</span>
                                        <Badge variant="outline" className="border-red-500 text-red-600">
                                            {highPriorityRecent}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>On Progress</span>
                                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                                            {onProgressRecent}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Status Resign Aktif</span>
                                        <Badge variant="outline" className="border-blue-500 text-blue-600">
                                            {termination.active ? termination.active.status : 'Tidak Ada'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* LIST SECTION */}
                <section className="mt-6 overflow-x-auto">
                    <div className="grid min-w-max grid-cols-1 gap-6 lg:grid-cols-1">
                        <Card className="p-4 sm:p-6 w-full">
                            <h2 className="text-lg font-semibold text-blue-900">Keluhan Terbaru</h2>
                            <p className="text-sm text-slate-500">
                                Update status pengaduan yang Anda kirim
                            </p>

                            <div className="mt-4 space-y-3">
                                {recentComplaints.length === 0 && (
                                    <p className="text-sm text-slate-500">
                                        Belum ada keluhan yang diajukan.
                                    </p>
                                )}

                                {recentComplaints.map((complaint) => (
                                    <div
                                        key={complaint.id}
                                        className="flex justify-between rounded-lg border border-slate-200 p-3"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-900">{complaint.subject}</p>
                                            <p className="text-xs text-slate-500">{complaint.date}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <StatusBadge status={complaint.status} />
                                            <PriorityBadge priority={complaint.priority} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                    </div>
                </section>

                {/* STATUS RESIGN */}
                <Card className="p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-blue-900">Status Pengajuan Resign</h2>
                    <p className="text-sm text-slate-500">
                        Progres dan riwayat pengajuan resign Anda
                    </p>

                    {/* ACTIVE REQUEST */}
                    {termination.active ? (
                        <div className="mt-4 rounded-lg border border-slate-200 p-4">
                            <div className="grid gap-4 md:grid-cols-4">
                                <Detail label="Referensi" value={termination.active.reference} />
                                <Detail label="Status" value={<StatusBadge status={termination.active.status} />} />
                                <Detail label="Efektif" value={termination.active.effectiveDate} />

                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase text-slate-500">Progress</p>
                                        <p className="text-xs font-semibold text-slate-700">
                                            {getDisplayProgress(termination.active)}%
                                        </p>
                                    </div>
                                    <Progress
                                        value={getDisplayProgress(termination.active)}
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-slate-500">Belum ada pengajuan aktif.</p>
                    )}

                    {/* HISTORY */}
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-slate-700">Riwayat Pengajuan</h3>

                        <div className="mt-3 space-y-2">
                            {termination.history.length === 0 && (
                                <p className="text-sm text-slate-500">Tidak ada riwayat.</p>
                            )}

                            {termination.history.map((item) => (
                                <div
                                    key={item.reference}
                                    className="flex justify-between rounded-lg border border-slate-200 p-3 text-sm"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-900">{item.reference}</p>
                                        <p className="text-xs text-slate-500">Diajukan: {item.requestDate}</p>
                                    </div>

                                    <div className="text-right">
                                        <StatusBadge status={item.status} />
                                        <p className="text-xs text-slate-500">Efektif: {item.effectiveDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </StaffLayout>
        </>
    );
}

function Detail({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    if (s.includes('selesai'))
        return <Badge className="border-green-500 text-green-600" variant="outline">{status}</Badge>;
    if (s.includes('proses') || s.includes('menunggu'))
        return <Badge className="border-amber-500 text-amber-600" variant="outline">{status}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const s = priority.toLowerCase();
    if (s.includes('tinggi') || s === 'high')
        return <Badge className="bg-red-500 text-white">Prioritas Tinggi</Badge>;
    if (s.includes('sedang') || s === 'medium')
        return <Badge className="bg-orange-500 text-white">Prioritas Sedang</Badge>;
    return <Badge className="bg-blue-500 text-white">Prioritas Rendah</Badge>;
}

function isHighPriority(priority: string) {
    const value = (priority ?? '').toLowerCase();
    return value.includes('tinggi') || value.includes('high');
}

function isInProgressStatus(status: string) {
    const value = (status ?? '').toLowerCase();
    return (
        value.includes('progress') ||
        value.includes('proses') ||
        value.includes('ditangani') ||
        value.includes('new') ||
        value.includes('baru')
    );
}





