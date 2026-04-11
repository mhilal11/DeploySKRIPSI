// src/Pages/SuperAdmin/Recruitment/KelolaRekrutmenIndex.tsx

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Tabs, TabsContent } from '@/shared/components/ui/tabs';
import { Head, usePageManager } from '@/shared/lib/inertia';

import ApplicantProfileDialog from './components/ApplicantProfileDialog';
import ApplicantsTab from './components/ApplicantsTab';
import InterviewDetailDialog from './components/InterviewDetailDialog';
import InterviewsTab from './components/InterviewsTab';
import OnboardingTab from './components/OnboardingTab';
import { RecruitmentTabsHeader } from './components/recruitment-index/RecruitmentTabsHeader';
import { defaultSLASettings, statusOrder } from './components/recruitment-index/utils';
import { RecruitmentCalendar } from './components/RecruitmentCalendar';
import ScheduleInterviewDialog from './components/ScheduleInterviewDialog';
import { useRecruitmentPipelineState } from './hooks/useRecruitmentPipelineState';
import { useRecruitmentScoringControls } from './hooks/useRecruitmentScoringControls';
import {
  RecruitmentPageProps,
  RecruitmentSLAOverview,
} from './types';

const defaultSLAOverview: RecruitmentSLAOverview = {
  active_applications: 0,
  on_track_count: 0,
  warning_count: 0,
  overdue_count: 0,
  compliance_rate: 100,
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
  const { setSidebarNotifications } = usePageManager();

  const pipeline = useRecruitmentPipelineState({
    applications,
    interviews,
    onboarding,
    onSidebarNotificationsChange: setSidebarNotifications,
  });

  const scoring = useRecruitmentScoringControls({
    statusFilter: pipeline.statusFilter,
    slaSettings,
    slaOverview,
    slaReminders,
  });

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

  return (
    <>
      <Head title="Kelola Rekrutmen" />
      <SuperAdminLayout
        title="Recruitment & Onboarding"
        description="Kelola pelamar dan proses rekrutmen"
        breadcrumbs={breadcrumbs}
      >
        <Tabs
          value={pipeline.activeTab}
          onValueChange={pipeline.setActiveTab}
          className="mb-6 w-full"
        >
          <RecruitmentTabsHeader
            applicantsInProgressCount={pipeline.applicantsInProgressCount}
            interviewsInProgressCount={pipeline.interviewsInProgressCount}
            onboardingInProgressCount={pipeline.onboardingInProgressCount}
          />

          <TabsContent value="applicants">
            <ApplicantsTab
              searchTerm={pipeline.searchTerm}
              onSearchTermChange={pipeline.setSearchTerm}
              statusFilter={pipeline.statusFilter}
              onStatusFilterChange={pipeline.setStatusFilter}
              dateRange={pipeline.dateRange}
              onDateRangeChange={pipeline.setDateRange}
              statusOrder={statusOrder}
              statusSummary={pipeline.statusSummary}
              visibleApplications={pipeline.visibleApplications}
              onStatusUpdate={pipeline.handleStatusUpdate}
              onReject={pipeline.handleReject}
              isUpdatingStatus={pipeline.isUpdatingStatus}
              updatingApplicantId={pipeline.updatingApplicantId}
              onScheduleInterview={pipeline.handleOpenScheduleDialog}
              onViewProfile={pipeline.handleViewProfile}
              slaOverviewState={scoring.slaOverviewState}
              slaSettingsForm={scoring.slaSettingsForm}
              slaReminderRows={scoring.slaReminderRows}
              onSLASettingChange={scoring.handleSLASettingChange}
              onSaveSLASettings={scoring.handleSaveSLASettings}
              isSavingSLA={scoring.isSavingSLA}
              onExportScoreReport={scoring.handleExportScoreReport}
              onExportScoreReportPDF={scoring.handleExportScoreReportPDF}
            />
          </TabsContent>

          <TabsContent value="interviews">
            <InterviewsTab interviews={pipeline.interviewRows} />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingTab
              items={pipeline.onboardingRows}
              onChecklistSaved={pipeline.handleOnboardingChecklistSaved}
              onConvertToStaffSuccess={pipeline.handleOnboardingConvertSuccess}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <RecruitmentCalendar interviews={pipeline.interviewRows} isEmbedded />
          </TabsContent>
        </Tabs>

        <ApplicantProfileDialog
          open={pipeline.profileOpen}
          onOpenChange={pipeline.setProfileOpen}
          applicant={pipeline.selectedApplicant}
          onAccept={pipeline.handleAcceptFromProfile}
          onReject={pipeline.handleRejectFromProfile}
          onScheduleInterview={pipeline.handleScheduleFromProfile}
          onViewInterviewDetails={pipeline.handleViewInterviewDetails}
          isUpdatingStatus={pipeline.isUpdatingStatus}
        />
        <ScheduleInterviewDialog
          open={pipeline.scheduleOpen}
          onOpenChange={pipeline.setScheduleOpen}
          applicant={pipeline.selectedApplicant}
          onSuccessSubmit={pipeline.handleScheduleSuccess}
          existingInterviews={pipeline.interviewRows}
        />
        <InterviewDetailDialog
          applicant={pipeline.interviewDetailOpen ? pipeline.selectedApplicant : null}
          onClose={() => pipeline.setInterviewDetailOpen(false)}
        />
      </SuperAdminLayout>
    </>
  );
}
