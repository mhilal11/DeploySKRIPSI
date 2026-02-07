import { AlertCircle, CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

interface ComplaintStatsProps {
    stats: {
        total: number;
        new: number;
        in_progress: number;
        resolved: number;
    };
}

export default function ComplaintStats({ stats }: ComplaintStatsProps) {
    const items = [
        {
            label: 'Pengaduan Baru',
            value: stats.new,
            icon: AlertCircle,
            accent: 'bg-blue-500',
        },
        {
            label: 'Sedang Ditangani',
            value: stats.in_progress,
            icon: RefreshCw,
            accent: 'bg-amber-500',
        },
        {
            label: 'Selesai Bulan Ini',
            value: stats.resolved,
            icon: CheckCircle2,
            accent: 'bg-emerald-500',
        },
        {
            label: 'Total Pengaduan',
            value: stats.total,
            icon: ClipboardList,
            accent: 'bg-indigo-500',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-2 md:gap-6 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <Card key={item.label} className="p-3 md:p-6">
                        <div className="flex items-center gap-2 md:gap-4">
                            <span
                                className={`inline-flex h-8 w-8 md:h-12 md:w-12 items-center justify-center rounded-lg text-white ${item.accent}`}
                            >
                                <Icon className="h-4 w-4 md:h-6 md:w-6" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-sm text-slate-500 truncate">{item.label}</p>
                                <p className="text-lg md:text-2xl font-semibold text-blue-900">
                                    {Intl.NumberFormat('id-ID').format(item.value)}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}



