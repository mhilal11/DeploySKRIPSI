import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/components/ui/utils';

const PRIORITY_META: Record<
    string,
    {
        label: string;
        badgeClass: string;
    }
> = {
    high: {
        label: 'Tinggi',
        badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
    },
    medium: {
        label: 'Sedang',
        badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
    low: {
        label: 'Rendah',
        badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    },
};

const FALLBACK_PRIORITY_META = PRIORITY_META.medium;

export function PriorityBadge({
    priority,
    className,
}: {
    priority?: string | null;
    className?: string;
}) {
    const normalized = typeof priority === 'string' ? priority.toLowerCase() : '';
    const meta = PRIORITY_META[normalized] ?? FALLBACK_PRIORITY_META;

    return (
        <Badge
            className={cn(
                'border-0 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
                meta.badgeClass,
                className
            )}
        >
            {meta.label}
        </Badge>
    );
}


