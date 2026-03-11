import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api, apiUrl, isAxiosError } from '@/shared/lib/api';
import { router } from '@/shared/lib/inertia';

import {
  MINIMUM_SCORE_MAX,
  MINIMUM_SCORE_MIN,
  TOP_LOWONGAN_MIN,
  clampSLAValue,
  countUniquePositions,
  defaultSLASettings,
  getFirstErrorMessage,
  normalizeSLASettings,
  parseTopLowonganValue,
  sanitizeMinimumScoreInput,
  sanitizeTopLowonganInput,
} from '../components/recruitment-index/utils';
import {
  ApplicantRecord,
  RecruitmentSLAOverview,
  RecruitmentSLAReminder,
  RecruitmentSLASettings,
} from '../types';

interface UseRecruitmentScoringControlsParams {
  applicationRows: ApplicantRecord[];
  statusFilter: string;
  slaSettings: RecruitmentSLASettings;
  slaOverview: RecruitmentSLAOverview;
  slaReminders: RecruitmentSLAReminder[];
}

export function useRecruitmentScoringControls({
  applicationRows,
  statusFilter,
  slaSettings,
  slaOverview,
  slaReminders,
}: UseRecruitmentScoringControlsParams) {
  const [autoShortlistTopN, setAutoShortlistTopN] = useState('3');
  const [autoShortlistMinScore, setAutoShortlistMinScore] = useState('70');
  const [autoShortlistEligibleOnly, setAutoShortlistEligibleOnly] = useState(true);
  const [isRunningAutoShortlist, setIsRunningAutoShortlist] = useState(false);
  const [slaSettingsForm, setSlaSettingsForm] = useState<RecruitmentSLASettings>(slaSettings);
  const [slaOverviewState, setSlaOverviewState] = useState<RecruitmentSLAOverview>(slaOverview);
  const [slaReminderRows, setSlaReminderRows] = useState<RecruitmentSLAReminder[]>(slaReminders);
  const [isSavingSLA, setIsSavingSLA] = useState(false);

  const totalLowonganAvailable = useMemo(
    () => countUniquePositions(applicationRows),
    [applicationRows],
  );
  const autoShortlistTopNMax = Math.max(TOP_LOWONGAN_MIN, totalLowonganAvailable);

  useEffect(() => {
    setAutoShortlistTopN((previous) => {
      if (previous.trim() === '') return previous;
      return String(parseTopLowonganValue(previous, autoShortlistTopNMax));
    });
  }, [autoShortlistTopNMax]);

  useEffect(() => {
    setSlaSettingsForm(slaSettings);
  }, [slaSettings]);

  useEffect(() => {
    setSlaOverviewState(slaOverview);
  }, [slaOverview]);

  useEffect(() => {
    setSlaReminderRows(slaReminders);
  }, [slaReminders]);

  const handleRunAutoShortlist = async () => {
    if (isRunningAutoShortlist) return;

    const topN = parseTopLowonganValue(autoShortlistTopN, autoShortlistTopNMax);
    const minScore = Math.max(
      MINIMUM_SCORE_MIN,
      Math.min(MINIMUM_SCORE_MAX, Number(autoShortlistMinScore) || 0),
    );

    setIsRunningAutoShortlist(true);
    try {
      const response = await api.post(apiUrl('/super-admin/recruitment/auto-shortlist'), {
        top_n: topN,
        eligible_only: autoShortlistEligibleOnly,
        min_score: minScore,
      });
      const data = response.data ?? {};
      const summary = data.summary ?? {};

      toast.success(data.status || 'Auto-shortlist selesai.', {
        description: `Terpilih ${summary.shortlisted_count ?? 0} kandidat dari ${summary.group_count ?? 0} kelompok lowongan.`,
      });

      router.reload({
        preserveScroll: true,
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const message =
          (error.response?.data as any)?.message ||
          (error.response?.data as any)?.status ||
          'Gagal menjalankan auto-shortlist.';
        toast.error(message);
      } else {
        toast.error('Gagal menjalankan auto-shortlist.');
      }
    } finally {
      setIsRunningAutoShortlist(false);
    }
  };

  const handleMinimumScoreChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAutoShortlistMinScore(sanitizeMinimumScoreInput(event.target.value));
  };

  const handleMinimumScoreBlur = () => {
    setAutoShortlistMinScore((previous) => {
      const normalized = sanitizeMinimumScoreInput(previous);
      return normalized === '' ? String(MINIMUM_SCORE_MIN) : normalized;
    });
  };

  const handleTopLowonganChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAutoShortlistTopN(
      sanitizeTopLowonganInput(event.target.value, autoShortlistTopNMax),
    );
  };

  const handleTopLowonganBlur = () => {
    setAutoShortlistTopN((previous) => {
      const normalized = sanitizeTopLowonganInput(previous, autoShortlistTopNMax);
      return normalized === '' ? String(TOP_LOWONGAN_MIN) : normalized;
    });
  };

  const handleExportScoreReport = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    const query = params.toString();
    const url = query
      ? apiUrl(`/super-admin/recruitment/export-score-report?${query}`)
      : apiUrl('/super-admin/recruitment/export-score-report');

    window.open(url, '_blank');
    toast.success('Laporan skor sedang disiapkan.');
  };

  const handleExportScoreReportPDF = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    const query = params.toString();
    const url = query
      ? apiUrl(`/super-admin/recruitment/export-score-report-pdf?${query}`)
      : apiUrl('/super-admin/recruitment/export-score-report-pdf');

    window.open(url, '_blank');
    toast.success('Laporan PDF sedang disiapkan.');
  };

  const handleSLASettingChange = (stage: keyof RecruitmentSLASettings, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits === '') {
      setSlaSettingsForm((prev) => ({
        ...prev,
        [stage]: defaultSLASettings[stage],
      }));
      return;
    }
    const numeric = clampSLAValue(Number(digits));
    setSlaSettingsForm((prev) => ({
      ...prev,
      [stage]: numeric,
    }));
  };

  const handleSaveSLASettings = async () => {
    if (isSavingSLA) return;
    setIsSavingSLA(true);
    try {
      const payload = {
        applied: clampSLAValue(Number(slaSettingsForm.Applied)),
        screening: clampSLAValue(Number(slaSettingsForm.Screening)),
        interview: clampSLAValue(Number(slaSettingsForm.Interview)),
        offering: clampSLAValue(Number(slaSettingsForm.Offering)),
      };

      const response = await api.post(apiUrl('/super-admin/recruitment/sla-settings'), payload);
      const nextSettings = normalizeSLASettings(response.data?.settings);
      setSlaSettingsForm(nextSettings);
      toast.success('Konfigurasi SLA berhasil disimpan.');
      router.reload({
        only: [
          'applications',
          'interviews',
          'onboarding',
          'slaSettings',
          'slaOverview',
          'slaReminders',
          'sidebarNotifications',
        ],
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const errorData = error.response?.data as
          | { errors?: Record<string, string>; message?: string }
          | undefined;
        const message = errorData?.errors
          ? getFirstErrorMessage(errorData.errors)
          : errorData?.message;
        toast.error(message || 'Gagal menyimpan konfigurasi SLA.');
      } else {
        toast.error('Gagal menyimpan konfigurasi SLA.');
      }
    } finally {
      setIsSavingSLA(false);
    }
  };

  return {
    autoShortlistTopN,
    autoShortlistTopNMax,
    autoShortlistMinScore,
    autoShortlistEligibleOnly,
    setAutoShortlistEligibleOnly,
    isRunningAutoShortlist,
    handleRunAutoShortlist,
    handleTopLowonganChange,
    handleTopLowonganBlur,
    handleMinimumScoreChange,
    handleMinimumScoreBlur,
    handleExportScoreReport,
    handleExportScoreReportPDF,
    slaOverviewState,
    slaSettingsForm,
    slaReminderRows,
    isSavingSLA,
    handleSLASettingChange,
    handleSaveSLASettings,
  };
}
