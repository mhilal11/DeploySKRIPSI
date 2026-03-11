import { Card } from '@/shared/components/ui/card';

import type { LucideIcon } from 'lucide-react';


type ApplicationsStatCardProps = {
    icon: LucideIcon;
    title: string;
    value: number;
    accent: string;
};

export default function ApplicationsStatCard({
    icon: Icon,
    title,
    value,
    accent,
}: ApplicationsStatCardProps) {
    return (
        <Card className="p-4">
            <div className="flex items-center gap-3">
                <div className={`rounded-lg p-3 ${accent}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <p className="text-xl font-semibold text-slate-900">{value}</p>
                </div>
            </div>
        </Card>
    );
}
