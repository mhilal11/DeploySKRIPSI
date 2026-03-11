import { Activity, RefreshCw } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Head } from '@/shared/lib/inertia';

import { AnalyticsAdvancedSections } from './analytics/AnalyticsAdvancedSections';

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

type RecruitmentAnalyticsViewProps = {
    breadcrumbs: Array<{ label: string; href?: string }>;
    topK: string;
    minimumScore: string;
    eligibleOnly: boolean;
    isLoadingScoringInsights: boolean;
    scoringEvaluation: any;
    evaluationChartData: Array<{ metric: string; value: number }>;
    scoringAuditRows: any[];
    readinessReport: ReadinessReport;
    selectedDivisions: string[];
    divisionFilterOptions: string[];
    periodFrom: string;
    periodTo: string;
    periodFilterOptions: Array<{ value: string; label: string }>;
    scoringAnalytics: any;
    fairnessChartData: Array<Record<string, unknown>>;
    driftChartData: Array<Record<string, unknown>>;
    vacancyEvaluationChartData: Array<Record<string, unknown>>;
    fairnessRows: any[];
    driftRows: any[];
    handleTopKChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleTopKBlur: () => void;
    handleMinimumScoreChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleMinimumScoreBlur: () => void;
    setEligibleOnly: (value: boolean) => void;
    fetchScoringInsights: () => void;
    formatPercent: (value?: number | null) => string;
    formatDecimal: (value?: number | null) => string;
    scoreStatus: (value: number) => string;
    setSelectedDivisions: (value: string[]) => void;
    toggleDivisionSelection: (division: string) => void;
    setPeriodFrom: (value: string) => void;
    setPeriodTo: (value: string) => void;
};

export function RecruitmentAnalyticsView({
    breadcrumbs,
    topK,
    minimumScore,
    eligibleOnly,
    isLoadingScoringInsights,
    scoringEvaluation,
    evaluationChartData,
    scoringAuditRows,
    readinessReport,
    selectedDivisions,
    divisionFilterOptions,
    periodFrom,
    periodTo,
    periodFilterOptions,
    scoringAnalytics,
    fairnessChartData,
    driftChartData,
    vacancyEvaluationChartData,
    fairnessRows,
    driftRows,
    handleTopKChange,
    handleTopKBlur,
    handleMinimumScoreChange,
    handleMinimumScoreBlur,
    setEligibleOnly,
    fetchScoringInsights,
    formatPercent,
    formatDecimal,
    scoreStatus,
    setSelectedDivisions,
    toggleDivisionSelection,
    setPeriodFrom,
    setPeriodTo,
}: RecruitmentAnalyticsViewProps) {    return (
        <>
            <Head title="Analytics Rekrutmen" />
            <SuperAdminLayout
                title="Analytics Rekrutmen"
                description="Evaluasi kualitas model scoring, fairness, drift, dan audit trail recruitment."
                breadcrumbs={breadcrumbs}
            >
                <div className="grid gap-4 xl:grid-cols-12">
                    <Card className="h-full space-y-4 p-4 md:p-5 xl:col-span-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Konfigurasi Evaluasi</p>
                                <p className="text-xs text-slate-600">Atur parameter Precision@K dan Recall.</p>
                            </div>
                            <Activity className="h-4 w-4 text-indigo-600" />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500">Top Kandidat / Lowongan</p>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={topK}
                                    onChange={handleTopKChange}
                                    onBlur={handleTopKBlur}
                                    className="h-9"
                                />
                                <p className="text-[11px] text-slate-500">Batas 1-20 kandidat per lowongan.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500">Minimum Skor</p>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={3}
                                    value={minimumScore}
                                    onChange={handleMinimumScoreChange}
                                    onBlur={handleMinimumScoreBlur}
                                    className="h-9"
                                />
                                <p className="text-[11px] text-slate-500">Batas skor 0-100.</p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="analytics-eligible-only"
                                    checked={eligibleOnly}
                                    onCheckedChange={(checked) => setEligibleOnly(Boolean(checked))}
                                />
                                <label htmlFor="analytics-eligible-only" className="cursor-pointer text-sm text-slate-700">
                                    Hanya kandidat eligible
                                </label>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={fetchScoringInsights}
                            disabled={isLoadingScoringInsights}
                            className="justify-start border-slate-300"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {isLoadingScoringInsights ? 'Memuat...' : 'Refresh Analytics'}
                        </Button>
                    </Card>

                    <Card className="h-full space-y-3 p-4 md:p-5 xl:col-span-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Evaluasi Model Scoring</p>
                                <p className="text-xs text-slate-600">Precision@K dan recall terhadap outcome interview/hired.</p>
                            </div>
                            <Activity className="h-4 w-4 text-emerald-600" />
                        </div>

                        {!scoringEvaluation ? (
                            <p className="text-xs text-slate-500">
                                {isLoadingScoringInsights ? 'Memuat evaluasi model...' : 'Data evaluasi belum tersedia.'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                        <p className="text-[11px] text-slate-500">Precision@K (Interview+)</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatPercent(scoringEvaluation.summary?.precision_at_k_interview)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                        <p className="text-[11px] text-slate-500">Precision@K (Hired)</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatPercent(scoringEvaluation.summary?.precision_at_k_hired)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                        <p className="text-[11px] text-slate-500">Recall Shortlist vs Interview+</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatPercent(scoringEvaluation.summary?.recall_shortlist_vs_interview)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                        <p className="text-[11px] text-slate-500">Recall Shortlist vs Hired</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatPercent(scoringEvaluation.summary?.recall_shortlist_vs_hired)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Konfigurasi: K={scoringEvaluation.config?.top_k ?? '-'} | Eligible only: {scoringEvaluation.config?.eligible_only ? 'Ya' : 'Tidak'} | Min score: {scoringEvaluation.config?.min_score ?? '-'}
                                </p>
                                {evaluationChartData.length > 0 && (
                                    <div className="h-52 rounded-lg border border-slate-200 p-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={evaluationChartData} margin={{ top: 10, right: 6, left: 6, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="metric" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                                                <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                                                <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    <Card className="h-full space-y-3 p-4 md:p-5 xl:col-span-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Audit Trail Scoring</p>
                            <p className="text-xs text-slate-600">Aktivitas terbaru konfigurasi, shortlist, dan export.</p>
                        </div>
                        {scoringAuditRows.length === 0 ? (
                            <p className="text-xs text-slate-500">Belum ada aktivitas audit scoring.</p>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {scoringAuditRows.slice(0, 10).map((audit) => (
                                    <div key={audit.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                                        <p className="text-xs font-semibold text-slate-900">{audit.action_label}</p>
                                        <p className="text-[11px] text-slate-600">
                                            {audit.division_name || '-'} | {audit.position_title || '-'}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            Oleh {audit.actor_name || 'System'} â€¢ {audit.created_at_diff || audit.created_at || '-'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <AnalyticsAdvancedSections
                    readinessReport={readinessReport}
                    formatDecimal={formatDecimal}
                    scoreStatus={scoreStatus}
                    selectedDivisions={selectedDivisions}
                    setSelectedDivisions={setSelectedDivisions}
                    divisionFilterOptions={divisionFilterOptions}
                    toggleDivisionSelection={toggleDivisionSelection}
                    periodFrom={periodFrom}
                    setPeriodFrom={setPeriodFrom}
                    periodTo={periodTo}
                    setPeriodTo={setPeriodTo}
                    periodFilterOptions={periodFilterOptions}
                    scoringAnalytics={scoringAnalytics}
                    isLoadingScoringInsights={isLoadingScoringInsights}
                    fairnessChartData={fairnessChartData}
                    driftChartData={driftChartData}
                    formatPercent={formatPercent}
                    vacancyEvaluationChartData={vacancyEvaluationChartData}
                    fairnessRows={fairnessRows}
                    driftRows={driftRows}
                />
            </SuperAdminLayout>
        </>
    );
}

