import {
  ApplicantRecord,
  ApplicantStatus,
  InterviewSchedule,
  OnboardingItem,
  RecruitmentSLASettings,
  StatusSummary,
} from '../../types';

export const statusOrder: ApplicantStatus[] = [
  'Applied',
  'Screening',
  'Interview',
  'Offering',
  'Hired',
  'Rejected',
];

export const inProgressApplicantStatuses: ApplicantStatus[] = [
  'Applied',
  'Screening',
  'Interview',
  'Offering',
];

export const completedInterviewStatuses = new Set<ApplicantStatus>([
  'Offering',
  'Hired',
  'Rejected',
]);

export const defaultSLASettings: RecruitmentSLASettings = {
  Applied: 2,
  Screening: 3,
  Interview: 2,
  Offering: 2,
};

export const onboardingStepLabels = [
  'Kontrak ditandatangani',
  'Serah terima inventaris',
  'Training & orientasi',
] as const;

export const recruitmentFilterStorageKey =
  'super_admin_recruitment_global_filter_preferences_v1';

export const TOP_LOWONGAN_MIN = 1;
export const MINIMUM_SCORE_MIN = 0;
export const MINIMUM_SCORE_MAX = 100;

export const getFirstErrorMessage = (errors: Record<string, string>) =>
  Object.values(errors)[0] || 'Terjadi kesalahan. Silakan coba lagi.';

export const formatTabBadgeCount = (count: number) =>
  count > 99 ? '99+' : String(count);

export const formatDateLabel = (dateValue?: string | null) => {
  if (!dateValue) return '-';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const clampSLAValue = (value: number) => Math.max(1, Math.min(30, value));

export const normalizeSLASettings = (
  input: Partial<Record<string, unknown>> | undefined,
): RecruitmentSLASettings => {
  const parseStage = (
    camelCase: keyof RecruitmentSLASettings,
    snakeCase: string,
    fallback: number,
  ) => {
    const raw = input?.[camelCase] ?? input?.[snakeCase];
    const numeric = Number(raw);
    if (Number.isNaN(numeric) || !Number.isFinite(numeric)) {
      return fallback;
    }
    return clampSLAValue(Math.round(numeric));
  };

  return {
    Applied: parseStage('Applied', 'applied', defaultSLASettings.Applied),
    Screening: parseStage('Screening', 'screening', defaultSLASettings.Screening),
    Interview: parseStage('Interview', 'interview', defaultSLASettings.Interview),
    Offering: parseStage('Offering', 'offering', defaultSLASettings.Offering),
  };
};

export const sanitizeTopLowonganInput = (value: string, maxAllowed: number) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly === '') return '';

  const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
  const numeric = Number(normalized);
  if (Number.isNaN(numeric) || numeric < TOP_LOWONGAN_MIN) return '';

  return String(Math.min(maxAllowed, numeric));
};

export const parseTopLowonganValue = (value: string, maxAllowed: number) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return TOP_LOWONGAN_MIN;
  return Math.max(TOP_LOWONGAN_MIN, Math.min(maxAllowed, numeric));
};

export const sanitizeMinimumScoreInput = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly === '') return '';

  const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
  const numeric = Number(normalized);
  if (Number.isNaN(numeric)) return '';

  return String(Math.max(MINIMUM_SCORE_MIN, Math.min(MINIMUM_SCORE_MAX, numeric)));
};

export const parseDateQuery = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateQuery = (date?: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildOnboardingSteps = (
  contractSigned: boolean,
  inventoryHandover: boolean,
  trainingOrientation: boolean,
) => [
  { label: onboardingStepLabels[0], complete: contractSigned },
  {
    label: onboardingStepLabels[1],
    complete: inventoryHandover,
    pending: !inventoryHandover && contractSigned,
  },
  {
    label: onboardingStepLabels[2],
    complete: trainingOrientation,
    pending: !trainingOrientation && inventoryHandover,
  },
];

export const buildInterviewRow = (application: ApplicantRecord): InterviewSchedule => {
  const dateValue = application.interview_date ?? '';
  return {
    application_id: application.id,
    candidate: application.name,
    position: application.position,
    date: formatDateLabel(dateValue),
    date_value: dateValue,
    time: application.interview_time ?? '-',
    end_time: application.interview_end_time ?? undefined,
    mode: (application.interview_mode ?? 'Online') as 'Online' | 'Offline',
    interviewer: application.interviewer_name ?? '-',
    meeting_link: application.meeting_link ?? null,
    interview_notes: application.interview_notes ?? null,
    status: application.status,
  };
};

export const buildOnboardingItem = (
  application: ApplicantRecord,
  current?: OnboardingItem,
): OnboardingItem => {
  const contractSigned = current?.steps[0]?.complete ?? false;
  const inventoryHandover = current?.steps[1]?.complete ?? false;
  const trainingOrientation = current?.steps[2]?.complete ?? false;
  const steps = buildOnboardingSteps(contractSigned, inventoryHandover, trainingOrientation);
  const allComplete = steps.every((step) => step.complete);

  return {
    application_id: application.id,
    name: application.name,
    position: application.position,
    startedAt:
      current?.startedAt ??
      application.date ??
      formatDateLabel(application.submitted_date) ??
      '-',
    status: allComplete ? 'Selesai' : 'In Progress',
    is_staff: current?.is_staff ?? false,
    steps,
  };
};

type DateRange = {
  from: Date | null;
  to: Date | null;
};

export const buildVisibleApplications = (
  applications: ApplicantRecord[],
  statusFilter: string,
  dateRange: DateRange,
  searchTerm: string,
) => {
  const filteredByStatus =
    statusFilter === 'all'
      ? applications
      : applications.filter((application) => application.status === statusFilter);

  const filteredByDate = filteredByStatus.filter((application) => {
    const submittedDate = application.submitted_date;
    if (!submittedDate) return false;

    const submitted = new Date(submittedDate);
    if (Number.isNaN(submitted.getTime())) return false;

    if (dateRange.from && submitted < dateRange.from) return false;
    if (dateRange.to && submitted > dateRange.to) return false;
    return true;
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return filteredByDate;
  }

  return filteredByDate.filter(
    (application) =>
      application.name.toLowerCase().includes(normalizedSearch) ||
      (application.division ?? '').toLowerCase().includes(normalizedSearch) ||
      application.position.toLowerCase().includes(normalizedSearch) ||
      application.email.toLowerCase().includes(normalizedSearch),
  );
};

export const buildStatusSummary = (applications: ApplicantRecord[]) =>
  applications.reduce((acc, application) => {
    acc[application.status as ApplicantStatus] =
      (acc[application.status as ApplicantStatus] ?? 0) + 1;
    return acc;
  }, {} as StatusSummary);

export const countUniquePositions = (applications: ApplicantRecord[]) => {
  const uniquePositions = new Set<string>();
  applications.forEach((application) => {
    const normalizedPosition = (application.position ?? '').trim().toLowerCase();
    if (normalizedPosition !== '') {
      uniquePositions.add(normalizedPosition);
    }
  });
  return uniquePositions.size;
};
