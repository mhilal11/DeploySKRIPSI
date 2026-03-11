import { CheckCircle2, XCircle } from 'lucide-react';

import type { DivisionRecord } from '@/modules/SuperAdmin/KelolaDivisi/types';
import { Badge } from '@/shared/components/ui/badge';


type DivisionOverviewProps = {
    division: DivisionRecord;
    hasActiveJobs: boolean;
};

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs text-slate-600">{label}</p>
            <p className="mt-2 font-semibold text-blue-900">{value}</p>
        </div>
    );
}

export function DivisionOverview({ division, hasActiveJobs }: DivisionOverviewProps) {
    const ratio =
        division.capacity > 0
            ? Math.min((division.current_staff / division.capacity) * 100, 100)
            : 0;
    const capacityStatus =
        division.available_slots <= 0
            ? { color: 'text-red-600', bg: 'bg-red-100' }
            : division.capacity > 0 && division.current_staff / division.capacity >= 0.8
                ? { color: 'text-orange-600', bg: 'bg-orange-100' }
                : { color: 'text-green-600', bg: 'bg-green-100' };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">Kapasitas Staff</p>
                    <Badge className={`${capacityStatus.bg} ${capacityStatus.color}`}>
                        {division.current_staff}/{division.capacity}
                    </Badge>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div
                        className={`h-2 rounded-full ${
                            division.available_slots === 0
                                ? 'bg-red-500'
                                : division.capacity > 0 && division.current_staff / division.capacity >= 0.8
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                        }`}
                        style={{ width: `${ratio}%` }}
                    />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                    {division.available_slots > 0 ? (
                        <span className="text-green-600">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            {division.available_slots} slot tersedia
                        </span>
                    ) : (
                        <span className="text-red-600">
                            <XCircle className="mr-1 inline h-3 w-3" />
                            Kapasitas penuh
                        </span>
                    )}
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard label="Total Staff" value={`${division.current_staff} orang`} />
                <InfoCard label="Slot Tersedia" value={`${division.available_slots} slot`} />
                <InfoCard label="Status Rekrutmen" value={hasActiveJobs ? 'Aktif' : 'Tidak Aktif'} />
                <InfoCard label="Manager" value={division.manager_name ?? '-'} />
            </div>
        </div>
    );
}
