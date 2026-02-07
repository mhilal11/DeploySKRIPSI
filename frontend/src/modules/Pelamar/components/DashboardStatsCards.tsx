import { TrendingUp, FileText, Clock, XCircle, CheckCircle } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

interface StatsCardsProps {
    totalApplications: number;
    inProgress: number;
    rejected: number;
    hired: number;
}

export default function DashboardStatsCards({
    totalApplications,
    inProgress,
    rejected,
    hired,
}: StatsCardsProps) {
    const statsCards = [
        {
            title: 'Total Lamaran',
            value: totalApplications,
            icon: FileText,
            bgColor: 'bg-blue-100',
            iconColor: 'text-blue-600',
            trend: 'Semua lamaran',
        },
        {
            title: 'Dalam Proses',
            value: inProgress,
            icon: Clock,
            bgColor: 'bg-orange-100',
            iconColor: 'text-orange-600',
            trend: 'Menunggu hasil',
        },
        {
            title: 'Ditolak',
            value: rejected,
            icon: XCircle,
            bgColor: 'bg-red-100',
            iconColor: 'text-red-600',
            trend: 'Belum berhasil',
        },
        {
            title: 'Diterima',
            value: hired,
            icon: CheckCircle,
            bgColor: 'bg-green-100',
            iconColor: 'text-green-600',
            trend: 'Selamat!',
        },
    ];

    return (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat, index) => (
                <Card
                    key={index}
                    className="border-0 shadow-sm transition-all hover:shadow-md"
                >
                    <div className="p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}
                            >
                                <stat.icon
                                    className={`h-6 w-6 ${stat.iconColor}`}
                                />
                            </div>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-2xl font-bold text-gray-900">
                                {stat.value}
                            </p>
                            <p className="text-sm text-gray-600">{stat.title}</p>
                            <p className="text-xs text-gray-500">{stat.trend}</p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}


