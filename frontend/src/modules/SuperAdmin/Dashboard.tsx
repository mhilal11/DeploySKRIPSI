import { ActivityTrendSection } from '@/modules/SuperAdmin/components/dashboard/ActivityTrendSection';
import { DivisionApplicantsSection } from '@/modules/SuperAdmin/components/dashboard/DivisionApplicantsSection';
import { StaffStatisticsSection } from '@/modules/SuperAdmin/components/dashboard/StaffStatisticsSection';
import { StatCardsGrid } from '@/modules/SuperAdmin/components/dashboard/StatCardsGrid';
import type { DashboardProps } from '@/modules/SuperAdmin/components/dashboard/types';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Head } from '@/shared/lib/inertia';

const EMPTY_STATS: DashboardProps['stats'] = {
    totalUsers: 0,
    superAdmins: 0,
    admins: 0,
    staff: 0,
    pelamar: 0,
};

const EMPTY_STAFF_STATS: DashboardProps['staffStats'] = {
    total: 0,
    active: 0,
    inactive: 0,
};

export default function Dashboard({
    stats,
    statChanges,
    activityData,
    staffStats,
    religionData,
    genderData,
    educationData,
    divisionApplicants,
}: Partial<DashboardProps>) {
    const safeStats = stats ?? EMPTY_STATS;
    const safeStatChanges = statChanges ?? EMPTY_STATS;
    const safeActivityData = activityData ?? [];
    const safeStaffStats = staffStats ?? EMPTY_STAFF_STATS;
    const safeReligionData = religionData ?? [];
    const safeGenderData = genderData ?? [];
    const safeEducationData = educationData ?? [];
    const safeDivisionApplicants = divisionApplicants ?? [];

    const formatNumber = (value: number) =>
        Intl.NumberFormat('id-ID').format(value ?? 0);

    return (
        <SuperAdminLayout
            title="Super Admin Dashboard"
            description="Full system control and monitoring - PT. Lintas Data Prima HRIS"
            breadcrumbs={[
                { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Dashboard' },
            ]}
        >
            <Head title="Super Admin Dashboard" />

            <StatCardsGrid stats={safeStats} statChanges={safeStatChanges} />

            <DivisionApplicantsSection
                divisionApplicants={safeDivisionApplicants}
                formatNumber={formatNumber}
            />

            <StaffStatisticsSection
                staffStats={safeStaffStats}
                religionData={safeReligionData}
                genderData={safeGenderData}
                educationData={safeEducationData}
                formatNumber={formatNumber}
            />

            <ActivityTrendSection activityData={safeActivityData} />
        </SuperAdminLayout>
    );
}
