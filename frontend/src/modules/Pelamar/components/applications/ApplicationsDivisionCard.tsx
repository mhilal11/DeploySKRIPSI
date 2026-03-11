import {
    Building2,
    CheckCircle,
    CheckCircle2,
    Send,
    XCircle,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';

import type { DivisionSummary } from './types';

type ApplicationsDivisionCardProps = {
    division: DivisionSummary;
    isApplied: boolean;
    onApply: () => void;
};

export default function ApplicationsDivisionCard({
    division,
    isApplied,
    onApply,
}: ApplicationsDivisionCardProps) {
    const ratio =
        division.capacity > 0
            ? Math.min((division.current_staff / division.capacity) * 100, 100)
            : 0;
    const canApply = division.is_hiring && division.available_slots > 0 && !isApplied;
    const disabled = !canApply;

    let statusLabel;
    if (isApplied) {
        statusLabel = (
            <Badge className="bg-blue-500 hover:bg-blue-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                Sudah Dilamar
            </Badge>
        );
    } else if (division.is_hiring) {
        statusLabel = (
            <Badge
                className={
                    canApply
                        ? 'bg-green-600 hover:bg-green-600'
                        : 'bg-orange-500 hover:bg-orange-500'
                }
            >
                {division.available_slots > 0 ? (
                    <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Lowongan Terbuka
                    </>
                ) : (
                    <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Slot Terpenuhi
                    </>
                )}
            </Badge>
        );
    } else {
        statusLabel = (
            <Badge variant="outline" className="border-slate-300 text-slate-500">
                <XCircle className="mr-1 h-3 w-3" />
                Tidak Ada Lowongan
            </Badge>
        );
    }

    return (
        <button
            type="button"
            onClick={onApply}
            disabled={disabled}
            className={`rounded-2xl border p-4 text-left transition ${
                disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-300'
            } border-slate-200`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-900 p-2 text-white">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-blue-900">{division.name}</p>
                        <p className="text-xs text-slate-500">
                            Manager: {division.manager_name ?? 'Belum ditentukan'}
                        </p>
                    </div>
                </div>
                {statusLabel}
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                {division.description ?? 'Belum ada deskripsi divisi.'}
            </p>
            <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Kapasitas</span>
                    <span>
                        {division.current_staff}/{division.capacity}
                    </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                    <div
                        className={`h-1.5 rounded-full ${
                            division.available_slots === 0
                                ? 'bg-red-500'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                        }`}
                        style={{ width: `${ratio}%` }}
                    />
                </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                {division.is_hiring && division.job_title ? (
                    <>
                        <p className="font-semibold text-blue-900">{division.job_title}</p>
                        <p className="text-xs text-slate-500">
                            {division.available_slots} slot tersedia
                        </p>
                        {division.job_requirements.length > 0 && (
                            <ul className="mt-3 space-y-1 text-xs text-slate-600">
                                {division.job_requirements.map((requirement, index) => (
                                    <li
                                        key={`division-${division.id}-req-${index}`}
                                        className="flex items-start gap-2"
                                    >
                                        <CheckCircle2 className="mt-0.5 h-3 w-3 text-blue-600" />
                                        <span>{requirement}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                ) : (
                    <p className="text-slate-500">Belum membuka lowongan.</p>
                )}
            </div>

            {isApplied ? (
                <p className="mt-3 text-center text-xs font-medium text-blue-600">
                    Anda sudah apply lowongan kerja ini
                </p>
            ) : canApply ? (
                <p className="mt-3 text-center text-xs text-blue-600">
                    <Send className="mr-1 inline h-3 w-3" />
                    Klik untuk melamar ke divisi ini
                </p>
            ) : null}
        </button>
    );
}
