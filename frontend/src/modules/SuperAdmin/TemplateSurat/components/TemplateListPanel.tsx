import { Check, Download, PencilLine, Trash2 } from 'lucide-react';
import Image from 'next/image';

import type { Template } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

import type { EditorMode } from './types';

type TemplateListPanelProps = {
    editorMode: EditorMode;
    isBusy: boolean;
    isRefreshingTemplates: boolean;
    selectedTemplateId: number | null;
    templates: Template[];
    onDeleteTemplate: (template: Template) => void;
    onDownloadTemplate: (template: Template) => void;
    onSelectTemplate: (template: Template) => void;
    onToggleTemplate: (template: Template) => void;
};

export function TemplateListPanel({
    editorMode,
    isBusy,
    isRefreshingTemplates,
    selectedTemplateId,
    templates,
    onDeleteTemplate,
    onDownloadTemplate,
    onSelectTemplate,
    onToggleTemplate,
}: TemplateListPanelProps) {
    return (
        <Card className="flex h-full flex-col border-slate-200 bg-white shadow-sm">
            <CardHeader className="shrink-0 border-b border-slate-100">
                <CardTitle className="text-base text-blue-950">
                    Daftar Template
                </CardTitle>
                <CardDescription>
                    Pilih template untuk diedit, aktifkan, nonaktifkan, atau hapus.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 overflow-y-auto pt-6">
                {isRefreshingTemplates && (
                    <p className="text-xs text-slate-500">
                        Menyegarkan data template...
                    </p>
                )}
                {templates.length === 0 ? (
                    <div className="flex min-h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        Belum ada template. Buat template baru untuk mulai mengelola
                        surat.
                    </div>
                ) : (
                    templates.map((template) => {
                        const isSelected =
                            editorMode === 'edit' && template.id === selectedTemplateId;

                        return (
                            <div
                                key={template.id}
                                className={cn(
                                    'rounded-2xl border p-4 transition-all',
                                    isSelected
                                        ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300',
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelectTemplate(template)}
                                    disabled={isBusy}
                                    className="w-full text-left disabled:cursor-not-allowed disabled:opacity-70"
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
                                                        Sedang diedit
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Dibuat oleh {template.createdBy || '-'} pada{' '}
                                                {template.createdAt || '-'}
                                            </p>
                                        </div>
                                        {template.logoUrl && (
                                            <Image
                                                src={template.logoUrl}
                                                alt={template.name}
                                                width={40}
                                                height={40}
                                                unoptimized
                                                className="h-10 w-10 rounded-xl border border-slate-200 bg-white p-1 object-contain"
                                            />
                                        )}
                                    </div>
                                </button>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={isSelected ? 'default' : 'outline'}
                                        onClick={() => onSelectTemplate(template)}
                                        disabled={isBusy}
                                    >
                                        <PencilLine />
                                        Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onDownloadTemplate(template)}
                                        disabled={isBusy}
                                    >
                                        <Download />
                                        Download
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onToggleTemplate(template)}
                                        disabled={isBusy}
                                    >
                                        <Check />
                                        {template.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => onDeleteTemplate(template)}
                                        disabled={isBusy}
                                    >
                                        <Trash2 />
                                        Hapus
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
