import { UserCircle, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

import ApplicationDetailDialog from '@/modules/Pelamar/components/ApplicationDetailDialog';
import ApplicationStatusSection from '@/modules/Pelamar/components/ApplicationStatusSection';
import DocumentsCard, {
    ApplicationItem,
} from '@/modules/Pelamar/components/dashboard/DocumentsCard';
import InfoHighlights from '@/modules/Pelamar/components/dashboard/InfoHighlights';
import QuickActions from '@/modules/Pelamar/components/dashboard/QuickActions';
import DashboardStatsCards from '@/modules/Pelamar/components/DashboardStatsCards';
import InterviewScheduleDialog from '@/modules/Pelamar/components/InterviewScheduleDialog';
import PelamarLayout from '@/modules/Pelamar/Layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Head, router, usePage } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';


interface DashboardStats {
    totalApplications: number;
    latestStatus?: string | null;
}

interface ApplicationStage {
    name: string;
    status: 'pending' | 'current' | 'completed';
    date: string;
}

interface ApplicationStatus {
    id: number;
    position: string;
    division: string;
    status: string;
    progress: number;
    stages: ApplicationStage[];
    rejection_reason?: string | null;
    updated_at_diff: string;
    submitted_at_formatted: string;
    interview?: {
        date: string;
        time: string;
        mode: string;
        link?: string | null;
        interviewer: string;
        notes?: string | null;
    } | null;
}

type DashboardPageProps = PageProps<{
    applicationsStatus: ApplicationStatus[];
    applications: ApplicationItem[];
    stats: DashboardStats;
    isProfileComplete?: boolean;
    showProfileReminder?: boolean;
}>;

export default function Dashboard({
    applicationsStatus = [],
    applications = [],
    stats = { totalApplications: 0, latestStatus: null },
    isProfileComplete = true,
    showProfileReminder = false,
}: DashboardPageProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const navigateToApplications = () =>
        router.visit(route('pelamar.applications'));

    const [detailApp, setDetailApp] = useState<ApplicationStatus | null>(null);
    const [interviewApp, setInterviewApp] = useState<ApplicationStatus | null>(null);
    const [profileReminderOpen, setProfileReminderOpen] = useState(showProfileReminder);

    useEffect(() => {
        setProfileReminderOpen(showProfileReminder);
    }, [showProfileReminder]);

    const safeApplicationsStatus = Array.isArray(applicationsStatus) ? applicationsStatus : [];
    const safeApplications = Array.isArray(applications) ? applications : [];
    const safeStats =
        stats && typeof stats === 'object'
            ? stats
            : { totalApplications: 0, latestStatus: null };

    // Calculate Stats
    const totalApplications = safeApplicationsStatus.length;
    const inProgress = safeApplicationsStatus.filter(
        (app) => !['Rejected', 'Hired'].includes(app.status)
    ).length;
    const rejected = safeApplicationsStatus.filter(
        (app) => app.status === 'Rejected'
    ).length;
    const hired = safeApplicationsStatus.filter(
        (app) => app.status === 'Hired'
    ).length;

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            Interview: 'bg-purple-100 text-purple-700 border-purple-200',
            Screening: 'bg-orange-100 text-orange-700 border-orange-200',
            Offering: 'bg-green-100 text-green-700 border-green-200',
            Rejected: 'bg-red-100 text-red-700 border-red-200',
            Applied: 'bg-blue-100 text-blue-700 border-blue-200',
            Hired: 'bg-green-100 text-green-700 border-green-200',
        };
        return (
            <Badge
                variant="outline"
                className={`${styles[status] || 'bg-gray-100 text-gray-700'} px-3 py-1`}
            >
                {status}
            </Badge>
        );
    };

    return (
        <>
            <Head title="Dashboard Pelamar" />
            <PelamarLayout
                title="Dashboard Pelamar"
                description="Selamat datang di portal rekrutmen PT. Lintas Data Prima"
                breadcrumbs={['Dashboard']}
            >
                {/* Header Section */}
                <div className="mb-8">
                    <p className="text-gray-600">
                        Pantau progres lamaran dan lanjutkan perjalanan karirmu.
                    </p>
                </div>

                {/* Stats Cards */}
                <DashboardStatsCards
                    totalApplications={totalApplications}
                    inProgress={inProgress}
                    rejected={rejected}
                    hired={hired}
                />

                {/* Application Status Section */}
                <ApplicationStatusSection
                    applicationsStatus={safeApplicationsStatus}
                    totalApplications={totalApplications}
                    inProgress={inProgress}
                    rejected={rejected}
                    hired={hired}
                    onNavigateToApplications={navigateToApplications}
                    onShowDetail={setDetailApp}
                    onShowInterview={setInterviewApp}
                    getStatusBadge={getStatusBadge}
                />

                {/* Documents Section */}
                <div className="mt-6">
                    <DocumentsCard
                        applications={safeApplications}
                        onNewApplication={navigateToApplications}
                    />
                </div>

                <InfoHighlights
                    highlights={[
                        {
                            tone: 'warning',
                            message:
                                safeStats.totalApplications === 0
                                    ? 'Ajukan lamaran pertama Anda untuk memulai proses rekrutmen.'
                                    : 'Pantau perkembangan lamaran Anda secara berkala.',
                        },
                        {
                            tone: 'info',
                            message:
                                'Periksa email secara rutin agar tidak melewatkan undangan atau pembaruan proses seleksi.',
                        },
                        {
                            tone: 'success',
                            message:
                                safeStats.latestStatus
                                    ? `Status lamaran terbaru Anda: ${safeStats.latestStatus}.`
                                    : 'Setelah mengirim lamaran, status terbaru akan ditampilkan di sini.',
                        },
                    ]}
                />

                <QuickActions
                    actions={[
                        { label: 'Lihat Lamaran', onClick: navigateToApplications },
                        { label: 'Upload Dokumen', onClick: navigateToApplications },
                        {
                            label: 'Update Profile',
                            onClick: () => router.visit(route('pelamar.profile')),
                        },
                    ]}
                />

                {/* Dialogs */}
                <ApplicationDetailDialog
                    application={detailApp}
                    onClose={() => setDetailApp(null)}
                    getStatusBadge={getStatusBadge}
                />

                <InterviewScheduleDialog
                    application={interviewApp}
                    onClose={() => setInterviewApp(null)}
                />

                {/* Profile Reminder Modal for New Users */}
                <AlertDialog open={profileReminderOpen} onOpenChange={setProfileReminderOpen}>
                    <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                                <UserCircle className="h-10 w-10 text-blue-600" />
                            </div>
                            <AlertDialogTitle className="text-center text-xl">
                                Selamat Datang!
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild className="text-center text-gray-600">
                                <div>
                                    Sebelum mengajukan lamaran pekerjaan, lengkapi profil Anda terlebih dahulu.
                                    <br /><br />
                                    <span className="font-medium text-gray-700">
                                        Data yang perlu dilengkapi:
                                    </span>
                                    <ul className="mt-2 text-left text-sm space-y-1">
                                        <li> Data Pribadi (nama, kontak, alamat)</li>
                                        <li> Pendidikan (minimal 1 data pendidikan)</li>
                                        <li> Pengalaman Kerja (opsional)</li>
                                    </ul>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                            <AlertDialogAction
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => {
                                    setProfileReminderOpen(false);
                                    router.visit(route('pelamar.profile'));
                                }}
                            >
                                Lengkapi Profil
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </PelamarLayout>
        </>
    );
}




