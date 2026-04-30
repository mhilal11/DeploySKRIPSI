import { BarChart3, Inbox, Send, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import StatsCards from '@/modules/AdminStaff/components/StatsCards';
import AdminStaffLayout from '@/modules/AdminStaff/Layout';
import { Badge } from '@/shared/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';
import { Head, usePage } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';

interface DashboardPageProps extends Record<string, unknown> {
    stats: {
        inbox: number;
        outbox: number;
        pending: number;
        archived: number;
    };
    mailFlow: Array<{
        month: string;
        label: string;
        incoming: number;
        outgoing: number;
        archived: number;
    }>;
    incomingMails: Array<{
        id: number;
        from: string;
        sender: string;
        subject: string;
        date: string;
        status: string;
        hasAttachment: boolean;
    }>;
    outgoingMails: Array<{
        id: number;
        to: string;
        subject: string;
        date: string;
        status: string;
        hasAttachment: boolean;
    }>;
}

const EMPTY_STATS: DashboardPageProps['stats'] = {
    inbox: 0,
    outbox: 0,
    pending: 0,
    archived: 0,
};

const EMPTY_MAIL_FLOW: DashboardPageProps['mailFlow'] = [];

export default function AdminStaffDashboard() {
    const { props } = usePage<PageProps<Partial<DashboardPageProps>>>();
    const stats = props.stats ?? EMPTY_STATS;
    const incomingMails = props.incomingMails ?? [];
    const outgoingMails = props.outgoingMails ?? [];
    const mailFlow = props.mailFlow ?? EMPTY_MAIL_FLOW;

    const flowSummary = useMemo(() => {
        const totals = mailFlow.reduce(
            (accumulator, item) => ({
                incoming: accumulator.incoming + item.incoming,
                outgoing: accumulator.outgoing + item.outgoing,
                archived: accumulator.archived + item.archived,
            }),
            { incoming: 0, outgoing: 0, archived: 0 },
        );

        const busiestMonth = mailFlow.reduce<(typeof mailFlow)[number] | null>((current, item) => {
            const currentTotal =
                (current?.incoming ?? 0) + (current?.outgoing ?? 0) + (current?.archived ?? 0);
            const nextTotal = item.incoming + item.outgoing + item.archived;
            return nextTotal > currentTotal ? item : current;
        }, null);

        const archivePeak = mailFlow.reduce<(typeof mailFlow)[number] | null>(
            (current, item) => (item.archived > (current?.archived ?? 0) ? item : current),
            null,
        );

        return {
            totals,
            busiestLabel: busiestMonth?.label ?? '-',
            busiestTotal:
                (busiestMonth?.incoming ?? 0) +
                (busiestMonth?.outgoing ?? 0) +
                (busiestMonth?.archived ?? 0),
            archivePeakLabel: archivePeak?.label ?? '-',
            archivePeakTotal: archivePeak?.archived ?? 0,
        };
    }, [mailFlow]);

    return (
        <AdminStaffLayout
            title="Dashboard Admin"
            description="Ringkasan arus surat dan aktivitas divisi Anda"
            breadcrumbs={[{ label: 'Dashboard' }]}
        >
            <Head title="Dashboard Admin" />

            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,1fr)]">
                <MailFlowChart data={mailFlow} />

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-blue-900 md:text-lg">
                            <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                            Ringkasan Flow Surat
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            Sorotan aktivitas surat divisi dalam 6 bulan terakhir.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <FlowMetric label="Surat masuk" value={flowSummary.totals.incoming} tone="blue" />
                            <FlowMetric label="Surat keluar" value={flowSummary.totals.outgoing} tone="green" />
                            <FlowMetric label="Arsip baru" value={flowSummary.totals.archived} tone="purple" />
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Bulan tersibuk</p>
                                    <p className="text-xs text-slate-500">
                                        Total pergerakan surat tertinggi di dashboard.
                                    </p>
                                </div>
                                <Badge variant="secondary">{flowSummary.busiestLabel}</Badge>
                            </div>
                            <p className="text-2xl font-semibold text-blue-900">
                                {formatNumber(flowSummary.busiestTotal)} surat
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-blue-200 text-blue-700">
                                Perlu diproses: {formatNumber(stats.pending)}
                            </Badge>
                            <Badge variant="outline" className="border-purple-200 text-purple-700">
                                Puncak arsip: {flowSummary.archivePeakLabel} ({formatNumber(flowSummary.archivePeakTotal)})
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-blue-900">Surat Masuk</h3>
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                            {formatNumber(stats.inbox)} total
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {incomingMails.length === 0 ? (
                            <EmptyState message="Belum ada surat untuk divisi Anda." />
                        ) : (
                            incomingMails.map((mail) => (
                                <div
                                    key={mail.id}
                                    className={`rounded-lg border p-4 ${
                                        mail.status === 'Diajukan'
                                            ? 'border-blue-200 bg-blue-50'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="break-words font-semibold text-slate-900">{mail.subject}</p>
                                            <p className="break-words text-sm text-slate-500">
                                                {mail.from} - {mail.sender}
                                            </p>
                                        </div>
                                        {mail.hasAttachment && <Badge variant="secondary">Lampiran</Badge>}
                                    </div>
                                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                                        <span>{mail.date}</span>
                                        <span>{mail.status}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-blue-900">Surat Keluar Terbaru</h3>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                            {formatNumber(stats.outbox)} total
                        </Badge>
                    </div>

                    {outgoingMails.length === 0 ? (
                        <EmptyState message="Belum ada surat keluar." />
                    ) : (
                        <div className="space-y-3">
                            {outgoingMails.map((mail) => (
                                <div
                                    key={mail.id}
                                    className="rounded-lg border border-slate-200 bg-white p-4"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="break-words font-medium text-slate-900">{mail.subject}</p>
                                            <p className="break-words text-sm text-slate-500">Kepada: {mail.to}</p>
                                        </div>
                                        {mail.hasAttachment && <Badge variant="secondary">Lampiran</Badge>}
                                    </div>

                                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                                        <span>{mail.date}</span>
                                        <span className="font-medium text-blue-900">{mail.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </AdminStaffLayout>
    );
}

function MailFlowChart({ data }: { data: DashboardPageProps['mailFlow'] }) {
    const hasData = useMemo(
        () => data.some((item) => item.incoming > 0 || item.outgoing > 0 || item.archived > 0),
        [data],
    );

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base text-blue-900 md:text-lg">
                            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                            Flow Surat 6 Bulan Terakhir
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs md:text-sm">
                            Bandingkan surat masuk, surat keluar, dan arsip baru untuk melihat ritme kerja divisi.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700">
                            <Inbox className="h-3.5 w-3.5" />
                            Masuk
                        </Badge>
                        <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700">
                            <Send className="h-3.5 w-3.5" />
                            Keluar
                        </Badge>
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                            Arsip
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <EmptyState message="Belum ada data flow surat untuk periode ini." />
                ) : (
                    <ResponsiveContainer width="100%" height={300} debounce={300}>
                        <BarChart data={data} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                formatter={(value: number | string, name: string) => [
                                    `${formatNumber(Number(value))} surat`,
                                    name,
                                ]}
                                labelFormatter={(label) => `Periode ${label}`}
                            />
                            <Legend />
                            <Bar dataKey="incoming" name="Surat Masuk" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="outgoing" name="Surat Keluar" fill="#16a34a" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="archived" name="Arsip Baru" fill="#9333ea" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

function FlowMetric({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'blue' | 'green' | 'purple';
}) {
    const styles = {
        blue: 'border-blue-200 bg-blue-50 text-blue-900',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        purple: 'border-purple-200 bg-purple-50 text-purple-900',
    }[tone];

    return (
        <div className={`rounded-xl border p-4 ${styles}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(value)}</p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
            {message}
        </div>
    );
}

function formatNumber(value: number) {
    return Intl.NumberFormat('id-ID').format(value);
}
