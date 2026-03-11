import { Info } from 'lucide-react';

import {
    ApplicantRecord,
    ApplicantStatus,
} from '@/modules/SuperAdmin/KelolaRekrutmen/types';
import { Badge } from '@/shared/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/shared/components/ui/tooltip';


export const statusBadge = (status: ApplicantStatus) => {
    switch (status) {
        case 'Applied':
            return (
                <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-50">
                    Applied
                </Badge>
            );
        case 'Screening':
            return (
                <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-500 hover:bg-orange-50">
                    Screening
                </Badge>
            );
        case 'Interview':
            return (
                <Badge variant="outline" className="border-purple-500 bg-purple-50 text-purple-500 hover:bg-purple-50">
                    Interview
                </Badge>
            );
        case 'Offering':
            return (
                <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-50">
                    Offering
                </Badge>
            );
        case 'Hired':
            return (
                <Badge variant="outline" className="border-green-500 bg-green-50 text-green-500 hover:bg-green-50">
                    Hired
                </Badge>
            );
        case 'Rejected':
            return (
                <Badge variant="outline" className="border-red-500 bg-red-50 text-red-500 hover:bg-red-50">
                    Rejected
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

const isSLATrackedStatus = (status: ApplicantStatus) =>
    status === 'Applied' || status === 'Screening' || status === 'Interview' || status === 'Offering';

export const slaStageTooltipText =
    'SLA Stage menunjukkan apakah kandidat di stage ini masih sesuai target hari proses (on track), mendekati batas, atau sudah overdue.';

export const renderSlaTooltipIcon = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                    aria-label="Informasi SLA Stage"
                >
                    <Info className="h-3 w-3" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
                {slaStageTooltipText}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export const renderSlaTooltipIconDesktop = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                    aria-label="Informasi SLA Stage"
                >
                    <Info className="h-3.5 w-3.5" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
                {slaStageTooltipText}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export const slaBadge = (application: ApplicantRecord) => {
    if (!isSLATrackedStatus(application.status)) {
        return (
            <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-500">
                N/A
            </Badge>
        );
    }

    const indicator = application.sla;
    if (!indicator) {
        return (
            <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-500">
                Belum dihitung
            </Badge>
        );
    }

    if (indicator.state === 'overdue') {
        return (
            <Badge variant="outline" className="border-rose-500 bg-rose-50 text-rose-700">
                Overdue {indicator.overdue_days} hari
            </Badge>
        );
    }

    if (indicator.state === 'warning') {
        return (
            <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700">
                Sisa {indicator.remaining_days} hari
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700">
            On Track ({indicator.remaining_days} hari)
        </Badge>
    );
};

export const formatScore = (score?: number | null) => {
    if (typeof score !== 'number' || Number.isNaN(score)) return '-';
    return score.toFixed(1);
};

export const scoreBadgeClass = (score?: number | null) => {
    if (typeof score !== 'number') {
        return 'border-slate-300 bg-slate-50 text-slate-500';
    }
    if (score >= 85) {
        return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    }
    if (score >= 70) {
        return 'border-blue-500 bg-blue-50 text-blue-700';
    }
    if (score >= 55) {
        return 'border-amber-500 bg-amber-50 text-amber-700';
    }
    return 'border-rose-500 bg-rose-50 text-rose-700';
};

export const recommendationBadgeClass = (recommendation?: string | null, eligible?: boolean) => {
    if (!recommendation) return 'border-slate-300 bg-slate-50 text-slate-600';
    if (eligible === false) return 'border-rose-500 bg-rose-50 text-rose-700';
    if (recommendation === 'Prioritas Tinggi') return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    if (recommendation === 'Direkomendasikan') return 'border-blue-500 bg-blue-50 text-blue-700';
    if (recommendation === 'Pertimbangkan') return 'border-amber-500 bg-amber-50 text-amber-700';
    return 'border-slate-400 bg-slate-50 text-slate-700';
};

export const normalizeDivisionLabel = (division?: string | null) => {
    const value = (division ?? '').trim();
    return value === '' ? 'Tanpa Divisi' : value;
};

export const normalizePositionLabel = (position?: string | null) => {
    const value = (position ?? '').trim();
    return value === '' ? 'Tanpa Posisi' : value;
};

export const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'tab';

export const applicantsFilterStorageKey = 'super_admin_recruitment_applicants_filter_preferences_v1';

export const eligibilityLabelMap: Record<'eligible' | 'ineligible', string> = {
    eligible: 'Hanya Eligible',
    ineligible: 'Hanya Ineligible',
};

export const scoreBandLabelMap: Record<'excellent' | 'strong' | 'moderate' | 'low' | 'unscored', string> = {
    excellent: 'Skor 85-100',
    strong: 'Skor 70-84',
    moderate: 'Skor 55-69',
    low: 'Skor < 55',
    unscored: 'Belum Ada Skor',
};

export const sortLabelMap: Record<'oldest' | 'score_desc' | 'score_asc' | 'name_asc', string> = {
    oldest: 'Urutkan: Terlama',
    score_desc: 'Urutkan: Skor Tertinggi',
    score_asc: 'Urutkan: Skor Terendah',
    name_asc: 'Urutkan: Nama A-Z',
};
