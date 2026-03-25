export interface DashboardProps {
    stats: Record<'totalUsers' | 'superAdmins' | 'admins' | 'staff' | 'pelamar', number>;
    statChanges: Record<'totalUsers' | 'superAdmins' | 'admins' | 'staff' | 'pelamar', number>;
    activityData: { month: string; registrations: number; applications: number }[];
    recruitmentFunnel: Array<{
        key: string;
        label: string;
        value: number;
        conversion: number;
        dropOff: number;
        color: string;
    }>;
    staffStats: { total: number; active: number; inactive: number };
    religionData: { name: string; value: number; color: string }[];
    genderData: { name: string; value: number; percentage: number; color: string }[];
    educationData: { level: string; value: number }[];
    divisionApplicants: Array<{
        id: string;
        name: string;
        count: number;
        new: number;
    }>;
}
