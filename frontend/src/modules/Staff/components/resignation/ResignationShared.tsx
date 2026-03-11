import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import type { JSX } from 'react';

interface FormFieldProps {
    label: string;
    value: string;
    disabled?: boolean;
    type?: string;
}

export function FormField({ label, value, disabled, type = 'text' }: FormFieldProps) {
    return (
        <div className="w-full">
            <Label>{label}</Label>
            <Input
                type={type}
                value={value}
                disabled={disabled}
                readOnly={disabled}
            />
        </div>
    );
}

interface InfoCardProps {
    icon: JSX.Element;
    title: string;
    description: string;
    color: string;
}

export function InfoCard({ icon, title, description, color }: InfoCardProps) {
    return (
        <div className={`w-full rounded-lg border p-4 ${color}`}>
            <div className="flex gap-3">
                {icon}
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-slate-600">{description}</p>
                </div>
            </div>
        </div>
    );
}

interface StatusItemProps {
    label: string;
    value: string;
    highlight?: boolean;
}

export function StatusItem({ label, value, highlight = false }: StatusItemProps) {
    return (
        <div className="flex flex-col">
            <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                {label}
            </p>

            {highlight ? (
                <Badge
                    variant="outline"
                    className="w-fit border-blue-500 px-2 py-1 text-blue-700"
                >
                    {value}
                </Badge>
            ) : (
                <p className="text-sm font-semibold text-slate-900">{value}</p>
            )}
        </div>
    );
}

interface StatusBadgeProps {
    status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus.includes('selesai')) {
        return (
            <Badge
                variant="outline"
                className="border-green-500 text-green-600"
            >
                {status}
            </Badge>
        );
    }

    if (normalizedStatus.includes('proses') || normalizedStatus.includes('menunggu')) {
        return (
            <Badge
                variant="outline"
                className="border-amber-500 text-amber-600"
            >
                {status}
            </Badge>
        );
    }

    return <Badge variant="outline">{status}</Badge>;
}
