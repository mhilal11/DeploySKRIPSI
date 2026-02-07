import { CheckCircle, Clock, FileText, UserMinus } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

interface StatsCardsProps {
    stats: {
        newRequests: number;
        inProcess: number;
        completedThisMonth: number;
        archived: number;
    };
}

const items = [
    {
        key: 'newRequests',
        label: 'Pengajuan Baru',
        icon: UserMinus,
        color: 'bg-blue-500',
    },
    {
        key: 'inProcess',
        label: 'Dalam Proses',
        icon: Clock,
        color: 'bg-orange-500',
    },
    {
        key: 'completedThisMonth',
        label: 'Selesai (Bulan Ini)',
        icon: CheckCircle,
        color: 'bg-green-500',
    },
    {
        key: 'archived',
        label: 'Arsip Nonaktif',
        icon: FileText,
        color: 'bg-purple-500',
    },
] as const;

export default function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-2 gap-2 md:gap-6 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
                const Icon = item.icon;
                const value = stats[item.key] ?? 0;
                return (
                    <Card key={item.key} className="p-3 md:p-6">
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className={`rounded-lg p-2 md:p-3 text-white ${item.color}`}>
                                <Icon className="h-4 w-4 md:h-6 md:w-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-sm text-slate-500 truncate">{item.label}</p>
                                <p className="text-lg md:text-2xl font-semibold text-blue-900">
                                    {value}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}


