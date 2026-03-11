import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import type { DashboardProps } from '@/modules/SuperAdmin/components/dashboard/types';

type ActivityTrendSectionProps = {
    activityData: DashboardProps['activityData'];
};

export function ActivityTrendSection({ activityData }: ActivityTrendSectionProps) {
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
                        <Tooltip />
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
        </div>
    );
}
