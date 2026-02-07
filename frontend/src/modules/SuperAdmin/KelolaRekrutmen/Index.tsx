// src/Pages/SuperAdmin/Recruitment/KelolaRekrutmenIndex.tsx

import { Calendar as CalendarIcon, Users, Video, UserCheck } from 'lucide-react';
import { useState } from 'react';

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

export default function KelolaRekrutmenIndex({
    auth,
    applications,
    statusOptions,
    interviews,
    onboarding,
}: RecruitmentPageProps) {
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

    // FILTER DATA
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
    const visibleApplications = normalizedSearch
        ? filteredByDate.filter(
            (application) =>
                application.name.toLowerCase().includes(normalizedSearch) ||
                application.position.toLowerCase().includes(normalizedSearch) ||
                application.email.toLowerCase().includes(normalizedSearch),
        )
        : filteredByDate;

    const statusSummary: StatusSummary = applications.reduce((acc, application) => {
        acc[application.status as ApplicantStatus] =
            (acc[application.status as ApplicantStatus] ?? 0) + 1;
        return acc;
    }, {} as StatusSummary);

    // -----------------------------------------
    // UPDATE STATUS
    // -----------------------------------------
    const handleStatusUpdate: ApplicantActionHandler = (applicantId, newStatus) => {
        if (isUpdatingStatus) return;

        setUpdatingApplicantId(applicantId);
        setIsUpdatingStatus(true);

        router.put(
            route('super-admin.recruitment.update-status', applicantId),
            { status: newStatus },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsUpdatingStatus(false);
                    setUpdatingApplicantId(null);
                },
            }
        );
    };

    const handleReject: ApplicantRejectHandler = (id, reason) => {
        router.put(
            route('super-admin.recruitment.update-status', id),
            { status: 'Rejected', rejection_reason: reason },
            { preserveScroll: true }
        );
    };

    const handleViewProfile = (application: ApplicantRecord) => {
        setSelectedApplicant(application);
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
    const handleScheduleSuccess = (applicantId: number) => {
        handleStatusUpdate(applicantId, 'Interview');
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
                        <InterviewsTab interviews={interviews} />
                    </TabsContent>

                    <TabsContent value="onboarding">
                        <OnboardingTab items={onboarding} />
                    </TabsContent>

                    <TabsContent value="calendar">
                        <RecruitmentCalendar interviews={interviews} isEmbedded />
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
                    existingInterviews={interviews}
                />
                <InterviewDetailDialog
                    applicant={interviewDetailOpen ? selectedApplicant : null}
                    onClose={() => setInterviewDetailOpen(false)}
                />
            </SuperAdminLayout>
        </>
    );
}




