// src/Pages/SuperAdmin/Recruitment/components/ApplicantsTab.tsx

import { format } from 'date-fns';
import {
    AlertTriangle,
    Clock3,
    Download,
    FileSpreadsheet,
    FileText,
    Save,
    Settings2,
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';

import {
    ApplicantActionHandler,
    ApplicantRecord,
    ApplicantRejectHandler,
    ApplicantStatus,
    RecruitmentSLAOverview,
    RecruitmentSLAReminder,
    RecruitmentSLASettings,
    StatusSummary,
} from '../types';
import { ApplicantsFiltersPanel } from './applicants-tab/ApplicantsFiltersPanel';
import { ApplicantsResultsSection } from './applicants-tab/ApplicantsResultsSection';
import {
    applicantsFilterStorageKey,
    eligibilityLabelMap,
    normalizeDivisionLabel,
    normalizePositionLabel,
    scoreBandLabelMap,
    slugify,
    sortLabelMap,
} from './applicants-tab/utils';

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
    slaOverviewState: RecruitmentSLAOverview;
    slaSettingsForm: RecruitmentSLASettings;
    slaReminderRows: RecruitmentSLAReminder[];
    onSLASettingChange: (stage: keyof RecruitmentSLASettings, value: string) => void;
    onSaveSLASettings: () => void;
    isSavingSLA: boolean;
    onExportScoreReport: () => void;
    onExportScoreReportPDF: () => void;
}

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
    slaOverviewState,
    slaSettingsForm,
    slaReminderRows,
    onSLASettingChange,
    onSaveSLASettings,
    isSavingSLA,
    onExportScoreReport,
    onExportScoreReportPDF,
}: ApplicantsTabProps) {
    const [divisionFilter, setDivisionFilter] = useState('all');
    const [positionFilter, setPositionFilter] = useState('all');
    const [recommendationFilter, setRecommendationFilter] = useState('all');
    const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');
    const [scoreBandFilter, setScoreBandFilter] = useState<'all' | 'excellent' | 'strong' | 'moderate' | 'low' | 'unscored'>('all');
    const [sortFilter, setSortFilter] = useState<'newest' | 'oldest' | 'score_desc' | 'score_asc' | 'name_asc'>('newest');
    const [isPreferenceHydrated, setIsPreferenceHydrated] = useState(false);
    const [isSLAModalOpen, setIsSLAModalOpen] = useState(false);

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
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">Daftar Pelamar</p>
                        <p className="text-xs leading-relaxed text-slate-600">
                            Kelola pelamar aktif, filter kandidat, atur SLA, dan export data skor dari satu card.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={() => setIsSLAModalOpen(true)}
                            className="justify-start border-slate-300 bg-white"
                        >
                            <Settings2 className="mr-2 h-4 w-4" />
                            Pengaturan SLA
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="justify-start border-slate-300 bg-white">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Skor Pelamar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white">
                                <DropdownMenuItem onClick={onExportScoreReport}>
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Export Excel (.csv)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onExportScoreReportPDF}>
                                    <FileText className="h-4 w-4" />
                                    Export PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <ApplicantsFiltersPanel
                    insights={insights}
                    statusSummary={statusSummary}
                    effectiveDivisionFilter={effectiveDivisionFilter}
                    divisionTabs={divisionTabs}
                    handleDivisionFilterChange={handleDivisionFilterChange}
                    effectivePositionFilter={effectivePositionFilter}
                    positionTabs={positionTabs}
                    handlePositionFilterChange={handlePositionFilterChange}
                    searchTerm={searchTerm}
                    handleSearchChange={handleSearchChange}
                    statusFilter={statusFilter}
                    onStatusFilterChange={onStatusFilterChange}
                    statusOrder={statusOrder}
                    eligibilityFilter={eligibilityFilter}
                    setEligibilityFilter={setEligibilityFilter}
                    recommendationFilter={recommendationFilter}
                    setRecommendationFilter={setRecommendationFilter}
                    recommendationOptions={recommendationOptions}
                    scoreBandFilter={scoreBandFilter}
                    setScoreBandFilter={setScoreBandFilter}
                    sortFilter={sortFilter}
                    setSortFilter={setSortFilter}
                    dateRange={dateRange}
                    onDateRangeChange={onDateRangeChange}
                    displayDateRange={displayDateRange}
                    handleResetAllFilters={handleResetAllFilters}
                    activeFilterChips={activeFilterChips}
                    handleClearFilterChip={handleClearFilterChip}
                />

                <ApplicantsResultsSection
                    paginatedApplications={paginatedApplications}
                    isUpdatingStatus={isUpdatingStatus}
                    updatingApplicantId={updatingApplicantId}
                    onViewProfile={onViewProfile}
                    rawTotalPages={rawTotalPages}
                    startIndex={startIndex}
                    itemsPerPage={ITEMS_PER_PAGE}
                    filteredApplicationsLength={filteredApplications.length}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />
            </Card>

            <Dialog open={isSLAModalOpen} onOpenChange={setIsSLAModalOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-4xl">
                    <DialogHeader className="border-b border-slate-100 px-5 py-4 sm:px-6">
                        <DialogTitle>SLA Tracker & Reminder</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Atur target durasi tiap stage dan pantau kandidat yang mendekati atau melewati SLA.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[11px] text-slate-500">Aktif</p>
                                <p className="text-lg font-semibold text-slate-900">
                                    {slaOverviewState.active_applications}
                                </p>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                <p className="text-[11px] text-emerald-700">On Track</p>
                                <p className="text-lg font-semibold text-emerald-700">
                                    {slaOverviewState.on_track_count}
                                </p>
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <p className="text-[11px] text-amber-700">Mendekati SLA</p>
                                <p className="text-lg font-semibold text-amber-700">
                                    {slaOverviewState.warning_count}
                                </p>
                            </div>
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                                <p className="text-[11px] text-rose-700">Overdue</p>
                                <p className="text-lg font-semibold text-rose-700">
                                    {slaOverviewState.overdue_count}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600">
                            Compliance rate:{' '}
                            <span className="font-semibold text-slate-900">
                                {Number(slaOverviewState.compliance_rate || 0).toFixed(1)}%
                            </span>
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500">Applied (hari)</p>
                                <Input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={slaSettingsForm.Applied}
                                    onChange={(event) => onSLASettingChange('Applied', event.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500">Screening (hari)</p>
                                <Input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={slaSettingsForm.Screening}
                                    onChange={(event) => onSLASettingChange('Screening', event.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500">Interview (hari)</p>
                                <Input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={slaSettingsForm.Interview}
                                    onChange={(event) => onSLASettingChange('Interview', event.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500">Offering (hari)</p>
                                <Input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={slaSettingsForm.Offering}
                                    onChange={(event) => onSLASettingChange('Offering', event.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={onSaveSLASettings}
                            disabled={isSavingSLA}
                            className="justify-start border-slate-300"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingSLA ? 'Menyimpan SLA...' : 'Simpan Konfigurasi SLA'}
                        </Button>

                        <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-700">Reminder Prioritas</p>
                            {slaReminderRows.length === 0 ? (
                                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                    Tidak ada kandidat yang overdue atau mendekati SLA.
                                </p>
                            ) : (
                                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                                    {slaReminderRows.map((item) => (
                                        <div
                                            key={item.application_id}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold text-slate-900">
                                                        {item.name}
                                                    </p>
                                                    <p className="truncate text-[11px] text-slate-500">
                                                        {item.position} - {item.stage}
                                                    </p>
                                                </div>
                                                {item.state === 'overdue' ? (
                                                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                                                        <AlertTriangle className="mr-1 h-3 w-3" />
                                                        Overdue {item.overdue_days} hari
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                        <Clock3 className="mr-1 h-3 w-3" />
                                                        Sisa {item.remaining_days} hari
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

