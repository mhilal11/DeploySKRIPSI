import {
    AlertCircle,
    Briefcase,
    Calendar,
    Mail,
    TrendingDown,
    TrendingUp,
    UserPlus,
    Users,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Head, Link, usePage } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';


type IconKey = 'users' | 'briefcase' | 'userPlus' | 'mail' | 'alert';

interface AdminHrDashboardProps extends Record<string, unknown> {
    stats: Array<{
        label: string;
        icon: IconKey;
        value: number;
        change: number;
        trend: 'up' | 'down';
    }>;
    recruitmentData: { month: string; applied: number; hired: number }[];
    turnoverData: { name: string; value: number; color: string }[];
    recentActivities: { title: string; desc: string; time: string; type: string }[];
    upcomingInterviews: { name: string; position: string; time: string; date: string }[];
}

const iconMap: Record<IconKey, typeof Users> = {
    users: Users,
    briefcase: Briefcase,
    userPlus: UserPlus,
    mail: Mail,
    alert: AlertCircle,
};

const activityColors: Record<string, string> = {
    interview: 'bg-blue-500',
    mail: 'bg-purple-500',
    applicant: 'bg-emerald-500',
    complaint: 'bg-red-500',
    termination: 'bg-orange-500',
    success: 'bg-green-500',
};

export default function AdminHrDashboard() {
    const {
        props: { auth, stats, recruitmentData, turnoverData, recentActivities, upcomingInterviews },
    } = usePage<PageProps<AdminHrDashboardProps>>();
    const isHumanCapitalAdmin =
        auth?.user?.role === 'Admin' &&
        typeof auth.user.division === 'string' &&
        /human\s+(capital|resources)/i.test(auth.user.division);

    return (
        <SuperAdminLayout
            title="Dashboard Admin HRD"
            description="Selamat datang di sistem manajemen SDM PT. Lintas Data Prima"
            breadcrumbs={[
                isHumanCapitalAdmin
                    ? { label: 'Admin', href: route('admin-staff.dashboard') }
                    : { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Admin HRD' },
            ]}
        >
            <Head title="Admin HRD" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat) => {
                    const Icon = iconMap[stat.icon];
                    const trendUp = stat.trend === 'up';
                    return (
                        <Card key={stat.label} className="p-6 shadow-sm transition hover:shadow-lg">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-lg bg-blue-50 p-3">
                                    <Icon className="h-5 w-5 text-blue-900" />
                                </div>
                                {trendUp ? (
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-5 w-5 text-red-500" />
                                )}
                            </div>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                            <div className="mt-2 flex items-end gap-2">
                                <span className="text-2xl font-semibold text-blue-900">
                                    {Intl.NumberFormat('id-ID').format(stat.value)}
                                </span>
                                <span className={`text-sm ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                                    {stat.change > 0 ? `+${stat.change}` : stat.change}
                                </span>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-blue-900">Rekrutmen & Penerimaan</h3>
                    {recruitmentData.length === 0 ? (
                        <EmptyState message="Belum ada data rekrutmen." />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={recruitmentData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="applied" fill="#3b82f6" name="Pelamar" />
                                <Bar dataKey="hired" fill="#1e3a8a" name="Diterima" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-blue-900">Status Karyawan</h3>
                    {turnoverData.every((item) => item.value === 0) ? (
                        <EmptyState message="Belum ada data turnover." />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={turnoverData}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    outerRadius={90}
                                >
                                    {turnoverData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-blue-900">Aktivitas Terbaru</h3>
                    {recentActivities.length === 0 ? (
                        <EmptyState message="Belum ada aktivitas terbaru." />
                    ) : (
                        <div className="space-y-4">
                            {recentActivities.map((activity, index) => (
                                <div key={`${activity.title}-${index}`} className="flex gap-4 border-b pb-4 last:border-b-0">
                                    <div
                                        className={`mt-2 h-2 w-2 rounded-full ${
                                            activityColors[activity.type] ?? 'bg-blue-500'
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">{activity.title}</p>
                                        <p className="text-sm text-slate-500">{activity.desc}</p>
                                    </div>
                                    <span className="text-xs text-slate-400">{activity.time}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-blue-900">Jadwal Interview</h3>
                    {upcomingInterviews.length === 0 ? (
                        <EmptyState message="Belum ada interview terjadwal." />
                    ) : (
                        <div className="space-y-4">
                            {upcomingInterviews.map((interview) => (
                                <div
                                    key={`${interview.name}-${interview.time}`}
                                    className="flex items-center gap-4 rounded-lg bg-slate-50 p-4"
                                >
                                    <div className="rounded-lg bg-blue-900 p-3 text-white">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">{interview.name}</p>
                                        <p className="text-sm text-slate-500">{interview.position}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-blue-900">{interview.time}</p>
                                        <p className="text-xs text-slate-500">{interview.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button asChild variant="outline" className="mt-4 w-full">
                        <Link href={route('super-admin.recruitment')}>Lihat Semua Jadwal</Link>
                    </Button>
                </Card>
            </div>

            <div>
                <h3 className="mb-4 text-lg font-semibold text-blue-900">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Button asChild className="bg-blue-900 hover:bg-blue-800">
                        <Link href={route('super-admin.recruitment')}>Review Pelamar</Link>
                    </Button>
                    <Button asChild className="bg-blue-900 hover:bg-blue-800">
                        <Link href={route('super-admin.letters.index')}>Kelola Surat</Link>
                    </Button>
                    <Button asChild className="bg-blue-900 hover:bg-blue-800">
                        <Link href={route('super-admin.staff.index')}>Kelola Offboarding</Link>
                    </Button>
                    <Button asChild className="bg-blue-900 hover:bg-blue-800">
                        <Link href={route('super-admin.dashboard')}>Lihat Ringkasan</Link>
                    </Button>
                </div>
            </div>
        </SuperAdminLayout>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">{message}</p>
        </div>
    );
}




