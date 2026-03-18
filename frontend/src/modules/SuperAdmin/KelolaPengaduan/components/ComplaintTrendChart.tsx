import { BarChart3, CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { Button } from '@/shared/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';

import { ComplaintTrendSeries } from '../types';

type TrendPeriod = 'weekly' | 'monthly';

interface ComplaintTrendChartProps {
    trend: ComplaintTrendSeries;
}

export default function ComplaintTrendChart({ trend }: ComplaintTrendChartProps) {
    const [period, setPeriod] = useState<TrendPeriod>('monthly');
    const data = period === 'weekly' ? trend.weekly : trend.monthly;
    const hasData = useMemo(
        () => data.some((item) => (item.total ?? 0) > 0),
        [data],
    );

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base text-blue-900 md:text-lg">
                            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                            Tren Pengaduan
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs md:text-sm">
                            Pantau jumlah pengaduan per minggu atau per bulan.
                        </CardDescription>
                    </div>
                    <div className="inline-flex rounded-lg border bg-white p-1">
                        <Button
                            type="button"
                            size="sm"
                            variant={period === 'weekly' ? 'default' : 'ghost'}
                            className="h-8"
                            onClick={() => setPeriod('weekly')}
                        >
                            Mingguan
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={period === 'monthly' ? 'default' : 'ghost'}
                            className="h-8"
                            onClick={() => setPeriod('monthly')}
                        >
                            Bulanan
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                        <CalendarDays className="mb-2 h-6 w-6" />
                        <p className="text-sm">Belum ada data pengaduan pada periode ini.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={260} debounce={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number | string) => [
                                    `${Intl.NumberFormat('id-ID').format(Number(value))} pengaduan`,
                                    'Jumlah',
                                ]}
                            />
                            <Bar
                                dataKey="total"
                                fill="#1d4ed8"
                                name="Jumlah Pengaduan"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
