import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { router } from '@/shared/lib/inertia';

import {
  buildInterviewRow,
  buildOnboardingItem,
  buildOnboardingSteps,
  buildStatusSummary,
  buildVisibleApplications,
  completedInterviewStatuses,
  getFirstErrorMessage,
  inProgressApplicantStatuses,
  formatDateQuery,
  parseDateQuery,
  recruitmentFilterStorageKey,
  statusOrder,
} from '../components/recruitment-index/utils';
import {
  ApplicantActionHandler,
  ApplicantRecord,
  ApplicantRejectHandler,
  ApplicantStatus,
  InterviewSchedule,
  OnboardingItem,
} from '../types';

interface UseRecruitmentPipelineStateParams {
  applications: ApplicantRecord[];
  interviews: InterviewSchedule[];
  onboarding: OnboardingItem[];
  onSidebarNotificationsChange: (notifications: Record<string, number>) => void;
}

export function useRecruitmentPipelineState({
  applications,
  interviews,
  onboarding,
  onSidebarNotificationsChange,
}: UseRecruitmentPipelineStateParams) {
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
  const [isDeletingApplication, setIsDeletingApplication] = useState(false);
  const [deletingApplicationId, setDeletingApplicationId] = useState<number | null>(null);

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
    const from = formatDateQuery(dateRange.from);
    const to = formatDateQuery(dateRange.to);

    if (statusFilter === 'all') params.delete('status');
    else params.set('status', statusFilter);

    params.delete('q');

    if (from === '') params.delete('from');
    else params.set('from', from);

    if (to === '') params.delete('to');
    else params.set('to', to);

    const query = params.toString();
    const nextURL = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', nextURL);
  }, [statusFilter, dateRange, isGlobalFilterHydrated]);

  useEffect(() => {
    if (!isGlobalFilterHydrated || typeof window === 'undefined') {
      return;
    }

    const from = formatDateQuery(dateRange.from);
    const to = formatDateQuery(dateRange.to);
    const normalizedSearch = searchTerm.trim();
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

  const visibleApplications = useMemo(
    () => buildVisibleApplications(applicationRows, statusFilter, dateRange, searchTerm),
    [applicationRows, statusFilter, dateRange, searchTerm],
  );

  const statusSummary = useMemo(
    () => buildStatusSummary(applicationRows),
    [applicationRows],
  );

  const applicantsInProgressCount = useMemo(
    () =>
      applicationRows.filter((application) =>
        inProgressApplicantStatuses.includes(application.status),
      ).length,
    [applicationRows],
  );

  const interviewsInProgressCount = useMemo(
    () =>
      interviewRows.filter(
        (interview) =>
          !interview.status ||
          !completedInterviewStatuses.has(interview.status as ApplicantStatus),
      ).length,
    [interviewRows],
  );

  const onboardingInProgressCount = useMemo(
    () => onboardingRows.filter((item) => item.status !== 'Selesai' || !item.is_staff).length,
    [onboardingRows],
  );

  const syncRelatedRows = (application: ApplicantRecord) => {
    setInterviewRows((prev) => {
      const interviewRow = buildInterviewRow(application);
      const index = prev.findIndex((item) => item.application_id === application.id);

      if (index >= 0) {
        return prev.map((item) =>
          item.application_id === application.id ? interviewRow : item,
        );
      }

      if (application.status === 'Interview' || application.has_interview_schedule) {
        return [interviewRow, ...prev];
      }

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
      rejection_reason: newStatus === 'Rejected' ? rejectionReason ?? null : null,
    };

    setUpdatingApplicantId(applicantId);
    setIsUpdatingStatus(true);
    setApplicationRows((prev) =>
      prev.map((application) =>
        application.id === applicantId ? optimisticApplicant : application,
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
        onSuccess: (data) => {
          if (data?.sidebarNotifications && typeof data.sidebarNotifications === 'object') {
            onSidebarNotificationsChange(
              data.sidebarNotifications as Record<string, number>,
            );
          }
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
      },
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

    if (application.status === 'Applied' && application.id !== updatingApplicantId) {
      handleStatusUpdate(application.id, 'Screening');
    }
  };

  const handleDeleteApplication = (application: ApplicantRecord) => {
    if (isDeletingApplication) {
      return;
    }

    setIsDeletingApplication(true);
    setDeletingApplicationId(application.id);

    router.delete(route('super-admin.recruitment.destroy', application.id), {}, {
      preserveScroll: true,
      onSuccess: (responseData) => {
        setApplicationRows((prev) =>
          prev.filter((row) => row.id !== application.id),
        );
        setInterviewRows((prev) =>
          prev.filter((row) => row.application_id !== application.id),
        );
        setOnboardingRows((prev) =>
          prev.filter((row) => row.application_id !== application.id),
        );
        setSelectedApplicant((prev) => {
          if (!prev) {
            return prev;
          }
          return prev.id === application.id ? null : prev;
        });
        setProfileOpen(false);
        setScheduleOpen(false);
        setInterviewDetailOpen(false);

        if (responseData?.sidebarNotifications && typeof responseData.sidebarNotifications === 'object') {
          onSidebarNotificationsChange(
            responseData.sidebarNotifications as Record<string, number>,
          );
        }

        toast.success('Lamaran berhasil dihapus.', {
          description: `Lamaran ${application.name} untuk posisi ${application.position} telah dihapus.`,
        });
      },
      onError: (errors) => {
        toast.error('Gagal menghapus lamaran.', {
          description: getFirstErrorMessage(errors),
        });
      },
      onFinish: () => {
        setIsDeletingApplication(false);
        setDeletingApplicationId(null);
      },
    });
  };

  const handleOpenScheduleDialog = (application: ApplicantRecord) => {
    setSelectedApplicant(application);
    setScheduleOpen(true);
  };

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
          status: steps.every((step) => step.complete) ? 'Selesai' : 'In Progress',
        };
      }),
    );
  };

  const handleOnboardingConvertSuccess = (applicationId: number) => {
    setOnboardingRows((prev) =>
      prev.map((item) =>
        item.application_id === applicationId ? { ...item, is_staff: true } : item,
      ),
    );
  };

  return {
    applicationRows,
    interviewRows,
    onboardingRows,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    statusSummary,
    visibleApplications,
    applicantsInProgressCount,
    interviewsInProgressCount,
    onboardingInProgressCount,
    scheduleOpen,
    setScheduleOpen,
    profileOpen,
    setProfileOpen,
    interviewDetailOpen,
    setInterviewDetailOpen,
    selectedApplicant,
    isUpdatingStatus,
    updatingApplicantId,
    isDeletingApplication,
    deletingApplicationId,
    handleStatusUpdate,
    handleReject,
    handleDeleteApplication,
    handleViewProfile,
    handleOpenScheduleDialog,
    handleScheduleSuccess,
    handleAcceptFromProfile,
    handleRejectFromProfile,
    handleScheduleFromProfile,
    handleViewInterviewDetails,
    handleOnboardingChecklistSaved,
    handleOnboardingConvertSuccess,
  };
}
