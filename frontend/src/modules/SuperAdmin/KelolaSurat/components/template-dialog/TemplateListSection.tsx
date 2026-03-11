import {
    Check,
    Download,
    FileText,
    Pencil,
    Trash2,
    X,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { apiUrl } from '@/shared/lib/api';

import type { Template } from './types';
import type { MouseEvent } from 'react';

type TemplateListSectionProps = {
    loading: boolean;
    templates: Template[];
    onToggle: (templateId: number) => void;
    onEdit: (template: Template) => void;
    onDelete: (templateId: number) => void;
};

export function TemplateListSection({
    loading,
    templates,
    onToggle,
    onEdit,
    onDelete,
}: TemplateListSectionProps) {
    if (loading) {
        return <p className="py-4 text-center text-xs text-slate-500 sm:text-sm">Memuat...</p>;
    }

    if (templates.length === 0) {
        return (
            <div className="py-6 text-center text-sm text-slate-500">
                <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="mb-3">Belum ada template</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    asChild
                >
                    <a href={apiUrl(route('super-admin.letters.templates.sample'))}>
                        <Download className="h-4 w-4" />
                        Unduh Template Contoh
                    </a>
                </Button>
            </div>
        );
    }

    const handleDownload = (event: MouseEvent, templateId: number) => {
        event.preventDefault();
        event.stopPropagation();
        window.open(
            apiUrl(route('super-admin.letters.templates.download', { template: templateId })),
            '_blank',
        );
    };

    return (
        <div className="space-y-2 sm:space-y-3">
            {templates.map((template) => (
                <div
                    key={template.id}
                    className="rounded-lg border bg-slate-50 p-3 sm:p-4"
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            {template.logoUrl && (
                                <img
                                    src={template.logoUrl}
                                    alt="Logo"
                                    className="h-8 w-8 shrink-0 rounded border bg-white p-0.5 object-contain sm:h-10 sm:w-10"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium sm:text-sm">{template.name}</p>
                                <p className="truncate text-[10px] text-slate-500 sm:text-xs">{template.fileName}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-1 sm:justify-end sm:gap-2">
                            <div className="flex items-center gap-1">
                                {template.isActive ? (
                                    <Badge className="bg-green-100 px-1.5 text-[10px] text-green-700 sm:px-2 sm:text-xs">Aktif</Badge>
                                ) : (
                                    <Badge variant="outline" className="px-1.5 text-[10px] sm:px-2 sm:text-xs">Nonaktif</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-0.5 sm:gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => onToggle(template.id)}
                                    title={template.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                    {template.isActive ? (
                                        <X className="h-3 w-3 text-slate-500 sm:h-4 sm:w-4" />
                                    ) : (
                                        <Check className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => onEdit(template)}
                                    title="Edit Template"
                                >
                                    <Pencil className="h-3 w-3 text-blue-600 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={(event) => handleDownload(event, template.id)}
                                    title="Download Template (dengan header/footer/logo)"
                                >
                                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-600 sm:h-8 sm:w-8"
                                    onClick={() => onDelete(template.id)}
                                >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    {(template.headerText || template.footerText) && (
                        <div className="mt-2 grid grid-cols-1 gap-1.5 border-t border-slate-200 pt-2 text-[10px] sm:grid-cols-2 sm:gap-2 sm:text-xs">
                            {template.headerText && (
                                <div>
                                    <span className="text-slate-400">Header:</span>
                                    <p className="truncate text-slate-600">{template.headerText}</p>
                                </div>
                            )}
                            {template.footerText && (
                                <div>
                                    <span className="text-slate-400">Footer:</span>
                                    <p className="truncate text-slate-600">{template.footerText}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
