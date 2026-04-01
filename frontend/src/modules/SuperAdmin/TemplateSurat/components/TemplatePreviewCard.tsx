import { Eye } from 'lucide-react';
import Image from 'next/image';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

type TemplatePreviewCardProps = {
    logoPreview: string | null;
    open: boolean;
    renderedContent: string;
    renderedFooter: string;
    renderedHeader: string;
    onOpenChange: (open: boolean) => void;
};

export function TemplatePreviewCard({
    logoPreview,
    open,
    renderedContent,
    renderedFooter,
    renderedHeader,
    onOpenChange,
}: TemplatePreviewCardProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl">
                <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
                    <DialogTitle className="flex items-center gap-2 text-base text-blue-950 sm:text-lg">
                        <Eye className="h-4 w-4" />
                        Preview Template Surat
                    </DialogTitle>
                    <DialogDescription>
                        Preview memakai data contoh agar struktur header, isi, dan footer
                        template bisa dicek sebelum dipakai.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                        <div className="mx-auto rounded-[24px] border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8">
                            {(logoPreview || renderedHeader) && (
                                <div className="mb-6 border-b border-slate-200 pb-5">
                                    <div className="grid items-end gap-4 sm:grid-cols-[96px_minmax(0,1fr)_96px]">
                                        {logoPreview ? (
                                            <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-3">
                                                <Image
                                                    src={logoPreview}
                                                    alt="Preview logo"
                                                    width={72}
                                                    height={72}
                                                    unoptimized
                                                    className="h-[72px] w-[72px] object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="hidden sm:block" />
                                        )}

                                        {renderedHeader && (
                                            <div className="min-w-0 self-end whitespace-pre-wrap pb-2 text-center text-sm font-medium leading-6 text-slate-700 sm:text-base">
                                                {renderedHeader}
                                            </div>
                                        )}

                                        <div className="hidden sm:block" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                {renderedContent || (
                                    <p className="text-slate-400">
                                        Isi template akan tampil di sini.
                                    </p>
                                )}
                            </div>

                            {renderedFooter && (
                                <div className="mt-8 whitespace-pre-wrap border-t border-slate-200 pt-5 text-sm leading-6 text-slate-500">
                                    {renderedFooter}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
