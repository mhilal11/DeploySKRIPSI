// src/Pages/SuperAdmin/Recruitment/components/ApplicantsTab.tsx

import { format } from 'date-fns';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/shared/components/ui/card';

import {
    ApplicantActionHandler,
    ApplicantRecord,
    ApplicantRejectHandler,
    ApplicantStatus,
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
}: ApplicantsTabProps) {
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
        </>
    );
}

