import { AlertCircle, FileText, Megaphone, MessageSquare } from 'lucide-react';

import StatsCard from '@/modules/Staff/components/StatsCard';

import type { ComplaintStats } from '../types';

interface OverviewCardsProps {
    stats: ComplaintStats;
}

export default function OverviewCards({ stats }: OverviewCardsProps) {
    return (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                label="Pengaduan Baru"
                value={stats.new}
                icon={<AlertCircle className="h-4 w-4 text-blue-900" />}
                accent="bg-blue-100 text-blue-900"
            />
            <StatsCard
                label="Sedang Ditangani"
                value={stats.inProgress}
                icon={<MessageSquare className="h-4 w-4 text-blue-900" />}
                accent="bg-amber-100 text-amber-900"
            />
            <StatsCard
                label="Selesai Bulan Ini"
                value={stats.resolved}
                icon={<FileText className="h-4 w-4 text-blue-900" />}
                accent="bg-green-100 text-green-900"
            />
            <StatsCard
                label="Regulasi Aktif"
                value={stats.regulations}
                icon={<Megaphone className="h-4 w-4 text-blue-900" />}
                accent="bg-purple-100 text-purple-900"
            />
        </section>
    );
}



