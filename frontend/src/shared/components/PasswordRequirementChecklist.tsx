import { CheckCircle2, Circle } from 'lucide-react';

import { cn } from '@/shared/components/ui/utils';
import { evaluatePasswordPolicy } from '@/shared/lib/password-policy';

interface PasswordRequirementChecklistProps {
    password: string;
    variant?: 'dark' | 'light';
    className?: string;
}

export default function PasswordRequirementChecklist({
    password,
    variant = 'light',
    className,
}: PasswordRequirementChecklistProps) {
    const policy = evaluatePasswordPolicy(password);
    const containerClassName =
        variant === 'dark'
            ? 'rounded-2xl border border-white/12 bg-black/20 px-4 py-3'
            : 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3';
    const idleTextClassName =
        variant === 'dark' ? 'text-white/70' : 'text-slate-500';
    const activeTextClassName =
        variant === 'dark' ? 'text-emerald-200' : 'text-emerald-700';
    const idleIconClassName =
        variant === 'dark' ? 'text-white/45' : 'text-slate-300';
    const activeIconClassName = 'text-emerald-500';

    const items = [
        {
            satisfied: policy.hasValidLength,
            label: 'Diperlukan 8-16 karakter',
        },
        {
            satisfied: policy.hasMixedCase,
            label: 'Gunakan minimal 1 karakter huruf besar (A-Z) dan 1 karakter huruf kecil (a-z).',
        },
        {
            satisfied: policy.hasNumberAndSpecialCharacter,
            label: 'Gunakan minimal 1 angka (0-9) dan 1 karakter khusus (!@#$%^&*.()).',
        },
    ];

    return (
        <div className={cn(containerClassName, className)}>
            <ul className="space-y-2">
                {items.map((item) => {
                    const Icon = item.satisfied ? CheckCircle2 : Circle;

                    return (
                        <li
                            key={item.label}
                            className={cn(
                                'flex items-start gap-2 text-sm leading-5',
                                item.satisfied
                                    ? activeTextClassName
                                    : idleTextClassName,
                            )}
                        >
                            <Icon
                                className={cn(
                                    'mt-0.5 h-4 w-4 shrink-0',
                                    item.satisfied
                                        ? activeIconClassName
                                        : idleIconClassName,
                                )}
                            />
                            <span>{item.label}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
