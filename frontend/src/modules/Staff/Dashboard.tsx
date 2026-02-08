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

const iconMap: Record<DashboardStats['icon'], JSX.Element> = {
    alert: <AlertCircle className="h-4 w-4 text-blue-900" />,
    message: <MessageSquare className="h-4 w-4 text-blue-900" />,
    file: <FileText className="h-4 w-4 text-blue-900" />,
    briefcase: <Briefcase className="h-4 w-4 text-blue-900" />,
};

export default function StaffDashboard() {
    const { props } = usePage<PageProps<Partial<DashboardPageProps>>>();
    const stats = props.stats ?? EMPTY_STATS;
    const recentComplaints = props.recentComplaints ?? EMPTY_COMPLAINTS;
    const termination = props.termination ?? EMPTY_TERMINATION;

    // Sembunyikan statistik regulasi/dokumen
    const filteredStats = stats.filter(
        (item) =>
            item.icon !== 'file' &&
            !item.label.toLowerCase().includes('regulasi') &&
            !item.label.toLowerCase().includes('dokumen'),
    );

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
                        {filteredStats.map((item) => (
                            <StatsCard
                                key={item.label}
                                label={item.label}
                                value={item.value}
                                icon={iconMap[item.icon]}
                            />
                        ))}
                    </div>
                </section>

                {/* LIST SECTION */}
                <section className="overflow-x-auto">
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
                                    <p className="text-xs uppercase text-slate-500">Progress</p>
                                    <Progress
                                        value={termination.active.progress ?? 0}
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





