import { Upload } from 'lucide-react';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

import { NON_BODY_PLACEHOLDERS } from './constants';

type TemplatePlaceholderCardProps = {
    isBusy: boolean;
    placeholders: Record<string, string>;
    onInsertPlaceholder: (placeholder: string) => void;
};

export function TemplatePlaceholderCard({
    isBusy,
    placeholders,
    onInsertPlaceholder,
}: TemplatePlaceholderCardProps) {
    return (
        <Card className="flex h-full flex-col border-slate-200 bg-white shadow-sm">
            <CardHeader className="shrink-0 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-base text-blue-950">
                    <Upload className="h-4 w-4" />
                    Placeholder Siap Pakai
                </CardTitle>
                <CardDescription>
                    Klik placeholder untuk menyisipkan ke area editor yang sedang aktif.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-6">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                    {Object.entries(placeholders).map(([key, label]) => {
                        const isAutomatic = NON_BODY_PLACEHOLDERS.has(key);

                        return (
                            <button
                                key={key}
                                type="button"
                                disabled={isBusy || isAutomatic}
                                onClick={() => onInsertPlaceholder(key)}
                                className={cn(
                                    'flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors',
                                    isAutomatic
                                        ? 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50',
                                )}
                            >
                                <code className="text-xs">{key}</code>
                                <span className="ml-3 text-xs">
                                    {isAutomatic ? 'Otomatis' : label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
