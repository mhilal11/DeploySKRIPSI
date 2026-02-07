import { Building2, Briefcase, CheckCircle2, LucideIcon, Users } from 'lucide-react';

import { Card, CardContent } from '@/shared/components/ui/card';

import { StatsSummary } from '../types';

const SUMMARY_ITEMS: Array<{
    key: keyof StatsSummary;
    title: string;
    icon: LucideIcon;
    accent: string;
}> = [
    {
        key: 'total_divisions',
        title: 'Total Divisi',
        icon: Building2,
        accent: 'bg-blue-100 text-blue-900',
    },
    {
        key: 'total_staff',
        title: 'Total Staff',
        icon: Users,
        accent: 'bg-green-100 text-green-900',
    },
    {
        key: 'active_vacancies',
        title: 'Lowongan Aktif',
        icon: Briefcase,
        accent: 'bg-orange-100 text-orange-900',
    },
    {
        key: 'available_slots',
        title: 'Slot Tersedia',
        icon: CheckCircle2,
        accent: 'bg-purple-100 text-purple-900',
    },
];

export function SummaryCards({ stats }: { stats: StatsSummary }) {
    return (
        <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
            {SUMMARY_ITEMS.map((item) => (
                <SummaryCard
                    key={item.key}
                    title={item.title}
                    value={stats[item.key]}
                    icon={item.icon}
                    accent={item.accent}
                />
            ))}
        </div>
    );
}

function SummaryCard({
    title,
    value,
    icon: Icon,
    accent,
}: {
    title: string;
    value: number;
    icon: LucideIcon;
    accent: string;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-2 md:gap-4 p-3 md:p-6">
                <div className={`rounded-lg p-2 md:p-3 ${accent}`}>
                    <Icon className="h-4 w-4 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] md:text-sm text-slate-500 truncate">{title}</p>
                    <p className="text-lg md:text-2xl font-semibold text-slate-900">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}


