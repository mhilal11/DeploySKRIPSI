// src/Pages/SuperAdmin/Recruitment/KelolaRekrutmenIndex.tsx

import {
    AlertTriangle,
    BellRing,
    Calendar as CalendarIcon,
    Clock3,
    FileDown,
    FileText,
    Save,
    Sparkles,
    Users,
    UserCheck,
    Video,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { api, apiUrl, isAxiosError } from '@/shared/lib/api';
import { Head, router } from '@/shared/lib/inertia';

import ApplicantProfileDialog from './components/ApplicantProfileDialog';
import ApplicantsTab from './components/ApplicantsTab';
import InterviewDetailDialog from './components/InterviewDetailDialog';
import InterviewsTab from './components/InterviewsTab';
import OnboardingTab from './components/OnboardingTab';
import { RecruitmentCalendar } from './components/RecruitmentCalendar';
import ScheduleInterviewDialog from './components/ScheduleInterviewDialog';
import {
    ApplicantRecord,
    ApplicantStatus,
    ApplicantRejectHandler,
    InterviewSchedule,
    OnboardingItem,
    RecruitmentSLAOverview,
    RecruitmentSLAReminder,
    RecruitmentSLASettings,
    RecruitmentPageProps,
    StatusSummary,
} from './types';



type ApplicantActionHandler = (applicantId: number, newStatus: ApplicantStatus) => void;
const statusOrder: ApplicantStatus[] = [
    'Applied',
    'Screening',
    'Interview',
    'Offering',
    'Hired',
    'Rejected',
];
const defaultSLASettings: RecruitmentSLASettings = {
    Applied: 2,
    Screening: 3,
    Interview: 2,
    Offering: 2,
};
const defaultSLAOverview: RecruitmentSLAOverview = {
    active_applications: 0,
    on_track_count: 0,
    warning_count: 0,
    overdue_count: 0,
    compliance_rate: 100,
};

const onboardingStepLabels = [
    'Kontrak ditandatangani',
    'Serah terima inventaris',
    'Training & orientasi',
] as const;

const getFirstErrorMessage = (errors: Record<string, string>) =>
    Object.values(errors)[0] || 'Terjadi kesalahan. Silakan coba lagi.';

const formatDateLabel = (dateValue?: string | null) => {
    if (!dateValue) return '-';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return dateValue;
    return parsed.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};
const clampSLAValue = (value: number) => Math.max(1, Math.min(30, value));
const normalizeSLASettings = (input: Partial<Record<string, unknown>> | undefined): RecruitmentSLASettings => {
    const parseStage = (camelCase: keyof RecruitmentSLASettings, snakeCase: string, fallback: number) => {
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

const recruitmentFilterStorageKey = 'super_admin_recruitment_global_filter_preferences_v1';
const TOP_LOWONGAN_MIN = 1;
const MINIMUM_SCORE_MIN = 0;
const MINIMUM_SCORE_MAX = 100;

const sanitizeTopLowonganInput = (value: string, maxAllowed: number) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';

    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
    const numeric = Number(normalized);
    if (Number.isNaN(numeric) || numeric < TOP_LOWONGAN_MIN) return '';

    return String(Math.min(maxAllowed, numeric));
};

const parseTopLowonganValue = (value: string, maxAllowed: number) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return TOP_LOWONGAN_MIN;
    return Math.max(TOP_LOWONGAN_MIN, Math.min(maxAllowed, numeric));
};

const sanitizeMinimumScoreInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';

    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
    const numeric = Number(normalized);
    if (Number.isNaN(numeric)) return '';

    return String(Math.max(MINIMUM_SCORE_MIN, Math.min(MINIMUM_SCORE_MAX, numeric)));
};

const parseDateQuery = (value?: string | null): Date | null => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateQuery = (date?: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildOnboardingSteps = (
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

const buildInterviewRow = (application: ApplicantRecord): InterviewSchedule => {
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
    };
};

const buildOnboardingItem = (
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

export default function KelolaRekrutmenIndex({
    auth,
    applications,
    interviews,
    onboarding,
    slaSettings = defaultSLASettings,
    slaOverview = defaultSLAOverview,
    slaReminders = [],
}: RecruitmentPageProps) {
    const [applicationRows, setApplicationRows] = useState(applications);
    const [interviewRows, setInterviewRows] = useState(interviews);
    const [onboardingRows, setOnboardingRows] = useState(onboarding);
    const [activeTab, setActiveTab] = useState('applicants');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
    });
    const [isGlobalFilterHydrated, setIsGlobalFilterHydrated] = useState(false);

    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [interviewDetailOpen, setInterviewDetailOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRecord | null>(null);

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [updatingApplicantId, setUpdatingApplicantId] = useState<number | null>(null);
    const [autoShortlistTopN, setAutoShortlistTopN] = useState('3');
    const [autoShortlistMinScore, setAutoShortlistMinScore] = useState('70');
    const [autoShortlistEligibleOnly, setAutoShortlistEligibleOnly] = useState(true);
    const [isRunningAutoShortlist, setIsRunningAutoShortlist] = useState(false);
    const [slaSettingsForm, setSlaSettingsForm] = useState<RecruitmentSLASettings>(slaSettings);
    const [slaOverviewState, setSlaOverviewState] = useState<RecruitmentSLAOverview>(slaOverview);
    const [slaReminderRows, setSlaReminderRows] = useState<RecruitmentSLAReminder[]>(slaReminders);
    const [isSavingSLA, setIsSavingSLA] = useState(false);

    const totalLowonganAvailable = useMemo(() => {
        const uniquePositions = new Set<string>();
        applicationRows.forEach((application) => {
            const normalizedPosition = (application.position ?? '').trim().toLowerCase();
            if (normalizedPosition !== '') {
                uniquePositions.add(normalizedPosition);
            }
        });
        return uniquePositions.size;
    }, [applicationRows]);

    const autoShortlistTopNMax = Math.max(TOP_LOWONGAN_MIN, totalLowonganAvailable);

    useEffect(() => {
        setAutoShortlistTopN((previous) => {
            if (previous.trim() === '') return previous;
            return String(parseTopLowonganValue(previous, autoShortlistTopNMax));
        });
    }, [autoShortlistTopNMax]);

    useEffect(() => {
        setApplicationRows(applications);
    }, [applications]);

    useEffect(() => {
        setInterviewRows(interviews);
    }, [interviews]);

    useEffect(() => {
        setOnboardingRows(onboarding);
    }, [onboarding]);

    useEffect(() => {
        setSlaSettingsForm(slaSettings);
    }, [slaSettings]);

    useEffect(() => {
        setSlaOverviewState(slaOverview);
    }, [slaOverview]);

    useEffect(() => {
        setSlaReminderRows(slaReminders);
    }, [slaReminders]);

    useEffect(() => {
        if (!selectedApplicant) {
            return;
        }
        const refreshedApplicant = applicationRows.find(
            (application) => application.id === selectedApplicant.id,
        );
        if (refreshedApplicant && refreshedApplicant !== selectedApplicant) {
            setSelectedApplicant(refreshedApplicant);
        }
    }, [applicationRows, selectedApplicant]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let stored: Record<string, string> = {};
        try {
            const raw = window.localStorage.getItem(recruitmentFilterStorageKey);
            if (raw) {
                stored = JSON.parse(raw) as Record<string, string>;
            }
        } catch {
            stored = {};
        }

        const params = new URLSearchParams(window.location.search);
        const statusFromSource = params.get('status') || stored.status || 'all';
        const nextStatus = statusOrder.includes(statusFromSource as ApplicantStatus)
            ? statusFromSource
            : 'all';
        const nextSearch = params.get('q') || stored.q || '';
        const nextFrom = parseDateQuery(params.get('from') || stored.from || '');
        const nextTo = parseDateQuery(params.get('to') || stored.to || '');

        setStatusFilter(nextStatus);
        setSearchTerm(nextSearch);
        setDateRange({ from: nextFrom, to: nextTo });
        setIsGlobalFilterHydrated(true);
    }, []);

    useEffect(() => {
        if (!isGlobalFilterHydrated || typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const normalizedSearch = searchTerm.trim();
        const from = formatDateQuery(dateRange.from);
        const to = formatDateQuery(dateRange.to);

        if (statusFilter === 'all') params.delete('status');
        else params.set('status', statusFilter);

        if (normalizedSearch === '') params.delete('q');
        else params.set('q', normalizedSearch);

        if (from === '') params.delete('from');
        else params.set('from', from);

        if (to === '') params.delete('to');
        else params.set('to', to);

        const query = params.toString();
        const nextURL = `${window.location.pathname}${query ? `?${query}` : ''}`;
        window.history.replaceState({}, '', nextURL);

        window.localStorage.setItem(
            recruitmentFilterStorageKey,
            JSON.stringify({
                status: statusFilter,
                q: normalizedSearch,
                from,
                to,
            }),
        );
    }, [statusFilter, searchTerm, dateRange, isGlobalFilterHydrated]);

    // FILTER DATA
    const filteredByStatus =
        statusFilter === 'all'
            ? applicationRows
            : applicationRows.filter((application) => application.status === statusFilter);

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
    const visibleApplications = normalizedSearch
        ? filteredByDate.filter(
            (application) =>
                application.name.toLowerCase().includes(normalizedSearch) ||
                (application.division ?? '').toLowerCase().includes(normalizedSearch) ||
                application.position.toLowerCase().includes(normalizedSearch) ||
                application.email.toLowerCase().includes(normalizedSearch),
        )
        : filteredByDate;

    const statusSummary: StatusSummary = applicationRows.reduce((acc, application) => {
        acc[application.status as ApplicantStatus] =
            (acc[application.status as ApplicantStatus] ?? 0) + 1;
        return acc;
    }, {} as StatusSummary);

    const syncRelatedRows = (application: ApplicantRecord) => {
        setInterviewRows((prev) => {
            // Jika status masih Interview, tambahkan atau update data interview
            if (application.status === 'Interview') {
                const interviewRow = buildInterviewRow(application);
                const exists = prev.some((item) => item.application_id === application.id);
                if (!exists) {
                    return [interviewRow, ...prev];
                }
                return prev.map((item) =>
                    item.application_id === application.id ? interviewRow : item,
                );
            }
            // Jika status bukan Interview, tetap pertahankan riwayat interview
            // (jangan dihapus dari list)
            return prev;
        });

        setOnboardingRows((prev) => {
            if (application.status !== 'Hired') {
                return prev.filter((item) => item.application_id !== application.id);
            }

            const existing = prev.find((item) => item.application_id === application.id);
            const onboardingItem = buildOnboardingItem(application, existing);
            if (!existing) {
                return [onboardingItem, ...prev];
            }
            return prev.map((item) =>
                item.application_id === application.id ? onboardingItem : item,
            );
        });
    };

    // -----------------------------------------
    // UPDATE STATUS
    // -----------------------------------------
    const updateStatus = (
        applicantId: number,
        newStatus: ApplicantStatus,
        rejectionReason?: string,
    ) => {
        if (isUpdatingStatus) return;

        const previousApplicant =
            applicationRows.find((application) => application.id === applicantId) ?? null;
        if (!previousApplicant) {
            toast.error('Pelamar tidak ditemukan.');
            return;
        }

        const optimisticApplicant: ApplicantRecord = {
            ...previousApplicant,
            status: newStatus,
            rejection_reason:
                newStatus === 'Rejected' ? rejectionReason ?? null : null,
        };

        setUpdatingApplicantId(applicantId);
        setIsUpdatingStatus(true);
        setApplicationRows((prev) =>
            prev.map((application) =>
                application.id === applicantId
                    ? optimisticApplicant
                    : application,
            ),
        );
        setSelectedApplicant((prev) =>
            prev && prev.id === applicantId ? optimisticApplicant : prev,
        );
        syncRelatedRows(optimisticApplicant);

        router.put(
            route('super-admin.recruitment.update-status', applicantId),
            {
                status: newStatus,
                rejection_reason: rejectionReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    const successTitle =
                        newStatus === 'Rejected'
                            ? 'Pelamar berhasil ditolak.'
                            : 'Status pelamar berhasil diperbarui.';
                    toast.success(successTitle, {
                        description: `${optimisticApplicant.name} sekarang berstatus ${newStatus}.`,
                    });
                },
                onError: (errors) => {
                    setApplicationRows((prev) =>
                        prev.map((application) =>
                            application.id === applicantId ? previousApplicant : application,
                        ),
                    );
                    setSelectedApplicant((prev) =>
                        prev && prev.id === applicantId ? previousApplicant : prev,
                    );
                    syncRelatedRows(previousApplicant);

                    toast.error('Gagal memperbarui status.', {
                        description: getFirstErrorMessage(errors),
                    });
                },
                onFinish: () => {
                    setIsUpdatingStatus(false);
                    setUpdatingApplicantId(null);
                },
            }
        );
    };

    const handleStatusUpdate: ApplicantActionHandler = (applicantId, newStatus) => {
        updateStatus(applicantId, newStatus);
    };

    const handleReject: ApplicantRejectHandler = (id, reason) => {
        updateStatus(id, 'Rejected', reason);
    };

    const handleViewProfile = (application: ApplicantRecord) => {
        const optimisticApplicant =
            application.status === 'Applied'
                ? { ...application, status: 'Screening' as ApplicantStatus }
                : application;
        setSelectedApplicant(optimisticApplicant);
        setProfileOpen(true);

        // Auto-screening: if status is 'Applied', update to 'Screening'
        if (application.status === 'Applied' && application.id !== updatingApplicantId) {
            handleStatusUpdate(application.id, 'Screening');
        }
    };

    // -----------------------------------------
    // OPEN SCHEDULE INTERVIEW DIALOG
    // -----------------------------------------
    const handleOpenScheduleDialog = (application: ApplicantRecord) => {
        setSelectedApplicant(application);
        setScheduleOpen(true);
    };

    // -----------------------------------------
    // AFTER SUCCESS SUBMIT SCHEDULE
    // -----------------------------------------
    const handleScheduleSuccess = (
        applicantId: number,
        scheduleData: {
            date: string;
            time: string;
            end_time: string;
            mode: string;
            interviewer: string;
            meeting_link: string;
            notes: string;
        },
    ) => {
        let nextApplicant: ApplicantRecord | null = null;

        setApplicationRows((prev) =>
            prev.map((application) => {
                if (application.id !== applicantId) {
                    return application;
                }

                nextApplicant = {
                    ...application,
                    status: 'Interview',
                    has_interview_schedule: true,
                    interview_date: scheduleData.date,
                    interview_time: scheduleData.time,
                    interview_end_time: scheduleData.end_time,
                    interview_mode: scheduleData.mode as 'Online' | 'Offline',
                    interviewer_name: scheduleData.interviewer,
                    meeting_link: scheduleData.meeting_link || null,
                    interview_notes: scheduleData.notes,
                    rejection_reason: null,
                };
                return nextApplicant;
            }),
        );

        if (nextApplicant) {
            setSelectedApplicant((prev) =>
                prev && prev.id === applicantId ? nextApplicant : prev,
            );
            syncRelatedRows(nextApplicant);
        }

        setScheduleOpen(false);
        setSelectedApplicant(null);
    };

    const handleAcceptFromProfile = () => {
        if (!selectedApplicant) return;

        handleStatusUpdate(selectedApplicant.id, 'Hired');
        setProfileOpen(false);
    };

    const handleRejectFromProfile = (reason: string) => {
        if (!selectedApplicant) return;

        handleReject(selectedApplicant.id, reason);
        setProfileOpen(false);
    };

    const handleScheduleFromProfile = () => {
        if (!selectedApplicant) return;

        setProfileOpen(false);
        setScheduleOpen(true);
    };

    const handleViewInterviewDetails = () => {
        if (!selectedApplicant) return;

        setProfileOpen(false);
        setInterviewDetailOpen(true);
    };

    const handleOnboardingChecklistSaved = (
        applicationId: number,
        checklist: {
            contract_signed: boolean;
            inventory_handover: boolean;
            training_orientation: boolean;
        },
    ) => {
        setOnboardingRows((prev) =>
            prev.map((item) => {
                if (item.application_id !== applicationId) {
                    return item;
                }
                const steps = buildOnboardingSteps(
                    checklist.contract_signed,
                    checklist.inventory_handover,
                    checklist.training_orientation,
                );

                return {
                    ...item,
                    steps,
                    status: steps.every((step) => step.complete)
                        ? 'Selesai'
                        : 'In Progress',
                };
            }),
        );
    };

    const handleOnboardingConvertSuccess = (applicationId: number) => {
        setOnboardingRows((prev) =>
            prev.map((item) =>
                item.application_id === applicationId
                    ? { ...item, is_staff: true }
                    : item,
            ),
        );
    };

    const handleRunAutoShortlist = async () => {
        if (isRunningAutoShortlist) return;

        const topN = parseTopLowonganValue(autoShortlistTopN, autoShortlistTopNMax);
        const minScore = Math.max(MINIMUM_SCORE_MIN, Math.min(MINIMUM_SCORE_MAX, Number(autoShortlistMinScore) || 0));

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
        setAutoShortlistTopN(sanitizeTopLowonganInput(event.target.value, autoShortlistTopNMax));
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

    const normalizedRole = String(auth?.user?.role ?? '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    const isSuperAdminRole =
        normalizedRole === 'super admin' || normalizedRole === 'superadmin';
    const isHumanCapitalAdmin =
        auth?.user?.role === 'Admin' &&
        typeof auth?.user?.division === 'string' &&
        /human\s+(capital|resources)/i.test(auth?.user?.division ?? '');

    const breadcrumbs = isHumanCapitalAdmin
        ? [
            { label: 'Admin', href: route('admin-staff.dashboard') },
            { label: 'Recruitment & Onboarding' },
        ]
        : [
            { label: 'Super Admin', href: route('super-admin.dashboard') },
            { label: 'Recruitment & Onboarding' },
        ];

    // -----------------------------------------
    // RENDER PAGE
    // -----------------------------------------
    return (
        <>
            <Head title="Kelola Rekrutmen" />
            <SuperAdminLayout
                title="Recruitment & Onboarding"
                description="Kelola pelamar dan proses rekrutmen"
                breadcrumbs={breadcrumbs}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6 w-full">
                    <TabsList className="w-full justify-start overflow-x-auto p-0 h-auto bg-transparent gap-3 whitespace-nowrap">
                        <TabsTrigger
                            value="applicants"
                            className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <Users className="h-4 w-4" />
                            Daftar Pelamar
                        </TabsTrigger>
                        <TabsTrigger
                            value="interviews"
                            className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <Video className="h-4 w-4" />
                            Jadwal Interview
                        </TabsTrigger>
                        <TabsTrigger
                            value="onboarding"
                            className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <UserCheck className="h-4 w-4" />
                            Onboarding
                        </TabsTrigger>
                        <TabsTrigger
                            value="calendar"
                            className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <CalendarIcon className="h-4 w-4" />
                            Calendar
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="applicants">
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
                                            onChange={(event) => handleSLASettingChange('Applied', event.target.value)}
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
                                            onChange={(event) => handleSLASettingChange('Screening', event.target.value)}
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
                                            onChange={(event) => handleSLASettingChange('Interview', event.target.value)}
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
                                            onChange={(event) => handleSLASettingChange('Offering', event.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={handleSaveSLASettings}
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
                                                                {item.position} · {item.stage}
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
                                            onChange={handleTopLowonganChange}
                                            onBlur={handleTopLowonganBlur}
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
                                            onChange={handleMinimumScoreChange}
                                            onBlur={handleMinimumScoreBlur}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="shortlist-eligible-only"
                                                checked={autoShortlistEligibleOnly}
                                                onCheckedChange={(checked) => setAutoShortlistEligibleOnly(Boolean(checked))}
                                            />
                                            <label htmlFor="shortlist-eligible-only" className="cursor-pointer text-sm text-slate-700">
                                                Hanya kandidat yang eligible
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Button
                                        onClick={handleRunAutoShortlist}
                                        disabled={isRunningAutoShortlist}
                                        className="justify-start bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {isRunningAutoShortlist ? 'Memproses...' : 'Jalankan Auto Shortlist'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleExportScoreReport}
                                        className="justify-start border-slate-300"
                                    >
                                        <FileDown className="h-4 w-4 mr-2" />
                                        Export Laporan Skor (CSV)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleExportScoreReportPDF}
                                        className="justify-start border-slate-300"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Export Laporan Skor (PDF)
                                    </Button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Untuk evaluasi model, fairness, drift, dan audit trail, buka menu <span className="font-semibold text-slate-700">Recruitment &gt; Analytics Rekrutmen</span>.
                                </p>
                            </Card>
                        </div>

                        <ApplicantsTab
                            searchTerm={searchTerm}
                            onSearchTermChange={setSearchTerm}
                            statusFilter={statusFilter}
                            onStatusFilterChange={setStatusFilter}
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            statusOrder={statusOrder}
                            statusSummary={statusSummary}
                            visibleApplications={visibleApplications}
                            onStatusUpdate={handleStatusUpdate}
                            onReject={handleReject}
                            isUpdatingStatus={isUpdatingStatus}
                            updatingApplicantId={updatingApplicantId}
                            onScheduleInterview={handleOpenScheduleDialog}
                            onViewProfile={handleViewProfile}
                        />
                    </TabsContent>

                    <TabsContent value="interviews">
                        <InterviewsTab interviews={interviewRows} />
                    </TabsContent>

                    <TabsContent value="onboarding">
                        <OnboardingTab
                            items={onboardingRows}
                            onChecklistSaved={handleOnboardingChecklistSaved}
                            onConvertToStaffSuccess={handleOnboardingConvertSuccess}
                        />
                    </TabsContent>

                    <TabsContent value="calendar">
                        <RecruitmentCalendar interviews={interviewRows} isEmbedded />
                    </TabsContent>

                </Tabs>


                <ApplicantProfileDialog
                    open={profileOpen}
                    onOpenChange={setProfileOpen}
                    applicant={selectedApplicant}
                    onAccept={handleAcceptFromProfile}
                    onReject={handleRejectFromProfile}
                    onScheduleInterview={handleScheduleFromProfile}
                    onViewInterviewDetails={handleViewInterviewDetails}
                    isUpdatingStatus={isUpdatingStatus}
                />
                <ScheduleInterviewDialog
                    open={scheduleOpen}
                    onOpenChange={setScheduleOpen}
                    applicant={selectedApplicant}
                    onSuccessSubmit={handleScheduleSuccess}
                    existingInterviews={interviewRows}
                />
                <InterviewDetailDialog
                    applicant={interviewDetailOpen ? selectedApplicant : null}
                    onClose={() => setInterviewDetailOpen(false)}
                />
            </SuperAdminLayout>
        </>
    );
}
