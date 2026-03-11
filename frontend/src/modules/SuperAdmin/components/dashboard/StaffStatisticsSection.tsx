import { GraduationCap, UserCheck, Users, UserX } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import type { DashboardProps } from '@/modules/SuperAdmin/components/dashboard/types';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';


type StaffStatisticsSectionProps = {
    staffStats: DashboardProps['staffStats'];
    religionData: DashboardProps['religionData'];
    genderData: DashboardProps['genderData'];
    educationData: DashboardProps['educationData'];
    formatNumber: (value: number) => string;
};

export function StaffStatisticsSection({
    staffStats,
    religionData,
    genderData,
    educationData,
    formatNumber,
}: StaffStatisticsSectionProps) {
    const maleRatio = genderData.find((item) =>
        item.name.toLowerCase().includes('laki'),
    );
    const femaleRatio = genderData.find((item) =>
        item.name.toLowerCase().includes('perempuan'),
    );
    const genderRatioText =
        maleRatio && femaleRatio
            ? `Laki-laki : Perempuan = ${maleRatio.percentage}% : ${femaleRatio.percentage}%`
            : 'Data gender belum tersedia';

    return (
        <section className="mt-8 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                        Statistik Staff
                    </h3>
                    <p className="text-xs text-slate-500">
                        Demografi dan distribusi staff PT. Lintas Data Prima
                    </p>
                </div>
                <Badge className="bg-blue-900 text-white">
                    <UserCheck className="h-2.5 w-2.5" />
                    <span className="text-[10px] font-medium">
                        {formatNumber(staffStats.total)} Total Staff
                    </span>
                </Badge>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-500 p-2">
                            <UserCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Staff Aktif</p>
                            <p className="text-xl font-semibold text-blue-900">
                                {formatNumber(staffStats.active)}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500 p-2">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Total Staff</p>
                            <p className="text-xl font-semibold text-blue-900">
                                {formatNumber(staffStats.total)}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-500 p-2">
                            <UserX className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Staff Tidak Aktif</p>
                            <p className="text-xl font-semibold text-blue-900">
                                {formatNumber(staffStats.inactive)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="p-4">
                    <h3 className="mb-3 text-sm font-semibold text-blue-900">Berdasarkan Agama</h3>
                    {religionData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={150} debounce={300}>
                                <PieChart>
                                    <Pie
                                        data={religionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={70}
                                        dataKey="value"
                                    >
                                        {religionData.map((entry, index) => (
                                            <Cell
                                                key={entry.name + index}
                                                fill={entry.color}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-3 space-y-1.5 text-xs">
                                {religionData.map((item, index) => (
                                    <div
                                        key={`${item.name}-${index}`}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-slate-700">
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className="font-medium text-slate-900">
                                            {formatNumber(item.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-500">
                            Belum ada data agama staff yang tersedia.
                        </p>
                    )}
                </Card>

                <Card className="p-4">
                    <h3 className="mb-3 text-sm font-semibold text-blue-900">Berdasarkan Jenis Kelamin</h3>
                    {genderData.length > 0 ? (
                        <>
                            <div className="space-y-4">
                                {genderData.map((item, index) => (
                                    <div key={`${item.name}-${index}`}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-3 w-3 rounded"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="text-slate-900">
                                                    {item.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-slate-900">
                                                    {formatNumber(item.value)}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] text-slate-600"
                                                >
                                                    {item.percentage}%
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-200">
                                            <div
                                                className="h-2 rounded-full transition-all"
                                                style={{
                                                    width: `${item.percentage}%`,
                                                    backgroundColor: item.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
                                <p className="font-medium text-blue-900">Rasio Gender</p>
                                <p className="mt-0.5 text-slate-600">
                                    {genderRatioText}
                                </p>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-500">
                            Belum ada data gender staff yang tersedia.
                        </p>
                    )}
                </Card>

                <Card className="p-4">
                    <h3 className="mb-3 text-sm font-semibold text-blue-900">Berdasarkan Pendidikan</h3>
                    {educationData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={150} debounce={300}>
                                <BarChart data={educationData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="level" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#1e3a8a" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-3 space-y-1.5">
                                {educationData.map((item, index) => (
                                    <div
                                        key={`${item.level}-${index}`}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 p-1.5 text-xs"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <GraduationCap className="h-3 w-3 text-blue-900" />
                                            <span className="text-slate-900">
                                                {item.level}
                                            </span>
                                        </div>
                                        <Badge variant="outline">
                                            {formatNumber(item.value)} orang
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-500">
                            Belum ada data pendidikan staff yang tersedia.
                        </p>
                    )}
                </Card>
            </div>
        </section>
    );
}
