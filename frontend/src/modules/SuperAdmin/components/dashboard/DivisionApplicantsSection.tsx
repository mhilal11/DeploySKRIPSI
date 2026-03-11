import { TrendingUp, Users } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from 'recharts';

import type { DashboardProps } from '@/modules/SuperAdmin/components/dashboard/types';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';


type DivisionApplicantsSectionProps = {
    divisionApplicants: DashboardProps['divisionApplicants'];
    formatNumber: (value: number) => string;
};

export function DivisionApplicantsSection({
    divisionApplicants,
    formatNumber,
}: DivisionApplicantsSectionProps) {
    return (
        <section className="mt-8 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-blue-900">Total Pendaftar per Divisi</h3>
                    <p className="text-xs text-slate-500">Monitoring jumlah pelamar berdasarkan divisi</p>
                </div>
            </div>

            {divisionApplicants.length > 0 ? (
                <Tabs defaultValue={divisionApplicants[0].id} className="w-full">
                    <TabsList className="mb-3 flex h-auto w-full flex-wrap justify-start gap-1.5 border border-slate-200 bg-white p-1">
                        {divisionApplicants.map((division) => (
                            <TabsTrigger
                                key={division.id}
                                value={division.id}
                                className="rounded-md px-3 py-1.5 text-xs transition-all data-[state=active]:bg-blue-900 data-[state=active]:text-white"
                            >
                                {division.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {divisionApplicants.map((division) => {
                        const week1 = Math.max(0, Math.floor(division.count * 0.2));
                        const week2 = Math.max(0, Math.floor(division.count * 0.25));
                        const week3 = Math.max(0, Math.floor(division.count * 0.3));
                        const remaining = Math.max(0, division.count - (week1 + week2 + week3));
                        const chartData = [
                            { name: 'Minggu 1', value: week1 },
                            { name: 'Minggu 2', value: week2 },
                            { name: 'Minggu 3', value: week3 },
                            { name: 'Minggu 4', value: remaining },
                        ];

                        return (
                            <TabsContent key={division.id} value={division.id} className="mt-0">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <Card className="border-l-4 border-blue-500 p-4 shadow-sm md:col-span-1">
                                        <div className="mb-3 flex items-start justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Total Pelamar</p>
                                                <h2 className="mt-1.5 text-3xl font-bold text-blue-900">{formatNumber(division.count)}</h2>
                                            </div>
                                            <div className="rounded-lg bg-blue-50 p-2">
                                                <Users className="h-5 w-5 text-blue-600" />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center text-xs">
                                            <div className="mr-1.5 rounded-full bg-green-100 p-0.5">
                                                <TrendingUp className="h-3 w-3 text-green-600" />
                                            </div>
                                            <span className="mr-1 text-sm font-bold text-green-600">+{formatNumber(division.new)}</span>
                                            <span className="text-slate-500">pelamar baru bulan ini</span>
                                        </div>
                                    </Card>

                                    <Card className="flex flex-col justify-center p-4 shadow-sm md:col-span-2">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-blue-900">Tren Pendaftaran - {division.name}</h4>
                                            <Badge variant="outline" className="border-blue-200 text-[10px] text-blue-600">
                                                30 Hari Terakhir ({new Date().toLocaleDateString('id-ID', { month: 'long' })})
                                            </Badge>
                                        </div>
                                        <div className="h-[135px] w-full">
                                            <ResponsiveContainer width="100%" height="100%" debounce={300}>
                                                <BarChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                                    <Tooltip
                                                        cursor={{ fill: '#f3f4f6' }}
                                                        contentStyle={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            ) : (
                <p className="text-xs text-slate-500">Belum ada data pendaftar per divisi.</p>
            )}
        </section>
    );
}
