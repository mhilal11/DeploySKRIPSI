import { AlertTriangle, Minus, ArrowDown } from 'lucide-react';
import { useMemo } from 'react';

import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

import { LetterRecord } from './LettersTable';


interface PriorityStatsCardsProps {
    pendingDisposition: LetterRecord[];
    activePriority: string | null;
    onPriorityClick: (priority: string | null) => void;
}

const PRIORITY_META = [
    {
        key: 'high',
        label: 'Prioritas Tinggi',
        icon: AlertTriangle,
        bg: 'bg-red-500',
        activeBg: 'bg-red-600',
        ring: 'ring-red-300',
    },
    {
        key: 'medium',
        label: 'Prioritas Sedang',
        icon: Minus,
        bg: 'bg-yellow-500',
        activeBg: 'bg-yellow-600',
        ring: 'ring-yellow-300',
    },
    {
        key: 'low',
        label: 'Prioritas Rendah',
        icon: ArrowDown,
        bg: 'bg-green-500',
        activeBg: 'bg-green-600',
        ring: 'ring-green-300',
    },
] as const;

export default function PriorityStatsCards({
    pendingDisposition,
    activePriority,
    onPriorityClick,
}: PriorityStatsCardsProps) {
    const priorityCounts = useMemo(() => {
        return PRIORITY_META.reduce((acc, item) => {
            acc[item.key] = pendingDisposition.filter(
                (letter) => letter.priority === item.key
            ).length;
            return acc;
        }, {} as Record<string, number>);
    }, [pendingDisposition]);

    return (
        <div className="grid grid-cols-3 gap-2 md:gap-4 mt-4">
            {PRIORITY_META.map((item) => {
                const Icon = item.icon;
                const isActive = activePriority === item.key;
                const count = priorityCounts[item.key] ?? 0;

                return (
                    <Card
                        key={item.key}
                        className={cn(
                            'p-3 md:p-4 cursor-pointer transition-all duration-200 hover:shadow-md',
                            isActive && `ring-2 ${item.ring} shadow-lg`
                        )}
                        onClick={() => onPriorityClick(isActive ? null : item.key)}
                    >
                        <div className="flex items-center gap-2 md:gap-3">
                            <div
                                className={cn(
                                    'rounded-lg p-2 text-white transition-colors',
                                    isActive ? item.activeBg : item.bg
                                )}
                            >
                                <Icon className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-xs text-slate-500 truncate">
                                    {item.label}
                                </p>
                                <p className="text-lg md:text-xl font-semibold text-slate-900">
                                    {count}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}


