import AdminStaffLayout from '@/modules/AdminStaff/Layout';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Head, usePage } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';

interface RecruitmentPageProps extends Record<string, unknown>{
    applications: Array<{
        id: number;
        name: string;
        position: string;
        status: string;
        submittedAt: string;
        email: string;
        phone?: string | null;
    }>;
    statusBreakdown: Array<{
        status: string;
        count: number;
    }>;
}

const statusColor: Record<string, string> = {
    Applied: 'bg-blue-100 text-blue-700',
    Screening: 'bg-amber-100 text-amber-700',
    Interview: 'bg-purple-100 text-purple-700',
    Offering: 'bg-emerald-100 text-emerald-700',
    Hired: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-rose-100 text-rose-700',
};

export default function AdminStaffRecruitment() {
    const {
        props: { applications, statusBreakdown },
    } = usePage<PageProps<RecruitmentPageProps>>();

    return (
        <AdminStaffLayout
            title="Rekrutmen Baru"
            description="Pantau pelamar paling terbaru"
            breadcrumbs={[
                { label: 'Dashboard', href: route('admin-staff.dashboard') },
                { label: 'Rekrutmen Baru' },
            ]}
        >
            <Head title="Rekrutmen Baru" />

            {/* STATUS OVERVIEW */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {statusBreakdown.map((item) => (
                    <Card key={item.status} className="p-5 text-center md:text-left">
                        <p className="text-sm text-slate-500">{item.status}</p>
                        <p className="text-2xl font-semibold text-blue-900">{item.count}</p>
                    </Card>
                ))}
            </div>

            {/* LIST PELAMAR */}
            <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-blue-900">Daftar Pelamar</h3>

                {applications.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                        Belum ada pelamar baru.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((candidate) => (
                            <div key={candidate.id} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-lg font-semibold text-slate-900 break-words">
                                            {candidate.name}
                                        </p>
                                        <p className="text-sm text-slate-500 break-words">
                                            {candidate.position}
                                        </p>
                                    </div>

                                    <Badge
                                        className={statusColor[candidate.status] ?? 'bg-slate-100 text-slate-700'}
                                    >
                                        {candidate.status}
                                    </Badge>
                                </div>

                                <div className="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-3">
                                    <p>Email: {candidate.email}</p>
                                    {candidate.phone && <p>Telp: {candidate.phone}</p>}
                                    <p>Diajukan: {candidate.submittedAt}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </AdminStaffLayout>
    );
}




