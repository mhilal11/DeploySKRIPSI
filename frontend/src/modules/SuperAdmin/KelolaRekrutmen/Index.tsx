// src/Pages/SuperAdmin/Recruitment/KelolaRekrutmenIndex.tsx

import { Calendar as CalendarIcon, Users, Video, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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
    statusOptions,
    interviews,
    onboarding,
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

    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [interviewDetailOpen, setInterviewDetailOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRecord | null>(null);

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [updatingApplicantId, setUpdatingApplicantId] = useState<number | null>(null);

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
            if (application.status !== 'Interview') {
                return prev.filter((item) => item.application_id !== application.id);
            }

            const interviewRow = buildInterviewRow(application);
            const exists = prev.some((item) => item.application_id === application.id);
            if (!exists) {
                return [interviewRow, ...prev];
            }
            return prev.map((item) =>
                item.application_id === application.id ? interviewRow : item,
            );
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
                    <TabsList className="w-full justify-start p-0 h-auto bg-transparent gap-3">
                        <TabsTrigger
                            value="applicants"
                            className="rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <Users className="h-4 w-4" />
                            Daftar Pelamar
                        </TabsTrigger>
                        <TabsTrigger
                            value="interviews"
                            className="rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <Video className="h-4 w-4" />
                            Jadwal Interview
                        </TabsTrigger>
                        <TabsTrigger
                            value="onboarding"
                            className="rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <UserCheck className="h-4 w-4" />
                            Onboarding
                        </TabsTrigger>
                        <TabsTrigger
                            value="calendar"
                            className="rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
                        >
                            <CalendarIcon className="h-4 w-4" />
                            Calendar
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="applicants">
                        <ApplicantsTab
                            statusOptions={statusOptions}
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




