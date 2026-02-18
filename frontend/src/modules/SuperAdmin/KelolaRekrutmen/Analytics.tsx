import { Activity, BarChart3, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
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
import { toast } from 'sonner';

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
import { api, apiUrl } from '@/shared/lib/api';
import { Head } from '@/shared/lib/inertia';
import { route } from '@/shared/lib/route';

import {
    RecruitmentAnalyticsPageProps,
    RecruitmentScoringAnalytics,
    RecruitmentScoringAudit,
    RecruitmentScoringEvaluation,
} from './types';

const TOP_K_MIN = 1;
const TOP_K_MAX = 20;
const MINIMUM_SCORE_MIN = 0;
const MINIMUM_SCORE_MAX = 100;

const TARGET_PRECISION_INTERVIEW = 60;
const TARGET_PRECISION_HIRED = 40;
const TARGET_RECALL_INTERVIEW = 70;
const TARGET_RECALL_HIRED = 70;
const TARGET_MAX_FAIRNESS_GAP = 20;

const formatPercent = (value?: number | null) => `${Number(value ?? 0).toFixed(1)}%`;
const formatDecimal = (value?: number | null) => Number(value ?? 0).toFixed(2);
const truncateLabel = (value: string, max = 16) =>
    value.length > max ? `${value.slice(0, max - 1)}...` : value;

const sanitizeTopKInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';

    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
    const numeric = Number(normalized);
    if (Number.isNaN(numeric) || numeric < TOP_K_MIN) return '';
    return String(Math.min(TOP_K_MAX, numeric));
};

const sanitizeMinimumScoreInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';

    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
    const numeric = Number(normalized);
    if (Number.isNaN(numeric)) return '';
    return String(Math.max(MINIMUM_SCORE_MIN, Math.min(MINIMUM_SCORE_MAX, numeric)));
};

const parseTopK = (value: string) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return TOP_K_MIN;
    return Math.max(TOP_K_MIN, Math.min(TOP_K_MAX, numeric));
};

const parseMinimumScore = (value: string) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return MINIMUM_SCORE_MIN;
    return Math.max(MINIMUM_SCORE_MIN, Math.min(MINIMUM_SCORE_MAX, numeric));
};

const normalizeScore = (value: number, target: number) => {
    if (target <= 0) return 100;
    const score = (value / target) * 100;
    return Math.max(0, Math.min(100, score));
};

const scoreStatus = (value: number) => {
    if (value >= 85) return 'Lulus';
    if (value >= 70) return 'Perlu Kalibrasi';
    return 'Belum Lulus';
};

const TrendingValueIcon = ({ positive }: { positive: boolean }) => (
    <span className={positive ? 'text-emerald-600' : 'text-red-600'}>
        {positive ? '^' : 'v'}
    </span>
);

export default function RecruitmentAnalyticsPage({
    auth,
    scoringAudits: initialScoringAudits = [],
    scoringEvaluation: initialScoringEvaluation = null,
    scoringAnalytics: initialScoringAnalytics = null,
}: RecruitmentAnalyticsPageProps) {
    const [scoringAuditRows, setScoringAuditRows] = useState<RecruitmentScoringAudit[]>(initialScoringAudits);
    const [scoringEvaluation, setScoringEvaluation] = useState<RecruitmentScoringEvaluation | null>(initialScoringEvaluation);
    const [scoringAnalytics, setScoringAnalytics] = useState<RecruitmentScoringAnalytics | null>(initialScoringAnalytics);
    const [topK, setTopK] = useState(String(initialScoringEvaluation?.config?.top_k ?? 3));
    const [minimumScore, setMinimumScore] = useState(String(initialScoringEvaluation?.config?.min_score ?? 70));
    const [eligibleOnly, setEligibleOnly] = useState(initialScoringEvaluation?.config?.eligible_only ?? true);
    const [isLoadingScoringInsights, setIsLoadingScoringInsights] = useState(false);
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [periodFrom, setPeriodFrom] = useState('all');
    const [periodTo, setPeriodTo] = useState('all');

    useEffect(() => {
        setScoringAuditRows(initialScoringAudits);
    }, [initialScoringAudits]);

    useEffect(() => {
        setScoringEvaluation(initialScoringEvaluation);
        if (initialScoringEvaluation?.config) {
            setTopK(String(initialScoringEvaluation.config.top_k));
            setMinimumScore(String(initialScoringEvaluation.config.min_score));
            setEligibleOnly(Boolean(initialScoringEvaluation.config.eligible_only));
        }
    }, [initialScoringEvaluation]);

    useEffect(() => {
        setScoringAnalytics(initialScoringAnalytics);
    }, [initialScoringAnalytics]);

    const fetchScoringInsights = useCallback(async () => {
        if (isLoadingScoringInsights) return;

        setIsLoadingScoringInsights(true);
        try {
            const normalizedTopK = parseTopK(topK);
            const normalizedMinimumScore = parseMinimumScore(minimumScore);

            const [evaluationResponse, analyticsResponse, auditsResponse] = await Promise.all([
                api.get(apiUrl('/super-admin/recruitment/scoring-evaluation'), {
                    params: {
                        k: normalizedTopK,
                        eligible_only: eligibleOnly,
                        min_score: normalizedMinimumScore,
                    },
                }),
                api.get(apiUrl('/super-admin/recruitment/scoring-analytics'), {
                    params: { months: 12 },
                }),
                api.get(apiUrl('/super-admin/recruitment/analytics')),
            ]);

            setScoringEvaluation((evaluationResponse.data ?? null) as RecruitmentScoringEvaluation | null);
            setScoringAnalytics((analyticsResponse.data ?? null) as RecruitmentScoringAnalytics | null);

            const nextAudits = Array.isArray(auditsResponse.data?.scoringAudits)
                ? (auditsResponse.data.scoringAudits as RecruitmentScoringAudit[])
                : [];
            setScoringAuditRows(nextAudits);
        } catch {
            toast.error('Gagal memuat data analytics recruitment.');
        } finally {
            setIsLoadingScoringInsights(false);
        }
    }, [eligibleOnly, isLoadingScoringInsights, minimumScore, topK]);

    useEffect(() => {
        if (initialScoringEvaluation && initialScoringAnalytics) {
            return;
        }
        void fetchScoringInsights();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isHumanCapitalAdmin =
        auth?.user?.role === 'Admin' &&
        typeof auth?.user?.division === 'string' &&
        /human\s+(capital|resources)/i.test(auth?.user?.division ?? '');

    const breadcrumbs = useMemo(
        () =>
            isHumanCapitalAdmin
                ? [
                    { label: 'Admin', href: route('admin-staff.dashboard') },
                    { label: 'Kelola Rekrutmen', href: route('super-admin.recruitment') },
                    { label: 'Analytics Rekrutmen' },
                ]
                : [
                    { label: 'Super Admin', href: route('super-admin.dashboard') },
                    { label: 'Kelola Rekrutmen', href: route('super-admin.recruitment') },
                    { label: 'Analytics Rekrutmen' },
                ],
        [isHumanCapitalAdmin],
    );

    const evaluationChartData = useMemo(() => {
        if (!scoringEvaluation?.summary) return [];

        return [
            {
                metric: 'Precision Interview+',
                value: Number(scoringEvaluation.summary.precision_at_k_interview ?? 0),
            },
            {
                metric: 'Precision Hired',
                value: Number(scoringEvaluation.summary.precision_at_k_hired ?? 0),
            },
            {
                metric: 'Recall Interview+',
                value: Number(scoringEvaluation.summary.recall_shortlist_vs_interview ?? 0),
            },
            {
                metric: 'Recall Hired',
                value: Number(scoringEvaluation.summary.recall_shortlist_vs_hired ?? 0),
            },
        ];
    }, [scoringEvaluation]);

    const divisionFilterOptions = useMemo(() => {
        const fromDivisionAnalytics = (scoringAnalytics?.by_division ?? [])
            .map((row) => row.division)
            .filter((value): value is string => Boolean(value && value.trim()));
        const fromVacancyEvaluation = (scoringEvaluation?.by_vacancy ?? [])
            .map((row) => row.division)
            .filter((value): value is string => Boolean(value && value.trim()));

        return Array.from(new Set([...fromDivisionAnalytics, ...fromVacancyEvaluation]))
            .sort((a, b) => a.localeCompare(b));
    }, [scoringAnalytics, scoringEvaluation]);

    const periodFilterOptions = useMemo(() => {
        return (scoringAnalytics?.by_period ?? [])
            .slice()
            .sort((a, b) => String(a.period ?? '').localeCompare(String(b.period ?? '')))
            .map((row) => ({
                value: row.period,
                label: row.period_label,
            }));
    }, [scoringAnalytics]);

    useEffect(() => {
        const optionSet = new Set(divisionFilterOptions);
        setSelectedDivisions((previous) => {
            if (previous.length === 0) return previous;
            const next = previous.filter((division) => optionSet.has(division));
            return next.length === previous.length ? previous : next;
        });
    }, [divisionFilterOptions]);

    useEffect(() => {
        if (periodFrom !== 'all' && !periodFilterOptions.some((item) => item.value === periodFrom)) {
            setPeriodFrom('all');
        }
        if (periodTo !== 'all' && !periodFilterOptions.some((item) => item.value === periodTo)) {
            setPeriodTo('all');
        }
    }, [periodFilterOptions, periodFrom, periodTo]);

    useEffect(() => {
        if (periodFrom === 'all' || periodTo === 'all') return;
        if (periodFrom > periodTo) {
            setPeriodTo(periodFrom);
        }
    }, [periodFrom, periodTo]);

    const vacancyEvaluationRows = useMemo(() => {
        const rows = scoringEvaluation?.by_vacancy ?? [];
        if (selectedDivisions.length === 0) return rows;
        return rows.filter((row) => selectedDivisions.includes(row.division));
    }, [scoringEvaluation, selectedDivisions]);

    const vacancyEvaluationChartData = useMemo(() => {
        return vacancyEvaluationRows
            .slice()
            .sort((a, b) => Number(b.total_candidates ?? 0) - Number(a.total_candidates ?? 0))
            .slice(0, 8)
            .map((row, index) => ({
                key: row.group_key || `${row.division}-${row.position}-${index}`,
                label: truncateLabel(row.position || '-', 18),
                position: row.position || '-',
                division: row.division || '-',
                candidates: Number(row.total_candidates ?? 0),
                precisionInterview: Number(row.precision_at_k_interview ?? 0),
                precisionHired: Number(row.precision_at_k_hired ?? 0),
            }));
    }, [vacancyEvaluationRows]);

    const fairnessRows = useMemo(() => {
        const rows = scoringAnalytics?.by_division ?? [];
        if (selectedDivisions.length === 0) return rows;
        return rows.filter((row) => selectedDivisions.includes(row.division));
    }, [scoringAnalytics, selectedDivisions]);

    const fairnessChartData = useMemo(() => {
        return fairnessRows
            .slice()
            .sort((a, b) => Number(b.applications_count ?? 0) - Number(a.applications_count ?? 0))
            .slice(0, 8)
            .map((row) => ({
                division: row.division,
                label: truncateLabel(row.division || '-', 18),
                avgScore: Number(row.avg_score ?? 0),
                eligibleRate: Number(row.eligible_rate ?? 0),
                hiredRate: Number(row.hired_rate ?? 0),
                candidates: Number(row.applications_count ?? 0),
            }));
    }, [fairnessRows]);

    const driftRows = useMemo(() => {
        const rows = scoringAnalytics?.by_period ?? [];
        return rows.filter((row) => {
            const period = String(row.period ?? '');
            if (periodFrom !== 'all' && period < periodFrom) return false;
            if (periodTo !== 'all' && period > periodTo) return false;
            return true;
        });
    }, [periodFrom, periodTo, scoringAnalytics]);

    const driftChartData = useMemo(() => {
        return driftRows
            .slice()
            .sort((a, b) => String(a.period ?? '').localeCompare(String(b.period ?? '')))
            .map((row) => ({
                period: row.period,
                periodLabel: row.period_label,
                avgScore: Number(row.avg_score ?? 0),
                medianScore: Number(row.median_score ?? 0),
                driftDelta: Number(row.drift_score_delta ?? 0),
                eligibleRate: Number(row.eligible_rate ?? 0),
                candidates: Number(row.applications_count ?? 0),
            }));
    }, [driftRows]);

    const handleTopKChange = (event: ChangeEvent<HTMLInputElement>) => {
        setTopK(sanitizeTopKInput(event.target.value));
    };

    const handleTopKBlur = () => {
        setTopK((previous) => {
            const normalized = sanitizeTopKInput(previous);
            return normalized === '' ? String(TOP_K_MIN) : normalized;
        });
    };

    const handleMinimumScoreChange = (event: ChangeEvent<HTMLInputElement>) => {
        setMinimumScore(sanitizeMinimumScoreInput(event.target.value));
    };

    const handleMinimumScoreBlur = () => {
        setMinimumScore((previous) => {
            const normalized = sanitizeMinimumScoreInput(previous);
            return normalized === '' ? String(MINIMUM_SCORE_MIN) : normalized;
        });
    };

    const toggleDivisionSelection = useCallback((division: string) => {
        setSelectedDivisions((previous) => {
            if (previous.includes(division)) {
                return previous.filter((item) => item !== division);
            }
            return [...previous, division];
        });
    }, []);

    const readinessReport = useMemo(() => {
        const summary = scoringEvaluation?.summary;

        const precisionInterview = Number(summary?.precision_at_k_interview ?? 0);
        const precisionHired = Number(summary?.precision_at_k_hired ?? 0);
        const recallInterview = Number(summary?.recall_shortlist_vs_interview ?? 0);
        const recallHired = Number(summary?.recall_shortlist_vs_hired ?? 0);

        const modelScore =
            (normalizeScore(precisionInterview, TARGET_PRECISION_INTERVIEW) +
                normalizeScore(precisionHired, TARGET_PRECISION_HIRED) +
                normalizeScore(recallInterview, TARGET_RECALL_INTERVIEW) +
                normalizeScore(recallHired, TARGET_RECALL_HIRED)) / 4;

        const fairnessCount = fairnessRows.length;
        const fairnessWaspadaCount = fairnessRows.filter((row) => row.fairness_flag === 'Waspada').length;
        const maxFairnessGap = fairnessRows.reduce(
            (maxValue, row) => Math.max(maxValue, Math.abs(Number(row.score_gap_from_global ?? 0))),
            0,
        );
        const fairnessWaspadaScore =
            fairnessCount === 0 ? 0 : ((fairnessCount - fairnessWaspadaCount) / fairnessCount) * 100;
        const fairnessGapScore = maxFairnessGap <= TARGET_MAX_FAIRNESS_GAP
            ? 100
            : Math.max(0, 100 - (maxFairnessGap - TARGET_MAX_FAIRNESS_GAP) * 5);
        const fairnessScore = fairnessCount === 0
            ? 0
            : fairnessWaspadaScore * 0.7 + fairnessGapScore * 0.3;

        const driftCount = driftRows.length;
        const driftHighCount = driftRows.filter((row) => row.drift_level === 'Tinggi').length;
        const driftMediumCount = driftRows.filter((row) => row.drift_level === 'Sedang').length;
        const driftScore = driftCount === 0
            ? 0
            : Math.max(0, 100 - (driftHighCount / driftCount) * 100 - (driftMediumCount / driftCount) * 40);

        const auditScore = Math.min(100, (scoringAuditRows.length / 10) * 100);

        const overallScore =
            modelScore * 0.45 +
            fairnessScore * 0.25 +
            driftScore * 0.2 +
            auditScore * 0.1;

        const roundedOverall = Number(overallScore.toFixed(1));

        const checklist = [
            {
                key: 'model',
                label: 'Kualitas Model',
                score: Number(modelScore.toFixed(1)),
                detail: `P@K Intv ${formatPercent(precisionInterview)} | P@K Hired ${formatPercent(precisionHired)} | Recall Intv ${formatPercent(recallInterview)} | Recall Hired ${formatPercent(recallHired)}`,
            },
            {
                key: 'fairness',
                label: 'Fairness Divisi',
                score: Number(fairnessScore.toFixed(1)),
                detail: `Waspada ${fairnessWaspadaCount}/${fairnessCount} | Max Gap ${formatDecimal(maxFairnessGap)} (target <= ${TARGET_MAX_FAIRNESS_GAP})`,
            },
            {
                key: 'drift',
                label: 'Stabilitas Drift',
                score: Number(driftScore.toFixed(1)),
                detail: `Periode Tinggi ${driftHighCount}/${driftCount} | Sedang ${driftMediumCount}/${driftCount}`,
            },
            {
                key: 'audit',
                label: 'Kelengkapan Audit',
                score: Number(auditScore.toFixed(1)),
                detail: `${scoringAuditRows.length} aktivitas audit tercatat`,
            },
        ];

        const recommendations: string[] = [];
        if (modelScore < 70) {
            recommendations.push('Kalibrasi bobot/threshold scoring dan evaluasi ulang precision-recall per lowongan.');
        }
        if (fairnessScore < 70) {
            recommendations.push('Review kriteria antar divisi yang menghasilkan gap tinggi atau banyak status Waspada.');
        }
        if (driftScore < 70) {
            recommendations.push('Lakukan rekalibrasi periodik karena drift Sedang/Tinggi masih dominan.');
        }
        if (auditScore < 70) {
            recommendations.push('Perbanyak jejak audit konfigurasi, shortlist, dan export untuk pembuktian sidang.');
        }

        return {
            overallScore: roundedOverall,
            overallStatus: scoreStatus(roundedOverall),
            checklist,
            recommendations,
        };
    }, [driftRows, fairnessRows, scoringAuditRows.length, scoringEvaluation?.summary]);

    return (
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
                                            Oleh {audit.actor_name || 'System'} • {audit.created_at_diff || audit.created_at || '-'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

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
            </SuperAdminLayout>
        </>
    );
}
