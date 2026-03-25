import { Info } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Legend,
    Line,
    LineChart,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from 'recharts';

import type { DashboardProps } from '@/modules/SuperAdmin/components/dashboard/types';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/shared/components/ui/tooltip';

type ActivityTrendSectionProps = {
    activityData: DashboardProps['activityData'];
    recruitmentFunnel: DashboardProps['recruitmentFunnel'];
};

export function ActivityTrendSection({
    activityData,
    recruitmentFunnel,
}: ActivityTrendSectionProps) {
    const initialStageCount = recruitmentFunnel[0]?.value ?? 0;
    const hiredStageCount = recruitmentFunnel[recruitmentFunnel.length - 1]?.value ?? 0;
    const endToEndConversion =
        initialStageCount > 0
            ? Math.round((hiredStageCount / initialStageCount) * 100)
            : 0;
    const totalDropOff = Math.max(0, initialStageCount - hiredStageCount);

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-base font-semibold text-blue-900">
                    Tren Registrasi & Lamaran
                </h3>
                <ResponsiveContainer width="100%" height={210} debounce={300}>
                    <LineChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="registrations"
                            stroke="#0ea5e9"
                            name="Registrasi"
                        />
                        <Line
                            type="monotone"
                            dataKey="applications"
                            stroke="#6366f1"
                            name="Lamaran"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h3 className="mb-1 text-base font-semibold text-blue-900">
                    Funnel Rekrutmen (Bulan Ini)
                </h3>
                <p className="mb-3 text-xs text-slate-500">
                    Konversi kandidat antar tahapan proses rekrutmen
                </p>

                {initialStageCount > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height={210} debounce={300}>
                            <BarChart
                                data={recruitmentFunnel}
                                layout="vertical"
                                margin={{ top: 4, right: 28, left: 12, bottom: 4 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis
                                    dataKey="label"
                                    type="category"
                                    width={110}
                                    tick={{ fontSize: 11, fill: '#334155' }}
                                />
                                <RechartsTooltip
                                    formatter={(value: number, _name, item) => [
                                        `${value} kandidat`,
                                        `${item?.payload?.conversion ?? 0}% dari tahap sebelumnya`,
                                    ]}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {recruitmentFunnel.map((stage) => (
                                        <Cell key={stage.key} fill={stage.color} />
                                    ))}
                                    <LabelList
                                        dataKey="value"
                                        position="right"
                                        className="fill-slate-700 text-xs"
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border bg-slate-50 p-2">
                                <div className="flex items-center gap-1">
                                    <p className="text-[11px] text-slate-500">Konversi End-to-End</p>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                                                aria-label="Info Konversi End-to-End"
                                            >
                                                <Info className="h-3 w-3" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
                                            Persentase kandidat dari tahap Lamaran Masuk sampai Diterima.
                                            Rumus: Diterima / Lamaran Masuk x 100%.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <p className="text-sm font-semibold text-blue-900">
                                    {endToEndConversion}%
                                </p>
                            </div>
                            <div className="rounded-lg border bg-slate-50 p-2">
                                <div className="flex items-center gap-1">
                                    <p className="text-[11px] text-slate-500">Total Drop-off</p>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                                                aria-label="Info Total Drop-off"
                                            >
                                                <Info className="h-3 w-3" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
                                            Jumlah kandidat yang tidak sampai ke tahap Diterima.
                                            Rumus: Lamaran Masuk - Diterima.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <p className="text-sm font-semibold text-blue-900">
                                    {totalDropOff} kandidat
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex h-[210px] items-center justify-center rounded-lg border border-dashed text-xs text-slate-500">
                        Belum ada data funnel rekrutmen bulan ini.
                    </div>
                )}
            </div>
        </div>
    );
}
