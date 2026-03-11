import { AlertTriangle, BellRing, Clock3, FileDown, FileText, Save, Sparkles } from 'lucide-react';
import { type ChangeEvent } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';

import {
  RecruitmentSLAOverview,
  RecruitmentSLAReminder,
  RecruitmentSLASettings,
} from '../../types';

interface RecruitmentApplicantsControlsProps {
  slaOverviewState: RecruitmentSLAOverview;
  slaSettingsForm: RecruitmentSLASettings;
  slaReminderRows: RecruitmentSLAReminder[];
  onSLASettingChange: (stage: keyof RecruitmentSLASettings, value: string) => void;
  onSaveSLASettings: () => void;
  isSavingSLA: boolean;
  autoShortlistTopN: string;
  autoShortlistTopNMax: number;
  onTopLowonganChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTopLowonganBlur: () => void;
  autoShortlistMinScore: string;
  onMinimumScoreChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMinimumScoreBlur: () => void;
  autoShortlistEligibleOnly: boolean;
  onAutoShortlistEligibleOnlyChange: (checked: boolean) => void;
  onRunAutoShortlist: () => void;
  isRunningAutoShortlist: boolean;
  onExportScoreReport: () => void;
  onExportScoreReportPDF: () => void;
}

export function RecruitmentApplicantsControls({
  slaOverviewState,
  slaSettingsForm,
  slaReminderRows,
  onSLASettingChange,
  onSaveSLASettings,
  isSavingSLA,
  autoShortlistTopN,
  autoShortlistTopNMax,
  onTopLowonganChange,
  onTopLowonganBlur,
  autoShortlistMinScore,
  onMinimumScoreChange,
  onMinimumScoreBlur,
  autoShortlistEligibleOnly,
  onAutoShortlistEligibleOnlyChange,
  onRunAutoShortlist,
  isRunningAutoShortlist,
  onExportScoreReport,
  onExportScoreReportPDF,
}: RecruitmentApplicantsControlsProps) {
  return (
    <div className="mb-5 grid gap-4 xl:grid-cols-2">
      <Card className="h-full space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">SLA Tracker & Reminder</p>
            <p className="text-xs leading-relaxed text-slate-600">
              Pantau target durasi tiap stage dan prioritas follow-up kandidat.
            </p>
          </div>
          <BellRing className="h-4 w-4 text-amber-600" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
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

        <div className="grid gap-2 sm:grid-cols-2">
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
            <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
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
      </Card>

      <Card className="h-full space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Scoring Action Center</p>
            <p className="text-xs leading-relaxed text-slate-600">
              Jalankan shortlist otomatis dan export laporan ranking kandidat (CSV/PDF).
            </p>
          </div>
          <Sparkles className="h-4 w-4 text-indigo-600" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Top Kandidat per Lowongan</p>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={autoShortlistTopN}
              onChange={onTopLowonganChange}
              onBlur={onTopLowonganBlur}
              className="h-9"
            />
            <p className="text-[11px] text-slate-500">
              Maksimal {autoShortlistTopNMax} (sesuai jumlah lowongan tersedia).
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Minimum Skor</p>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={autoShortlistMinScore}
              onChange={onMinimumScoreChange}
              onBlur={onMinimumScoreBlur}
              className="h-9"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="shortlist-eligible-only"
                checked={autoShortlistEligibleOnly}
                onCheckedChange={(checked) => onAutoShortlistEligibleOnlyChange(Boolean(checked))}
              />
              <label
                htmlFor="shortlist-eligible-only"
                className="cursor-pointer text-sm text-slate-700"
              >
                Hanya kandidat yang eligible
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={onRunAutoShortlist}
            disabled={isRunningAutoShortlist}
            className="justify-start bg-indigo-600 hover:bg-indigo-700"
          >
            {isRunningAutoShortlist ? 'Memproses...' : 'Jalankan Auto Shortlist'}
          </Button>
          <Button
            variant="outline"
            onClick={onExportScoreReport}
            className="justify-start border-slate-300"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export Laporan Skor (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={onExportScoreReportPDF}
            className="justify-start border-slate-300"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export Laporan Skor (PDF)
          </Button>
        </div>
        <p className="text-[11px] text-slate-500">
          Auto-shortlist memilih kandidat terbaik per lowongan berdasarkan skor. Perubahan otomatis
          hanya berlaku untuk kandidat berstatus Applied (dipindahkan ke Screening).
        </p>
      </Card>
    </div>
  );
}
