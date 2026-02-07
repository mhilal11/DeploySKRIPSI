import { Archive, Inbox, Mail, Send } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

interface StatsCardsProps {
    stats: {
        inbox: number;
        outbox: number;
        pending: number;
        archived: number;
    };
}

const STAT_META = [
    {
        key: 'inbox',
        label: 'Surat Masuk',
        icon: Inbox,
        bg: 'bg-blue-500',
    },
    {
        key: 'outbox',
        label: 'Surat Keluar',
        icon: Send,
        bg: 'bg-green-500',
    },
    {
        key: 'pending',
        label: 'Perlu Diproses',
        icon: Mail,
        bg: 'bg-orange-500',
    },
    {
        key: 'archived',
        label: 'Arsip',
        icon: Archive,
        bg: 'bg-purple-500',
    },
] as const;

export default function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-2 gap-2 md:gap-6 md:grid-cols-2 xl:grid-cols-4">
            {STAT_META.map((item) => {
                const Icon = item.icon;
                return (
                    <Card key={item.key} className="p-3 md:p-6">
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className={cn('rounded-lg p-2 md:p-3 text-white', item.bg)}>
                                <Icon className="h-4 w-4 md:h-6 md:w-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-sm text-slate-500 truncate">
                                    {item.label}
                                </p>
                                <p className="text-lg md:text-2xl font-semibold text-blue-900">
                                    {stats[item.key] ?? 0}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}


