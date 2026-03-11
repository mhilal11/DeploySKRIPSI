import { BarChart3 } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

type ReadinessItem = {
    key: string;
    label: string;
    score: number;
    detail: string;
};

type ReadinessReport = {
    overallScore: number;
    overallStatus: string;
    checklist: ReadinessItem[];
    recommendations: string[];
};

type AnalyticsAdvancedSectionsProps = {
    readinessReport: ReadinessReport;
    formatDecimal: (value?: number | null) => string;
    scoreStatus: (value: number) => string;
    selectedDivisions: string[];
    setSelectedDivisions: (value: string[]) => void;
    divisionFilterOptions: string[];
    toggleDivisionSelection: (division: string) => void;
    periodFrom: string;
    setPeriodFrom: (value: string) => void;
    periodTo: string;
    setPeriodTo: (value: string) => void;
    periodFilterOptions: Array<{ value: string; label: string }>;
    scoringAnalytics: any;
    isLoadingScoringInsights: boolean;
    fairnessChartData: Array<Record<string, unknown>>;
    driftChartData: Array<Record<string, unknown>>;
    formatPercent: (value?: number | null) => string;
    vacancyEvaluationChartData: Array<Record<string, unknown>>;
    fairnessRows: any[];
    driftRows: any[];
};

const TrendingValueIcon = ({ positive }: { positive: boolean }) => (
    <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
        {positive ? '^' : 'v'}
    </span>
);

export function AnalyticsAdvancedSections({
    readinessReport,
    formatDecimal,
    scoreStatus,
    selectedDivisions,
    setSelectedDivisions,
    divisionFilterOptions,
    toggleDivisionSelection,
    periodFrom,
    setPeriodFrom,
    periodTo,
    setPeriodTo,
    periodFilterOptions,
    scoringAnalytics,
    isLoadingScoringInsights,
    fairnessChartData,
    driftChartData,
    formatPercent,
    vacancyEvaluationChartData,
    fairnessRows,
    driftRows,
}: AnalyticsAdvancedSectionsProps) {
    return (
        <>
            <Card className="space-y-4 p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Rubrik Otomatis Status Siap Sidang</p>
                            <p className="text-xs text-slate-600">
                                Skor komposit dari kualitas model, fairness, drift, dan kelengkapan audit (berdasarkan filter aktif).
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] text-slate-500">Skor Akhir</p>
                            <p className="text-2xl font-bold text-slate-900">{formatDecimal(readinessReport.overallScore)}/100</p>
                            <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${readinessReport.overallStatus === 'Lulus'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : readinessReport.overallStatus === 'Perlu Kalibrasi'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                            >
                                {readinessReport.overallStatus}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {readinessReport.checklist.map((item) => (
                            <div key={item.key} className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.score >= 85
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : item.score >= 70
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}
                                    >
                                        {scoreStatus(item.score)}
                                    </span>
                                </div>
                                <p className="text-lg font-bold text-slate-900">{formatDecimal(item.score)}</p>
                                <p className="text-[11px] text-slate-500">{item.detail}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold text-slate-800">Rekomendasi Prioritas</p>
                        {readinessReport.recommendations.length === 0 ? (
                            <p className="text-xs text-emerald-700">
                                Semua indikator utama sudah stabil. Sistem siap dipresentasikan pada sidang.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {readinessReport.recommendations.map((item, index) => (
                                    <p key={`${item}-${index}`} className="text-xs text-slate-600">
                                        {index + 1}. {item}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>

                <div className="space-y-4">
                    <Card className="space-y-3 p-4 md:p-5">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Filter Visual Analytics</p>
                                <p className="text-xs text-slate-600">
                                    Filter ini mempengaruhi chart fairness, drift, dan performa lowongan.
                                </p>
                            </div>
                            <BarChart3 className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-slate-500">Divisi (multi-select)</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-7 px-2 text-[11px] text-slate-600"
                                        onClick={() => setSelectedDivisions([])}
                                        disabled={selectedDivisions.length === 0}
                                    >
                                        Reset Divisi
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDivisions([])}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedDivisions.length === 0
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        Semua Divisi
                                    </button>
                                    {divisionFilterOptions.map((division) => {
                                        const isActive = selectedDivisions.includes(division);
                                        return (
                                            <button
                                                key={division}
                                                type="button"
                                                onClick={() => toggleDivisionSelection(division)}
                                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${isActive
                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {division}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500">Rentang Periode Drift</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={periodFrom} onValueChange={setPeriodFrom}>
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Dari" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Awal (Semua)</SelectItem>
                                            {periodFilterOptions.map((period) => (
                                                <SelectItem key={`from-${period.value}`} value={period.value}>
                                                    {period.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={periodTo} onValueChange={setPeriodTo}>
                                        <SelectTrigger className="h-9 bg-white">
                                            <SelectValue placeholder="Sampai" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Akhir (Semua)</SelectItem>
                                            {periodFilterOptions.map((period) => (
                                                <SelectItem key={`to-${period.value}`} value={period.value}>
                                                    {period.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="space-y-3 p-4 md:p-5">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Fairness & Drift Analytics</p>
                                <p className="text-xs text-slate-600">
                                    Monitoring fairness antar divisi dan drift skor antar periode.
                                </p>
                            </div>
                            <BarChart3 className="h-4 w-4 text-indigo-600" />
                        </div>

                        {!scoringAnalytics ? (
                            <p className="text-xs text-slate-500">
                                {isLoadingScoringInsights ? 'Memuat analytics...' : 'Data analytics belum tersedia.'}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-4">
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-[11px] text-slate-500">Global Avg Score</p>
                                        <p className="text-base font-semibold text-slate-900">
                                            {Number(scoringAnalytics.summary?.global_avg_score ?? 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-[11px] text-slate-500">Global Eligible Rate</p>
                                        <p className="text-base font-semibold text-slate-900">
                                            {formatPercent(scoringAnalytics.summary?.global_eligible_rate)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-[11px] text-slate-500">Interview+ Rate</p>
                                        <p className="text-base font-semibold text-slate-900">
                                            {formatPercent(scoringAnalytics.summary?.global_interview_positive_rate)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="text-[11px] text-slate-500">Hired Rate</p>
                                        <p className="text-base font-semibold text-slate-900">
                                            {formatPercent(scoringAnalytics.summary?.global_hired_rate)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="mb-2 text-xs font-semibold text-slate-700">Fairness per Divisi (Top 8)</p>
                                        {fairnessChartData.length === 0 ? (
                                            <p className="text-xs text-slate-500">Belum ada data chart fairness.</p>
                                        ) : (
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={fairnessChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                        <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                                        <YAxis
                                                            yAxisId="right"
                                                            orientation="right"
                                                            domain={[0, 100]}
                                                            tick={{ fontSize: 11 }}
                                                            tickFormatter={(value) => `${value}%`}
                                                        />
                                                        <Tooltip
                                                            formatter={(value: number, name) => {
                                                                if (name === 'Rata-rata Skor') return formatDecimal(value);
                                                                return `${Number(value).toFixed(1)}%`;
                                                            }}
                                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.division ?? '-'}
                                                        />
                                                        <Legend />
                                                        <Bar yAxisId="left" dataKey="avgScore" name="Rata-rata Skor" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                                        <Bar yAxisId="right" dataKey="hiredRate" name="Hired Rate (%)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-3">
                                        <p className="mb-2 text-xs font-semibold text-slate-700">Drift Skor per Periode</p>
                                        {driftChartData.length === 0 ? (
                                            <p className="text-xs text-slate-500">Belum ada data chart drift.</p>
                                        ) : (
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={driftChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} />
                                                        <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                                        <Tooltip
                                                            formatter={(value: number, name) => {
                                                                if (name === 'Drift Delta') return formatDecimal(value);
                                                                return formatDecimal(value);
                                                            }}
                                                        />
                                                        <Legend />
                                                        <Line yAxisId="left" type="monotone" dataKey="avgScore" name="Avg Score" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
                                                        <Line yAxisId="left" type="monotone" dataKey="medianScore" name="Median Score" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                                                        <Line yAxisId="right" type="monotone" dataKey="driftDelta" name="Drift Delta" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="space-y-3 p-4 md:p-5">
                        <p className="text-sm font-semibold text-slate-900">Performa Shortlist per Lowongan</p>
                        <p className="text-xs text-slate-600">
                            Perbandingan Precision@K interview+ dan hired pada lowongan dengan kandidat terbanyak.
                        </p>
                        {selectedDivisions.length > 0 && (
                            <p className="text-[11px] text-slate-500">
                                Menampilkan lowongan pada divisi: <span className="font-semibold text-slate-700">{selectedDivisions.join(', ')}</span>
                            </p>
                        )}
                        {vacancyEvaluationChartData.length === 0 ? (
                            <p className="text-xs text-slate-500">Belum ada data lowongan untuk divisualisasikan.</p>
                        ) : (
                            <div className="h-72 rounded-lg border border-slate-200 p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={vacancyEvaluationChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                                        <Tooltip
                                            formatter={(value: number) => `${Number(value).toFixed(1)}%`}
                                            labelFormatter={(_, payload) => {
                                                const row = payload?.[0]?.payload;
                                                if (!row) return '-';
                                                return `${row.division} | ${row.position}`;
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="precisionInterview" name="Precision Interview+ (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="precisionHired" name="Precision Hired (%)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </Card>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <Card className="space-y-3 p-4 md:p-5">
                            <p className="text-sm font-semibold text-slate-900">Fairness per Divisi</p>
                            {!fairnessRows.length ? (
                                <p className="text-xs text-slate-500">Belum ada data divisi.</p>
                            ) : (
                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                    {fairnessRows.map((row) => {
                                        const badgeClass =
                                            row.fairness_flag === 'Waspada'
                                                ? 'bg-red-100 text-red-700'
                                                : row.fairness_flag === 'Monitor'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-emerald-100 text-emerald-700';
                                        return (
                                            <div key={row.division} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-900">{row.division}</p>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                                                        {row.fairness_flag}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600">
                                                    Avg {Number(row.avg_score ?? 0).toFixed(2)} | Gap {Number(row.score_gap_from_global ?? 0).toFixed(2)} | Kandidat {row.applications_count}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Eligible {formatPercent(row.eligible_rate)} | Interview+ {formatPercent(row.interview_positive_rate)} | Hired {formatPercent(row.hired_rate)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        <Card className="space-y-3 p-4 md:p-5">
                            <p className="text-sm font-semibold text-slate-900">Drift Skor per Periode</p>
                            {!driftRows.length ? (
                                <p className="text-xs text-slate-500">Belum ada data periode.</p>
                            ) : (
                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                    {driftRows
                                        .slice()
                                        .sort((a, b) => String(a.period ?? '').localeCompare(String(b.period ?? '')))
                                        .map((row) => {
                                        const isUp = Number(row.drift_score_delta ?? 0) >= 0;
                                        const driftClass =
                                            row.drift_level === 'Tinggi'
                                                ? 'text-red-600'
                                                : row.drift_level === 'Sedang'
                                                    ? 'text-amber-600'
                                                    : 'text-emerald-600';
                                        return (
                                            <div key={row.period} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-900">{row.period_label}</p>
                                                    <span className={`text-[11px] font-semibold ${driftClass}`}>
                                                        {row.drift_level}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600">
                                                    Avg {Number(row.avg_score ?? 0).toFixed(2)} | Median {Number(row.median_score ?? 0).toFixed(2)} | Kandidat {row.applications_count}
                                                </p>
                                                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <TrendingValueIcon positive={isUp} />
                                                    Drift {isUp ? '+' : ''}{Number(row.drift_score_delta ?? 0).toFixed(2)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
        </>
    );
}


