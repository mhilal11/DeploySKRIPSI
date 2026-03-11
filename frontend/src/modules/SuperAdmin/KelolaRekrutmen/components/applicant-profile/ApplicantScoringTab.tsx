import { CheckCircle, ShieldAlert } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

import { RecruitmentScore, RecruitmentScoreBreakdown } from '../../types';

interface ApplicantScoringTabProps {
  scoring: RecruitmentScore | null | undefined;
  visibleScoringBreakdown: RecruitmentScoreBreakdown[];
  scoreBadgeClassName: string;
}

export function ApplicantScoringTab({
  scoring,
  visibleScoringBreakdown,
  scoreBadgeClassName,
}: ApplicantScoringTabProps) {
  return (
    <Card className="border-0 shadow-md">
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-blue-900">Explainable Recruitment Scoring</h3>
            <p className="text-sm text-slate-600">
              Hasil penilaian kandidat per lowongan berdasarkan bobot multi-kriteria.
            </p>
          </div>
          {scoring && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${scoreBadgeClassName} px-3 py-1`}>
                Total {scoring.total.toFixed(1)}
              </Badge>
              <Badge
                variant="outline"
                className={
                  scoring.eligible
                    ? 'border-emerald-500 text-emerald-700'
                    : 'border-rose-500 text-rose-700'
                }
              >
                {scoring.eligible ? 'Eligible' : 'Tidak Eligible'}
              </Badge>
            </div>
          )}
        </div>

        {!scoring ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Skor belum tersedia untuk kandidat ini.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Metode</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{scoring.method}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Rekomendasi</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {scoring.recommendation}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Posisi Ranking
                </p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {scoring.rank > 0 && scoring.total_candidates > 0
                    ? `#${scoring.rank} dari ${scoring.total_candidates}`
                    : '-'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {visibleScoringBreakdown.map((item) => (
                <div key={item.key} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.score.toFixed(1)}/100
                      </p>
                      <p className="text-xs text-slate-500">
                        Bobot {item.weight.toFixed(1)}% | Kontribusi{' '}
                        {item.contribution.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-900">Kekuatan Kandidat</p>
                </div>
                {scoring.highlights.length === 0 ? (
                  <p className="text-xs text-emerald-800">Belum ada highlight tambahan.</p>
                ) : (
                  <div className="space-y-1">
                    {scoring.highlights.map((item, index) => (
                      <p key={`highlight-${index}`} className="text-xs text-emerald-900">
                        {item}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-900">Risiko & Catatan</p>
                </div>
                {scoring.risks.length === 0 ? (
                  <p className="text-xs text-amber-800">
                    Tidak ada risiko signifikan terdeteksi.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {scoring.risks.map((item, index) => (
                      <p key={`risk-${index}`} className="text-xs text-amber-900">
                        {item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
