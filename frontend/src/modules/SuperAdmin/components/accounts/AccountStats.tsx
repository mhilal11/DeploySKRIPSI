interface AccountStatsProps {
    stats: {
        total: number;
        super_admin: number;
        admin: number;
        staff: number;
        pelamar: number;
    };
}

const labels: { key: keyof AccountStatsProps['stats']; label: string }[] = [
    { key: 'total', label: 'Total Accounts' },
    { key: 'super_admin', label: 'Super Admin' },
    { key: 'admin', label: 'Admin' },
    { key: 'staff', label: 'Staff' },
    { key: 'pelamar', label: 'Pelamar' },
];

export default function AccountStats({ stats }: AccountStatsProps) {
    return (
        <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {labels.map((item) => (
                <div key={item.key} className="rounded-lg border bg-white p-2 md:p-4 shadow-sm">
                    <p className="text-[9px] md:text-xs uppercase tracking-wide text-slate-500 truncate">{item.label}</p>
                    <p className="mt-0.5 md:mt-1 text-lg md:text-2xl font-semibold text-blue-900">{stats[item.key]}</p>
                </div>
            ))}
        </div>
    );
}

