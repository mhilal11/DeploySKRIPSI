import { Calendar as CalendarIcon, Filter, RotateCcw, Search, X } from 'lucide-react';

import type { ApplicantStatus, StatusSummary } from '@/modules/SuperAdmin/KelolaRekrutmen/types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
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
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

import type { ChangeEvent } from 'react';

type EligibilityFilter = 'all' | 'eligible' | 'ineligible';
type ScoreBandFilter = 'all' | 'excellent' | 'strong' | 'moderate' | 'low' | 'unscored';
type SortFilter = 'newest' | 'oldest' | 'score_desc' | 'score_asc' | 'name_asc';

type FilterTab = {
    value: string;
    label: string;
    count: number;
};

type FilterChip = {
    key: string;
    label: string;
};

type ApplicantsFiltersPanelProps = {
    insights: {
        total: number;
        eligible: number;
        avgScore: number;
    };
    statusSummary: StatusSummary;
    effectiveDivisionFilter: string;
    divisionTabs: FilterTab[];
    handleDivisionFilterChange: (nextValue: string) => void;
    effectivePositionFilter: string;
    positionTabs: FilterTab[];
    handlePositionFilterChange: (nextValue: string) => void;
    searchTerm: string;
    handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    statusOrder: ApplicantStatus[];
    eligibilityFilter: EligibilityFilter;
    setEligibilityFilter: (value: EligibilityFilter) => void;
    recommendationFilter: string;
    setRecommendationFilter: (value: string) => void;
    recommendationOptions: string[];
    scoreBandFilter: ScoreBandFilter;
    setScoreBandFilter: (value: ScoreBandFilter) => void;
    sortFilter: SortFilter;
    setSortFilter: (value: SortFilter) => void;
    dateRange: { from: Date | null; to: Date | null };
    onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    displayDateRange: string;
    handleResetAllFilters: () => void;
    activeFilterChips: FilterChip[];
    handleClearFilterChip: (key: string) => void;
};

export function ApplicantsFiltersPanel({
    insights,
    statusSummary,
    effectiveDivisionFilter,
    divisionTabs,
    handleDivisionFilterChange,
    effectivePositionFilter,
    positionTabs,
    handlePositionFilterChange,
    searchTerm,
    handleSearchChange,
    statusFilter,
    onStatusFilterChange,
    statusOrder,
    eligibilityFilter,
    setEligibilityFilter,
    recommendationFilter,
    setRecommendationFilter,
    recommendationOptions,
    scoreBandFilter,
    setScoreBandFilter,
    sortFilter,
    setSortFilter,
    dateRange,
    onDateRangeChange,
    displayDateRange,
    handleResetAllFilters,
    activeFilterChips,
    handleClearFilterChip,
}: ApplicantsFiltersPanelProps) {
    return (
        <>
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
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 md:left-3 md:h-4 md:w-4" />
                            <Input
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Cari pelamar, divisi, posisi, email..."
                                className="h-9 bg-white pl-8 text-xs md:h-10 md:pl-9 md:text-sm"
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
                            <Select
                                value={eligibilityFilter}
                                onValueChange={(value) => setEligibilityFilter(value as EligibilityFilter)}
                            >
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
                            <Select value={scoreBandFilter} onValueChange={(value) => setScoreBandFilter(value as ScoreBandFilter)}>
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
                            <Select value={sortFilter} onValueChange={(value) => setSortFilter(value as SortFilter)}>
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
                                        className="h-9 w-full justify-start gap-1 bg-white text-xs md:h-10 md:gap-2 md:text-sm"
                                    >
                                        <CalendarIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        <span className="truncate">{displayDateRange}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="max-h-[80vh] w-auto overflow-auto p-2" align="start">
                                    <div className="flex flex-col gap-2 md:flex-row md:gap-3">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-slate-600">Mulai</p>
                                            <Calendar
                                                mode="single"
                                                selected={dateRange.from ?? undefined}
                                                onSelect={(date) => onDateRangeChange({ from: date ?? null, to: dateRange.to })}
                                                disabled={(date) => (dateRange.to ? date > dateRange.to : false)}
                                                className="text-[9px] [&_.rdp-button]:h-4 [&_.rdp-button]:w-4 [&_.rdp-button]:md:h-5 [&_.rdp-button]:md:w-5 [&_.rdp-caption]:text-[9px] [&_.rdp-caption]:md:text-[10px] [&_.rdp-cell]:h-4 [&_.rdp-cell]:w-4 [&_.rdp-cell]:md:h-5 [&_.rdp-cell]:md:w-5 [&_.rdp-head_cell]:w-4 [&_.rdp-head_cell]:md:w-5 [&_.rdp-nav_button]:h-4 [&_.rdp-nav_button]:w-4 md:text-[10px]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold text-slate-600">Selesai</p>
                                            <Calendar
                                                mode="single"
                                                selected={dateRange.to ?? undefined}
                                                onSelect={(date) => onDateRangeChange({ from: dateRange.from, to: date ?? null })}
                                                disabled={(date) => (dateRange.from ? date < dateRange.from : false)}
                                                className="text-[9px] [&_.rdp-button]:h-4 [&_.rdp-button]:w-4 [&_.rdp-button]:md:h-5 [&_.rdp-button]:md:w-5 [&_.rdp-caption]:text-[9px] [&_.rdp-caption]:md:text-[10px] [&_.rdp-cell]:h-4 [&_.rdp-cell]:w-4 [&_.rdp-cell]:md:h-5 [&_.rdp-cell]:md:w-5 [&_.rdp-head_cell]:w-4 [&_.rdp-head_cell]:md:w-5 [&_.rdp-nav_button]:h-4 [&_.rdp-nav_button]:w-4 md:text-[10px]"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-end border-t pt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 gap-1 text-[10px]"
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
                                className="h-9 w-full bg-white text-xs md:h-10 md:text-sm"
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
        </>
    );
}
