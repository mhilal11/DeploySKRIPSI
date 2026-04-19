import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api, apiUrl, buildCsrfHeaders, ensureCsrfToken, isAxiosError } from '@/shared/lib/api';
import { router } from '@/shared/lib/inertia';

import {
  clampSLAValue,
  defaultSLASettings,
  getFirstErrorMessage,
  normalizeSLASettings,
} from '../components/recruitment-index/utils';
import {
  RecruitmentSLAOverview,
  RecruitmentSLAReminder,
  RecruitmentSLASettings,
} from '../types';

interface UseRecruitmentScoringControlsParams {
  statusFilter: string;
  slaSettings: RecruitmentSLASettings;
  slaOverview: RecruitmentSLAOverview;
  slaReminders: RecruitmentSLAReminder[];
}

export function useRecruitmentScoringControls({
  statusFilter,
  slaSettings,
  slaOverview,
  slaReminders,
}: UseRecruitmentScoringControlsParams) {
  const [slaSettingsForm, setSlaSettingsForm] = useState<RecruitmentSLASettings>(slaSettings);
  const [slaOverviewState, setSlaOverviewState] = useState<RecruitmentSLAOverview>(slaOverview);
  const [slaReminderRows, setSlaReminderRows] = useState<RecruitmentSLAReminder[]>(slaReminders);
  const [isSavingSLA, setIsSavingSLA] = useState(false);

  useEffect(() => {
    setSlaSettingsForm(slaSettings);
  }, [slaSettings]);

  useEffect(() => {
    setSlaOverviewState(slaOverview);
  }, [slaOverview]);

  useEffect(() => {
    setSlaReminderRows(slaReminders);
  }, [slaReminders]);

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
      const csrfToken = await ensureCsrfToken();
      const payload = {
        applied: clampSLAValue(Number(slaSettingsForm.Applied)),
        screening: clampSLAValue(Number(slaSettingsForm.Screening)),
        interview: clampSLAValue(Number(slaSettingsForm.Interview)),
        offering: clampSLAValue(Number(slaSettingsForm.Offering)),
      };

      const response = await api.post(apiUrl('/super-admin/recruitment/sla-settings'), payload, {
        withCredentials: true,
        headers: buildCsrfHeaders(csrfToken),
      });
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
