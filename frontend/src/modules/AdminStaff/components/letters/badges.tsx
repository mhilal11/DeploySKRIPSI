import { Badge } from '@/shared/components/ui/badge';

import type { ReactNode } from 'react';


export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  if (normalized.includes('tolak')) {
    return (
      <Badge variant="outline" className="border-rose-500 text-rose-600">
        {status}
      </Badge>
    );
  }

  if (normalized.includes('selesai')) {
    return (
      <Badge variant="outline" className="border-green-500 text-green-600">
        {status}
      </Badge>
    );
  }

  if (normalized.includes('arsip')) {
    return (
      <Badge variant="outline" className="border-slate-500 text-slate-600">
        {status}
      </Badge>
    );
  }

  if (normalized.includes('disposisi final')) {
    return (
      <Badge variant="outline" className="border-emerald-500 text-emerald-600">
        {status}
      </Badge>
    );
  }

  if (normalized.includes('didisposisi')) {
    return (
      <Badge variant="outline" className="border-blue-500 text-blue-600">
        {status}
      </Badge>
    );
  }

  if (normalized.includes('diajukan') || normalized.includes('terkirim')) {
    return (
      <Badge variant="outline" className="border-indigo-500 text-indigo-600">
        {status}
      </Badge>
    );
  }

  if (normalized.includes('proses') || normalized.includes('menunggu')) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        {status}
      </Badge>
    );
  }

  return <Badge variant="outline">{status}</Badge>;
}

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

function resolvePriorityMeta(priority?: string | null) {
  if (typeof priority !== 'string') {
    return FALLBACK_PRIORITY_META;
  }

  const normalized = priority.toLowerCase();

  return PRIORITY_META[normalized] ?? FALLBACK_PRIORITY_META;
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority?: string | null;
  className?: string;
}) {
  const meta = resolvePriorityMeta(priority);
  const classes = [
    'border-0 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
    meta.badgeClass,
    className,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  return <Badge className={classes}>{meta.label}</Badge>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function InfoTile({
  label,
  value,
}: {
  label: string;
  value?: ReactNode | string | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm font-semibold text-slate-900">{value ?? '-'}</div>
    </div>
  );
}
