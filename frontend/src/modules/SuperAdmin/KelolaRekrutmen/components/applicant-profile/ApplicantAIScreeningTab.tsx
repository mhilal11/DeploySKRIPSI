import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

import { RecruitmentAIScreening } from '../../types';

interface ApplicantAIScreeningTabProps {
  aiScreening: RecruitmentAIScreening | null | undefined;
  aiScore: number | null;
  aiScoreBadgeClassName: string;
  aiScreeningStatus: string;
}

export function ApplicantAIScreeningTab({
  aiScreening,
  aiScore,
  aiScoreBadgeClassName,
  aiScreeningStatus,
}: ApplicantAIScreeningTabProps) {
  const friendlyErrorMessage = humanizeAIScreeningErrorMessage(aiScreening?.error_message);
  const statusPresentation = getAIScreeningStatusPresentation(aiScreeningStatus);

  return (
    <Card className="border-0 shadow-md">
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-blue-900">AI CV Screening (Groq)</h3>
            <p className="text-sm text-slate-600">
              Ringkasan kecocokan CV kandidat terhadap kriteria lowongan.
            </p>
          </div>
          {aiScore !== null && (
            <Badge variant="outline" className={`${aiScoreBadgeClassName} px-3 py-1`}>
              Match {aiScore.toFixed(1)}
            </Badge>
          )}
        </div>

        {!aiScreening ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Belum ada hasil AI screening. Screening berjalan otomatis saat pelamar submit
            lamaran.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Rekomendasi</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {aiScreening.recommendation ?? '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Model</p>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {aiScreening.model_used ?? '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className={`text-sm font-medium mt-1 ${statusPresentation.className}`}>
                  {statusPresentation.label}
                </p>
              </div>
            </div>

            {aiScreening.summary && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                  Ringkasan
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{aiScreening.summary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900 mb-2">Kekuatan CV</p>
                {aiScreening.strengths?.length ? (
                  <div className="space-y-1">
                    {aiScreening.strengths.map((item, index) => (
                      <p key={`ai-strength-${index}`} className="text-xs text-emerald-900">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-800">Belum ada poin kekuatan.</p>
                )}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">Gap Kandidat</p>
                {aiScreening.gaps?.length ? (
                  <div className="space-y-1">
                    {aiScreening.gaps.map((item, index) => (
                      <p key={`ai-gap-${index}`} className="text-xs text-amber-900">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-800">
                    Tidak ada gap utama terdeteksi.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-900 mb-2">Red Flags</p>
                {aiScreening.red_flags?.length ? (
                  <div className="space-y-1">
                    {aiScreening.red_flags.map((item, index) => (
                      <p key={`ai-flag-${index}`} className="text-xs text-rose-900">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-rose-800">Tidak ada red flag signifikan.</p>
                )}
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-900 mb-2">
                  Saran Pertanyaan Interview
                </p>
                {aiScreening.interview_questions?.length ? (
                  <div className="space-y-1">
                    {aiScreening.interview_questions.map((item, index) => (
                      <p key={`ai-question-${index}`} className="text-xs text-indigo-900">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-indigo-800">Belum ada saran pertanyaan.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                <p>
                  Token Prompt:{' '}
                  <span className="font-semibold text-slate-700">
                    {aiScreening.tokens?.prompt ?? 0}
                  </span>
                </p>
                <p>
                  Token Completion:{' '}
                  <span className="font-semibold text-slate-700">
                    {aiScreening.tokens?.completion ?? 0}
                  </span>
                </p>
                <p>
                  Token Total:{' '}
                  <span className="font-semibold text-slate-700">
                    {aiScreening.tokens?.total ?? 0}
                  </span>
                </p>
              </div>
              {friendlyErrorMessage && (
                <p className="mt-2 text-xs text-rose-700">{friendlyErrorMessage}</p>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function humanizeAIScreeningErrorMessage(message?: string | null) {
  const trimmed = (message ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.toLowerCase();
  if (
    normalized.includes('status 429') ||
    normalized.includes('rate limit reached') ||
    normalized.includes('layanan ai sedang padat')
  ) {
    return 'Layanan AI sedang padat. Screening CV akan dicoba lagi otomatis setelah kapasitas tersedia.';
  }
  if (
    normalized.includes('failed to validate json') ||
    normalized.includes('failed_generation') ||
    normalized.includes('bukan json object valid') ||
    normalized.includes('respons ai belum stabil')
  ) {
    return 'Respons AI belum stabil saat membaca CV. Sistem akan mencoba memproses ulang secara otomatis.';
  }
  if (normalized.includes('timeout') || normalized.includes('batas waktu')) {
    return 'Permintaan ke layanan AI melebihi batas waktu. Screening CV akan dicoba lagi.';
  }

  return 'Screening AI belum berhasil diproses. Silakan cek lagi beberapa saat.';
}

function getAIScreeningStatusPresentation(status?: string | null) {
  const normalized = (status ?? '').trim().toLowerCase();
  switch (normalized) {
    case 'success':
      return { label: 'Berhasil', className: 'text-emerald-700' };
    case 'processing':
      return { label: 'Sedang Diproses', className: 'text-sky-700' };
    case 'retrying':
      return { label: 'Mencoba Ulang', className: 'text-amber-700' };
    case 'failed':
      return { label: 'Gagal', className: 'text-rose-700' };
    default:
      return { label: status?.trim() || '-', className: 'text-slate-700' };
  }
}
