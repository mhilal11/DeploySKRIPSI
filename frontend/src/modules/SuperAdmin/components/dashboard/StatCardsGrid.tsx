import {
    Activity,
    Settings,
    Shield,
    TrendingDown,
    TrendingUp,
    UserPlus,
    Users,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

type StatCardsGridProps = {
    stats: Record<'totalUsers' | 'superAdmins' | 'admins' | 'staff' | 'pelamar', number>;
    statChanges: Record<'totalUsers' | 'superAdmins' | 'admins' | 'staff' | 'pelamar', number>;
};

type StatKey = keyof StatCardsGridProps['stats'];

type StatConfig = {
    key: StatKey;
    label: string;
    icon: LucideIcon;
    color: string;
};

const statConfig: StatConfig[] = [
    {
        key: 'totalUsers',
        label: 'Total Users',
        icon: Users,
        color: 'bg-blue-500',
    },
    {
        key: 'superAdmins',
        label: 'Super Admin',
        icon: Shield,
        color: 'bg-purple-500',
    },
    {
        key: 'admins',
        label: 'Admin Accounts',
        icon: Settings,
        color: 'bg-indigo-500',
    },
    {
        key: 'staff',
        label: 'Staff',
        icon: Activity,
        color: 'bg-emerald-500',
    },
    {
        key: 'pelamar',
        label: 'Pelamar',
        icon: UserPlus,
        color: 'bg-orange-500',
    },
];

export function StatCardsGrid({ stats, statChanges }: StatCardsGridProps) {
    const statCards = statConfig.map((config) => {
        const value = stats[config.key] ?? 0;
        const changeValue = statChanges[config.key] ?? 0;
        const trend = changeValue >= 0 ? 'up' : 'down';

        return {
            ...config,
            value: value.toString(),
            change: `${changeValue >= 0 ? '+' : ''}${changeValue}`,
            trend,
        };
    });

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {statCards.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                    <div className="flex items-start justify-between">
                        <div className={`${stat.color} rounded-xl p-2`}>
                            <stat.icon className="h-5 w-5 text-white" />
                        </div>
                        {stat.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        {stat.label}
                    </p>
                    <div className="mt-1 flex items-end gap-1.5">
                        <span className="text-xl font-semibold text-blue-900">
                            {stat.value}
                        </span>
                        <span
                            className={`text-xs ${
                                stat.trend === 'up'
                                    ? 'text-green-500'
                                    : 'text-red-500'
                            }`}
                        >
                            {stat.change}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
