import { CheckCircle2, FileText } from 'lucide-react';

import type { Template } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';

type FinalDispositionTemplateDialogProps = {
    open: boolean;
    templates: Template[];
    processing: boolean;
    selectedTemplateId: number | null;
    onOpenChange: (open: boolean) => void;
    onSelectTemplate: (templateId: number) => void;
    onConfirm: () => void;
};

export default function FinalDispositionTemplateDialog({
    open,
    templates,
    processing,
    selectedTemplateId,
    onOpenChange,
    onSelectTemplate,
    onConfirm,
}: FinalDispositionTemplateDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto bg-white p-0 sm:max-w-2xl">
                <DialogHeader className="border-b border-slate-100 px-6 py-4">
                    <DialogTitle>Pilih Template Disposisi Final</DialogTitle>
                    <DialogDescription>
                        Tentukan template yang akan dipakai untuk membuat dokumen
                        disposisi final.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 py-5">
                    {templates.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            Belum ada template aktif maupun template cadangan yang bisa
                            dipilih.
                        </div>
                    ) : (
                        templates.map((template) => {
                            const isSelected = template.id === selectedTemplateId;

                            return (
                                <button
                                    key={template.id}
                                    type="button"
                                    disabled={processing}
                                    onClick={() => onSelectTemplate(template.id)}
                                    className={cn(
                                        'w-full rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70',
                                        isSelected
                                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-slate-300',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-semibold text-slate-900">
                                                    {template.name}
                                                </p>
                                                {template.isActive && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                        Aktif
                                                    </Badge>
                                                )}
                                                {isSelected && (
                                                    <Badge variant="outline">
                                                        Terpilih
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Dibuat oleh {template.createdBy || '-'} pada{' '}
                                                {template.createdAt || '-'}
                                            </p>
                                        </div>

                                        <span
                                            className={cn(
                                                'inline-flex h-10 w-10 items-center justify-center rounded-full border',
                                                isSelected
                                                    ? 'border-emerald-200 bg-emerald-100 text-emerald-600'
                                                    : 'border-slate-200 bg-slate-50 text-slate-400',
                                            )}
                                        >
                                            <FileText className="h-4 w-4" />
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={onConfirm}
                        disabled={
                            processing ||
                            templates.length === 0 ||
                            selectedTemplateId == null
                        }
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {processing ? 'Memproses...' : 'Gunakan Template Ini'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
