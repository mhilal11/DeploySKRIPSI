import { Activity, BarChart3, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
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

const formatPercent = (value?: number | null) => `${Number(value ?? 0).toFixed(1)}%`;

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

                <div className="space-y-4">
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
                        )}
                    </Card>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <Card className="space-y-3 p-4 md:p-5">
                            <p className="text-sm font-semibold text-slate-900">Fairness per Divisi</p>
                            {!scoringAnalytics?.by_division?.length ? (
                                <p className="text-xs text-slate-500">Belum ada data divisi.</p>
                            ) : (
                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                    {scoringAnalytics.by_division.map((row) => {
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
                            {!scoringAnalytics?.by_period?.length ? (
                                <p className="text-xs text-slate-500">Belum ada data periode.</p>
                            ) : (
                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                    {scoringAnalytics.by_period.map((row) => {
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
