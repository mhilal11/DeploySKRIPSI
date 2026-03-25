import { TrendingDown, TrendingUp } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

import type { ReactNode } from 'react';

interface StatsCardProps {
    label: string;
    value: number | string;
    icon?: ReactNode;
    accent?: string;
    subtext?: string;
    change?: number;
}

export default function StatsCard({
    label,
    value,
    icon,
    accent = 'bg-blue-100 text-blue-900',
    subtext,
    change,
}: StatsCardProps) {
    const formattedValue =
        typeof value === 'number'
            ? Intl.NumberFormat('id-ID').format(value)
            : value;
    const trend = typeof change === 'number' ? (change >= 0 ? 'up' : 'down') : null;
    const formattedChange = typeof change === 'number'
        ? `${change >= 0 ? '+' : ''}${change}`
        : null;

    return (
        <Card className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between">
                {icon ? (
                    <div className={`rounded-xl p-2 ${accent}`}>
                        {icon}
                    </div>
                ) : (
                    <div />
                )}
                {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
            </div>

            <p className="mt-3 text-xs text-slate-500">{label}</p>
            <div className="mt-1 flex items-end gap-1.5">
                <span className="text-xl font-semibold text-blue-900">{formattedValue}</span>
                {formattedChange && (
                    <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {formattedChange}
                    </span>
                )}
            </div>
            {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </Card>
    );
}
