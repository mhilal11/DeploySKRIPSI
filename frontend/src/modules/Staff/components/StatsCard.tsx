import { Card } from '@/shared/components/ui/card';

import type { ReactNode } from 'react';

interface StatsCardProps {
    label: string;
    value: number | string;
    icon?: ReactNode;
    accent?: string;
    subtext?: string;
}

export default function StatsCard({
    label,
    value,
    icon,
    accent = 'bg-blue-100 text-blue-900',
    subtext,
}: StatsCardProps) {
    const formattedValue =
        typeof value === 'number'
            ? Intl.NumberFormat('id-ID').format(value)
            : value;

    return (
        <Card className="p-5">
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-2xl font-semibold text-blue-900">{formattedValue}</p>
            {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
        </Card>
    );
}


