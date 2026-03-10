// src/Pages/SuperAdmin/Recruitment/components/ApplicantsTab.tsx

import { format } from 'date-fns';
import { Calendar as CalendarIcon, RotateCcw, X, Filter, Search, User, Info } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/shared/components/ui/tooltip';



import {
    ApplicantRecord,
    ApplicantStatus,
    StatusSummary,
    formatApplicationId,
    ApplicantActionHandler,
    ApplicantRejectHandler,
} from '../types';
import InterviewDetailDialog from './InterviewDetailDialog';
import RejectionModal from './RejectionModal';

interface ApplicantsTabProps {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    dateRange: { from: Date | null; to: Date | null };
    onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    statusOrder: ApplicantStatus[];
    statusSummary: StatusSummary;
    visibleApplications: ApplicantRecord[];
    onStatusUpdate: ApplicantActionHandler;
    onReject: ApplicantRejectHandler;
    isUpdatingStatus: boolean;
    updatingApplicantId: number | null;
    onScheduleInterview: (application: ApplicantRecord) => void;
    onViewProfile?: (application: ApplicantRecord) => void;
}

const statusBadge = (status: ApplicantStatus) => {
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

const slaStageTooltipText =
    'SLA Stage menunjukkan apakah kandidat di stage ini masih sesuai target hari proses (on track), mendekati batas, atau sudah overdue.';

const slaBadge = (application: ApplicantRecord) => {
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

const formatScore = (score?: number | null) => {
    if (typeof score !== 'number' || Number.isNaN(score)) return '-';
    return score.toFixed(1);
};

const scoreBadgeClass = (score?: number | null) => {
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

const recommendationBadgeClass = (recommendation?: string | null, eligible?: boolean) => {
    if (!recommendation) return 'border-slate-300 bg-slate-50 text-slate-600';
    if (eligible === false) return 'border-rose-500 bg-rose-50 text-rose-700';
    if (recommendation === 'Prioritas Tinggi') return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    if (recommendation === 'Direkomendasikan') return 'border-blue-500 bg-blue-50 text-blue-700';
    if (recommendation === 'Pertimbangkan') return 'border-amber-500 bg-amber-50 text-amber-700';
    return 'border-slate-400 bg-slate-50 text-slate-700'; 
};

const normalizeDivisionLabel = (division?: string | null) => {
    const value = (division ?? '').trim();
    return value === '' ? 'Tanpa Divisi' : value;
};

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'tab';

const normalizePositionLabel = (position?: string | null) => {
    const value = (position ?? '').trim();
    return value === '' ? 'Tanpa Posisi' : value;
};

const applicantsFilterStorageKey = 'super_admin_recruitment_applicants_filter_preferences_v1';

const eligibilityLabelMap: Record<'eligible' | 'ineligible', string> = {
    eligible: 'Hanya Eligible',
    ineligible: 'Hanya Ineligible',
};

const scoreBandLabelMap: Record<'excellent' | 'strong' | 'moderate' | 'low' | 'unscored', string> = {
    excellent: 'Skor 85-100',
    strong: 'Skor 70-84',
    moderate: 'Skor 55-69',
    low: 'Skor < 55',
    unscored: 'Belum Ada Skor',
};

const sortLabelMap: Record<'oldest' | 'score_desc' | 'score_asc' | 'name_asc', string> = {
    oldest: 'Urutkan: Terlama',
    score_desc: 'Urutkan: Skor Tertinggi',
    score_asc: 'Urutkan: Skor Terendah',
    name_asc: 'Urutkan: Nama A-Z',
};

export default function ApplicantsTab({
    searchTerm,
    onSearchTermChange,
    statusFilter,
    onStatusFilterChange,
    dateRange,
    onDateRangeChange,
    statusOrder,
    statusSummary,
    visibleApplications,
    onStatusUpdate,
    onReject,
    isUpdatingStatus,
    updatingApplicantId,
    onScheduleInterview,
    onViewProfile,
}: ApplicantsTabProps) {
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [rejectingApplicant, setRejectingApplicant] = useState<ApplicantRecord | null>(null);
    const [viewingInterview, setViewingInterview] = useState<ApplicantRecord | null>(null);
    const [divisionFilter, setDivisionFilter] = useState('all');
    const [positionFilter, setPositionFilter] = useState('all');
    const [recommendationFilter, setRecommendationFilter] = useState('all');
    const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');
    const [scoreBandFilter, setScoreBandFilter] = useState<'all' | 'excellent' | 'strong' | 'moderate' | 'low' | 'unscored'>('all');
    const [sortFilter, setSortFilter] = useState<'newest' | 'oldest' | 'score_desc' | 'score_asc' | 'name_asc'>('newest');
    const [isPreferenceHydrated, setIsPreferenceHydrated] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const divisionTabs = useMemo(() => {
        const counts = new Map<string, number>();
        for (const application of visibleApplications) {
            const label = normalizeDivisionLabel(application.division);
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }

        const tabs = Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([label, count]) => ({
                label,
                count,
                value: `division-${slugify(label)}`,
            }));

        return [{ label: 'Semua', count: visibleApplications.length, value: 'all' }, ...tabs];
    }, [visibleApplications]);

    const isDivisionFilterAvailable = useMemo(
        () => divisionTabs.some((tab) => tab.value === divisionFilter),
        [divisionFilter, divisionTabs],
    );
    const effectiveDivisionFilter = isDivisionFilterAvailable ? divisionFilter : 'all';
    const selectedDivision = useMemo(
        () => divisionTabs.find((tab) => tab.value === effectiveDivisionFilter)?.label ?? null,
        [effectiveDivisionFilter, divisionTabs],
    );

    const positionTabs = useMemo(() => {
        const source =
            selectedDivision && selectedDivision !== 'Semua'
                ? visibleApplications.filter(
                    (application) =>
                        normalizeDivisionLabel(application.division) === selectedDivision,
                )
                : visibleApplications;

        const counts = new Map<string, number>();
        for (const application of source) {
            const label = normalizePositionLabel(application.position);
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }

        const tabs = Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([label, count]) => ({
                label,
                count,
                value: `position-${slugify(label)}`,
            }));

        return [{ label: 'Semua Posisi', count: source.length, value: 'all' }, ...tabs];
    }, [selectedDivision, visibleApplications]);

    const isPositionFilterAvailable = useMemo(
        () => positionTabs.some((tab) => tab.value === positionFilter),
        [positionFilter, positionTabs],
    );
    const effectivePositionFilter = isPositionFilterAvailable ? positionFilter : 'all';
    const selectedPosition = useMemo(
        () => positionTabs.find((tab) => tab.value === effectivePositionFilter)?.label ?? null,
        [effectivePositionFilter, positionTabs],
    );

    const recommendationOptions = useMemo(() => {
        const values = new Set<string>();
        for (const application of visibleApplications) {
            const recommendation = application.recruitment_score?.recommendation?.trim();
            if (recommendation) {
                values.add(recommendation);
            }
        }
        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }, [visibleApplications]);

    const filteredApplications = useMemo(() => {
        const filtered = visibleApplications.filter((application) => {
            const recommendation = application.recruitment_score?.recommendation ?? '';
            const isEligible = application.recruitment_score?.eligible === true;
            const score = application.recruitment_score?.total;

            if (selectedDivision && selectedDivision !== 'Semua') {
                const divisionLabel = normalizeDivisionLabel(application.division);
                if (divisionLabel !== selectedDivision) {
                    return false;
                }
            }
            if (selectedPosition && selectedPosition !== 'Semua Posisi') {
                const positionLabel = normalizePositionLabel(application.position);
                if (positionLabel !== selectedPosition) {
                    return false;
                }
            }

            if (recommendationFilter !== 'all' && recommendation !== recommendationFilter) {
                return false;
            }

            if (eligibilityFilter === 'eligible' && !isEligible) {
                return false;
            }
            if (eligibilityFilter === 'ineligible' && isEligible) {
                return false;
            }

            if (scoreBandFilter !== 'all') {
                if (typeof score !== 'number' || Number.isNaN(score)) {
                    return scoreBandFilter === 'unscored';
                }
                if (scoreBandFilter === 'excellent' && score < 85) return false;
                if (scoreBandFilter === 'strong' && (score < 70 || score >= 85)) return false;
                if (scoreBandFilter === 'moderate' && (score < 55 || score >= 70)) return false;
                if (scoreBandFilter === 'low' && score >= 55) return false;
                if (scoreBandFilter === 'unscored') return false;
            }

            return true;
        });

        const sorted = [...filtered];
        sorted.sort((left, right) => {
            const leftScore = left.recruitment_score?.total ?? -1;
            const rightScore = right.recruitment_score?.total ?? -1;
            const leftDate = new Date(left.submitted_date ?? '').getTime();
            const rightDate = new Date(right.submitted_date ?? '').getTime();

            switch (sortFilter) {
                case 'oldest':
                    return (leftDate || 0) - (rightDate || 0);
                case 'score_desc':
                    return rightScore - leftScore;
                case 'score_asc':
                    return leftScore - rightScore;
                case 'name_asc':
                    return left.name.localeCompare(right.name);
                case 'newest':
                default:
                    return (rightDate || 0) - (leftDate || 0);
            }
        });
        return sorted;
    }, [
        visibleApplications,
        selectedDivision,
        selectedPosition,
        recommendationFilter,
        eligibilityFilter,
        scoreBandFilter,
        sortFilter,
    ]);

    const insights = useMemo(() => {
        const total = filteredApplications.length;
        const scored = filteredApplications.filter((item) => typeof item.recruitment_score?.total === 'number');
        const eligible = filteredApplications.filter((item) => item.recruitment_score?.eligible).length;
        const avgScore =
            scored.length > 0
                ? scored.reduce((sum, item) => sum + (item.recruitment_score?.total ?? 0), 0) / scored.length
                : 0;
        return { total, eligible, avgScore };
    }, [filteredApplications]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let stored: Record<string, string> = {};
        try {
            const raw = window.localStorage.getItem(applicantsFilterStorageKey);
            if (raw) {
                stored = JSON.parse(raw) as Record<string, string>;
            }
        } catch {
            stored = {};
        }

        const params = new URLSearchParams(window.location.search);
        const nextDivision = params.get('div') || stored.division || 'all';
        const nextPosition = params.get('pos') || stored.position || 'all';
        const nextEligibility = params.get('elig') || stored.eligibility || 'all';
        const nextRecommendation = params.get('rec') || stored.recommendation || 'all';
        const nextScoreBand = params.get('score_band') || stored.scoreBand || 'all';
        const nextSort = params.get('sort') || stored.sort || 'newest';

        setDivisionFilter(nextDivision);
        setPositionFilter(nextPosition);
        setEligibilityFilter(
            nextEligibility === 'eligible' || nextEligibility === 'ineligible'
                ? nextEligibility
                : 'all',
        );
        setRecommendationFilter(nextRecommendation);
        setScoreBandFilter(
            nextScoreBand === 'excellent' ||
                nextScoreBand === 'strong' ||
                nextScoreBand === 'moderate' ||
                nextScoreBand === 'low' ||
                nextScoreBand === 'unscored'
                ? nextScoreBand
                : 'all',
        );
        setSortFilter(
            nextSort === 'oldest' ||
                nextSort === 'score_desc' ||
                nextSort === 'score_asc' ||
                nextSort === 'name_asc'
                ? nextSort
                : 'newest',
        );
        setIsPreferenceHydrated(true);
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, dateRange, divisionFilter, positionFilter, recommendationFilter, eligibilityFilter, scoreBandFilter, sortFilter]);

    useEffect(() => {
        if (recommendationFilter === 'all') return;
        if (!recommendationOptions.includes(recommendationFilter)) {
            setRecommendationFilter('all');
        }
    }, [recommendationFilter, recommendationOptions]);

    useEffect(() => {
        if (!isPreferenceHydrated || typeof window === 'undefined') {
            return;
        }

        // Persist filter preference without mutating URL to avoid page remount/ping-pong on rapid tab switch.
        const payload = {
            division: effectiveDivisionFilter,
            position: effectivePositionFilter,
            eligibility: eligibilityFilter,
            recommendation: recommendationFilter,
            scoreBand: scoreBandFilter,
            sort: sortFilter,
        };
        window.localStorage.setItem(applicantsFilterStorageKey, JSON.stringify(payload));
    }, [
        effectiveDivisionFilter,
        effectivePositionFilter,
        eligibilityFilter,
        recommendationFilter,
        scoreBandFilter,
        sortFilter,
        isPreferenceHydrated,
    ]);

    // Calculate pagination
    const rawTotalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
    const totalPages = Math.max(1, rawTotalPages);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedApplications = filteredApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const displayDateRange = useMemo(() => {
        const { from, to } = dateRange;
        const formatDate = (date: Date) => format(date, 'd MMM yyyy');
        if (from && to) return `${formatDate(from)} - ${formatDate(to)}`;
        if (from) return `${formatDate(from)} - Pilih akhir`;
        return 'Pilih rentang tanggal';
    }, [dateRange]);

    const activeFilterChips = useMemo(() => {
        const chips: Array<{ key: string; label: string }> = [];

        if (selectedDivision && selectedDivision !== 'Semua') {
            chips.push({ key: 'division', label: `Divisi: ${selectedDivision}` });
        }
        if (selectedPosition && selectedPosition !== 'Semua Posisi') {
            chips.push({ key: 'position', label: `Posisi: ${selectedPosition}` });
        }
        if (statusFilter !== 'all') {
            chips.push({ key: 'status', label: `Status: ${statusFilter}` });
        }
        if (eligibilityFilter !== 'all') {
            chips.push({ key: 'eligibility', label: eligibilityLabelMap[eligibilityFilter] });
        }
        if (recommendationFilter !== 'all') {
            chips.push({ key: 'recommendation', label: `Rekomendasi: ${recommendationFilter}` });
        }
        if (scoreBandFilter !== 'all') {
            chips.push({ key: 'scoreBand', label: scoreBandLabelMap[scoreBandFilter] });
        }
        if (sortFilter !== 'newest') {
            chips.push({ key: 'sort', label: sortLabelMap[sortFilter] });
        }

        const normalizedSearch = searchTerm.trim();
        if (normalizedSearch !== '') {
            chips.push({ key: 'search', label: `Cari: "${normalizedSearch}"` });
        }
        if (dateRange.from || dateRange.to) {
            chips.push({ key: 'date', label: `Tanggal: ${displayDateRange}` });
        }

        return chips;
    }, [
        selectedDivision,
        selectedPosition,
        statusFilter,
        eligibilityFilter,
        recommendationFilter,
        scoreBandFilter,
        sortFilter,
        searchTerm,
        dateRange.from,
        dateRange.to,
        displayDateRange,
    ]);

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        onSearchTermChange(event.target.value);
    };

    const handleDivisionFilterChange = (nextValue: string) => {
        setDivisionFilter(nextValue);
        setPositionFilter('all');
    };

    const handlePositionFilterChange = (nextValue: string) => {
        setPositionFilter(nextValue);
    };

    const handleHire = (application: ApplicantRecord) => {
        const confirmed = window.confirm(
            `Konfirmasi penerimaan (Hired) untuk ${application.name}?`
        );
        if (confirmed) {
            onStatusUpdate(application.id, 'Hired');
        }
    };

    const handleReject = (application: ApplicantRecord) => {
        setRejectingApplicant(application);
        setIsRejectionModalOpen(true);
    };

    const handleConfirmReject = (reason: string) => {
        if (rejectingApplicant) {
            onReject(rejectingApplicant.id, reason);
        }
    };

    const handleResetAllFilters = () => {
        onStatusFilterChange('all');
        onSearchTermChange('');
        onDateRangeChange({ from: null, to: null });

        setDivisionFilter('all');
        setPositionFilter('all');
        setRecommendationFilter('all');
        setEligibilityFilter('all');
        setScoreBandFilter('all');
        setSortFilter('newest');
        setCurrentPage(1);
        toast.success('Filter berhasil direset.');
    };

    const handleClearFilterChip = (key: string) => {
        switch (key) {
            case 'division':
                setDivisionFilter('all');
                setPositionFilter('all');
                return;
            case 'position':
                setPositionFilter('all');
                return;
            case 'status':
                onStatusFilterChange('all');
                return;
            case 'eligibility':
                setEligibilityFilter('all');
                return;
            case 'recommendation':
                setRecommendationFilter('all');
                return;
            case 'scoreBand':
                setScoreBandFilter('all');
                return;
            case 'sort':
                setSortFilter('newest');
                return;
            case 'search':
                onSearchTermChange('');
                return;
            case 'date':
                onDateRangeChange({ from: null, to: null });
                return;
            default:
                return;
        }
    };

    return (
        <>
            <Card className="space-y-4 p-4 md:p-5">
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                        <p className="text-[11px] text-slate-500">Total Hasil Filter</p>
                        <p className="text-base font-semibold text-slate-900">{insights.total} pelamar</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                        <p className="text-[11px] text-slate-500">Eligible</p>
                        <p className="text-base font-semibold text-emerald-700">{insights.eligible} kandidat</p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                        <p className="text-[11px] text-slate-500">Rata-rata Skor</p>
                        <p className="text-base font-semibold text-blue-700">{insights.avgScore.toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                        <p className="text-[11px] text-slate-500">Hired</p>
                        <p className="text-base font-semibold text-indigo-700">{statusSummary.Hired ?? 0} kandidat</p>
                    </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                        <p className="text-xs font-semibold text-slate-700">Filter Divisi</p>
                        <p className="text-[11px] text-slate-500">Pilih divisi untuk mempersempit daftar kandidat.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <Tabs value={effectiveDivisionFilter} onValueChange={handleDivisionFilterChange} className="w-max">
                            <TabsList className="h-auto min-h-10 w-max rounded-lg bg-slate-100 p-1">
                                {divisionTabs.map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="flex-none rounded-md px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                                    >
                                        {tab.label} ({tab.count})
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                        <p className="text-xs font-semibold text-slate-700">Filter Posisi Lowongan</p>
                        <p className="text-[11px] text-slate-500">Daftar posisi mengikuti divisi yang aktif.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <Tabs value={effectivePositionFilter} onValueChange={handlePositionFilterChange} className="w-max">
                            <TabsList className="h-auto min-h-9 w-max rounded-lg border border-slate-200 bg-slate-50 p-1">
                                {positionTabs.map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="flex-none rounded-md px-3 py-1 text-[11px] text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                                    >
                                        {tab.label} ({tab.count})
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                <div className="md:sticky md:top-3 md:z-20">
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3 md:shadow-sm">
                        <div className="grid gap-2 lg:grid-cols-12">
                        <div className="relative w-full lg:col-span-5">
                            <Search className="absolute left-2.5 md:left-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Cari pelamar, divisi, posisi, email..."
                                className="h-9 pl-8 text-xs md:h-10 md:pl-9 md:text-sm bg-white"
                            />
                        </div>
                        <div className="flex items-center gap-2 lg:col-span-2">
                            <Filter className="h-3.5 w-3.5 shrink-0 text-slate-500 md:h-4 md:w-4" />
                            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                                <SelectTrigger className="h-9 w-full bg-white text-xs md:h-10 md:text-sm">
                                    <SelectValue placeholder="Semua status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    {statusOrder.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="lg:col-span-2">
                            <Select value={eligibilityFilter} onValueChange={(value) => setEligibilityFilter(value as 'all' | 'eligible' | 'ineligible')}>
                                <SelectTrigger className="h-9 w-full bg-white text-xs md:h-10 md:text-sm">
                                    <SelectValue placeholder="Filter eligibility" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Eligibility</SelectItem>
                                    <SelectItem value="eligible">Hanya Eligible</SelectItem>
                                    <SelectItem value="ineligible">Hanya Ineligible</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="lg:col-span-3">
                            <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
                                <SelectTrigger className="h-9 w-full bg-white text-xs md:h-10 md:text-sm">
                                    <SelectValue placeholder="Filter rekomendasi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Rekomendasi</SelectItem>
                                    {recommendationOptions.map((item) => (
                                        <SelectItem key={item} value={item}>
                                            {item}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        </div>

                        <div className="grid gap-2 lg:grid-cols-12">
                        <div className="lg:col-span-3">
                            <Select value={scoreBandFilter} onValueChange={(value) => setScoreBandFilter(value as 'all' | 'excellent' | 'strong' | 'moderate' | 'low' | 'unscored')}>
                                <SelectTrigger className="h-9 w-full bg-white text-xs md:h-10 md:text-sm">
                                    <SelectValue placeholder="Filter skor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Skor</SelectItem>
                                    <SelectItem value="excellent">Skor 85 - 100</SelectItem>
                                    <SelectItem value="strong">Skor 70 - 84</SelectItem>
                                    <SelectItem value="moderate">Skor 55 - 69</SelectItem>
                                    <SelectItem value="low">Skor &lt; 55</SelectItem>
                                    <SelectItem value="unscored">Belum Ada Skor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="lg:col-span-3">
                            <Select value={sortFilter} onValueChange={(value) => setSortFilter(value as 'newest' | 'oldest' | 'score_desc' | 'score_asc' | 'name_asc')}>
                                <SelectTrigger className="h-9 w-full bg-white text-xs md:h-10 md:text-sm">
                                    <SelectValue placeholder="Urutkan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Terbaru</SelectItem>
                                    <SelectItem value="oldest">Terlama</SelectItem>
                                    <SelectItem value="score_desc">Skor Tertinggi</SelectItem>
                                    <SelectItem value="score_asc">Skor Terendah</SelectItem>
                                    <SelectItem value="name_asc">Nama A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="lg:col-span-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-9 w-full justify-start gap-1 md:gap-2 md:h-10 text-xs md:text-sm bg-white"
                                    >
                                        <CalendarIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        <span className="truncate">{displayDateRange}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2 max-h-[80vh] overflow-auto" align="start">
                                    <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-slate-600">Mulai</p>
                                            <Calendar
                                                mode="single"
                                                selected={dateRange.from ?? undefined}
                                                onSelect={(date) => {
                                                    onDateRangeChange({
                                                        from: date ?? null,
                                                        to: dateRange.to,
                                                    });
                                                }}
                                                disabled={(date) =>
                                                    dateRange.to ? date > dateRange.to : false
                                                }
                                                className="text-[9px] md:text-[10px] [&_.rdp-caption]:text-[9px] [&_.rdp-caption]:md:text-[10px] [&_.rdp-cell]:w-4 [&_.rdp-cell]:h-4 [&_.rdp-cell]:md:w-5 [&_.rdp-cell]:md:h-5 [&_.rdp-head_cell]:w-4 [&_.rdp-head_cell]:md:w-5 [&_.rdp-button]:h-4 [&_.rdp-button]:w-4 [&_.rdp-button]:md:h-5 [&_.rdp-button]:md:w-5 [&_.rdp-nav_button]:h-4 [&_.rdp-nav_button]:w-4"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-slate-600">Selesai</p>
                                            <Calendar
                                                mode="single"
                                                selected={dateRange.to ?? undefined}
                                                onSelect={(date) => {
                                                    onDateRangeChange({
                                                        from: dateRange.from,
                                                        to: date ?? null,
                                                    });
                                                }}
                                                disabled={(date) =>
                                                    dateRange.from ? date < dateRange.from : false
                                                }
                                                className="text-[9px] md:text-[10px] [&_.rdp-caption]:text-[9px] [&_.rdp-caption]:md:text-[10px] [&_.rdp-cell]:w-4 [&_.rdp-cell]:h-4 [&_.rdp-cell]:md:w-5 [&_.rdp-cell]:md:h-5 [&_.rdp-head_cell]:w-4 [&_.rdp-head_cell]:md:w-5 [&_.rdp-button]:h-4 [&_.rdp-button]:w-4 [&_.rdp-button]:md:h-5 [&_.rdp-button]:md:w-5 [&_.rdp-nav_button]:h-4 [&_.rdp-nav_button]:w-4"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-end border-t pt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1 h-6 text-[10px]"
                                            onClick={() => onDateRangeChange({ from: null, to: null })}
                                        >
                                            <X className="h-3 w-3" /> Reset
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="lg:col-span-3">
                            <Button
                                variant="outline"
                                className="h-9 w-full text-xs md:h-10 md:text-sm bg-white"
                                onClick={handleResetAllFilters}
                            >
                                <RotateCcw className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                                Reset Semua Filter
                            </Button>
                        </div>

                        {activeFilterChips.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2">
                                <p className="text-[11px] font-medium text-slate-500">Filter aktif:</p>
                                {activeFilterChips.map((chip) => (
                                    <Badge
                                        key={chip.key}
                                        variant="outline"
                                        className="rounded-full border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                                    >
                                        <span>{chip.label}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleClearFilterChip(chip.key)}
                                            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                            aria-label={`Hapus filter ${chip.label}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetAllFilters}
                                    className="h-6 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                                >
                                    Reset semua
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                    {paginatedApplications.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-500">Tidak ada data pelamar.</p>
                    ) : (
                        paginatedApplications.map((application) => {
                            const isCurrentlyUpdating = isUpdatingStatus && updatingApplicantId === application.id;
                            const recruitmentScore = application.recruitment_score;
                            const totalScore = recruitmentScore?.total;
                            const rankingLabel =
                                recruitmentScore?.rank && recruitmentScore?.total_candidates
                                    ? `${recruitmentScore.rank}/${recruitmentScore.total_candidates}`
                                    : '-';
                            const recommendation = recruitmentScore?.recommendation;
                            return (
                                <div key={application.id} className="rounded-lg border p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-xs text-slate-900 truncate">{application.name}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{application.email}</p>
                                        </div>
                                        {statusBadge(application.status)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                        <div>
                                            <p className="text-[10px] text-slate-400">ID Lamaran</p>
                                            <p className="text-[11px] text-blue-900 font-semibold">{formatApplicationId(application.id)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400">Divisi</p>
                                            <p className="text-[11px] text-slate-700 truncate">
                                                {normalizeDivisionLabel(application.division)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400">Posisi</p>
                                            <p className="text-[11px] text-slate-700 truncate">{application.position}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400">Skor</p>
                                            <Badge variant="outline" className={`text-[10px] ${scoreBadgeClass(totalScore)}`}>
                                                {formatScore(totalScore)}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400">Peringkat</p>
                                            <p className="text-[11px] font-semibold text-slate-700">{rankingLabel}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] text-slate-400">Rekomendasi</p>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] ${recommendationBadgeClass(recommendation, recruitmentScore?.eligible)}`}
                                            >
                                                {recommendation ?? '-'}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex items-center gap-1">
                                                <p className="text-[10px] text-slate-400">SLA Stage</p>
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
                                            </div>
                                            {slaBadge(application)}
                                        </div>
                                    </div>
                                    {onViewProfile && (
                                        <div className="pt-1.5 border-t border-slate-100">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onViewProfile(application)}
                                                disabled={isCurrentlyUpdating}
                                                className="h-7 text-xs px-2 w-full justify-center"
                                            >
                                                <User className="h-3 w-3 mr-1 text-blue-600" />
                                                Lihat Profil
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>ID Lamaran</TableHead>
                                <TableHead>Pelamar</TableHead>
                                <TableHead>Divisi</TableHead>
                                <TableHead>Posisi</TableHead>
                                <TableHead>Skor</TableHead>
                                <TableHead>Peringkat</TableHead>
                                <TableHead>Rekomendasi</TableHead>
                                <TableHead className="w-[170px]">
                                    <div className="flex items-center gap-1">
                                        <span>SLA Stage</span>
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
                                    </div>
                                </TableHead>
                                <TableHead className="w-[90px]">Status</TableHead>
                                <TableHead className="text-right w-[210px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {paginatedApplications.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11} className="py-8 text-center text-sm text-slate-500">
                                        Tidak ada data pelamar untuk kombinasi filter saat ini.
                                    </TableCell>
                                </TableRow>
                            )}
                            {paginatedApplications.map((application, index) => {
                                const isCurrentlyUpdating =
                                    isUpdatingStatus && updatingApplicantId === application.id;
                                const recruitmentScore = application.recruitment_score;
                                const totalScore = recruitmentScore?.total;
                                const rankingLabel =
                                    recruitmentScore?.rank && recruitmentScore?.total_candidates
                                        ? `${recruitmentScore.rank}/${recruitmentScore.total_candidates}`
                                        : '-';
                                const recommendation = recruitmentScore?.recommendation;

                                return (
                                    <TableRow key={application.id}>
                                        <TableCell className="font-medium text-slate-900">
                                            {startIndex + index + 1}
                                        </TableCell>
                                        <TableCell className="font-semibold text-blue-900">
                                            {formatApplicationId(application.id)}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-slate-900">
                                                {application.name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {application.email}
                                            </p>
                                        </TableCell>
                                        <TableCell>{normalizeDivisionLabel(application.division)}</TableCell>
                                        <TableCell>{application.position}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={scoreBadgeClass(totalScore)}>
                                                {formatScore(totalScore)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-700">
                                            {rankingLabel}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={recommendationBadgeClass(recommendation, recruitmentScore?.eligible)}
                                            >
                                                {recommendation ?? '-'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{slaBadge(application)}</TableCell>
                                        <TableCell>{statusBadge(application.status)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                {onViewProfile && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => onViewProfile(application)}
                                                                    disabled={isCurrentlyUpdating}
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                >
                                                                    <User className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Lihat Profil Lengkap</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {rawTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                            Menampilkan {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredApplications.length)} dari {filteredApplications.length} pelamar
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 px-3"
                            >
                                Sebelumnya
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className="h-8 w-8 p-0"
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 px-3"
                            >
                                Selanjutnya
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <RejectionModal
                isOpen={isRejectionModalOpen}
                onClose={() => {
                    setIsRejectionModalOpen(false);
                    setRejectingApplicant(null);
                }}
                onConfirm={handleConfirmReject}
                applicant={rejectingApplicant}
                isSubmitting={isUpdatingStatus}
            />

            <InterviewDetailDialog
                applicant={viewingInterview}
                onClose={() => setViewingInterview(null)}
            />
        </>
    );
}



