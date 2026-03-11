import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { api, apiUrl } from '@/shared/lib/api';
import { route } from '@/shared/lib/route';

import { RecruitmentAnalyticsView } from './components/AnalyticsView';
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
        <RecruitmentAnalyticsView
            breadcrumbs={breadcrumbs}
            topK={topK}
            minimumScore={minimumScore}
            eligibleOnly={eligibleOnly}
            isLoadingScoringInsights={isLoadingScoringInsights}
            scoringEvaluation={scoringEvaluation}
            evaluationChartData={evaluationChartData}
            scoringAuditRows={scoringAuditRows}
            readinessReport={readinessReport}
            selectedDivisions={selectedDivisions}
            divisionFilterOptions={divisionFilterOptions}
            periodFrom={periodFrom}
            periodTo={periodTo}
            periodFilterOptions={periodFilterOptions}
            scoringAnalytics={scoringAnalytics}
            fairnessChartData={fairnessChartData}
            driftChartData={driftChartData}
            vacancyEvaluationChartData={vacancyEvaluationChartData}
            fairnessRows={fairnessRows}
            driftRows={driftRows}
            handleTopKChange={handleTopKChange}
            handleTopKBlur={handleTopKBlur}
            handleMinimumScoreChange={handleMinimumScoreChange}
            handleMinimumScoreBlur={handleMinimumScoreBlur}
            setEligibleOnly={setEligibleOnly}
            fetchScoringInsights={fetchScoringInsights}
            formatPercent={formatPercent}
            formatDecimal={formatDecimal}
            scoreStatus={scoreStatus}
            setSelectedDivisions={setSelectedDivisions}
            toggleDivisionSelection={toggleDivisionSelection}
            setPeriodFrom={setPeriodFrom}
            setPeriodTo={setPeriodTo}
        />
    );
}



