import { FileText } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

type TemplatePdfPreviewDialogProps = {
    isLoading: boolean;
    open: boolean;
    pdfUrl: string | null;
    onOpenChange: (open: boolean) => void;
};

export function TemplatePdfPreviewDialog({
    isLoading,
    open,
    pdfUrl,
    onOpenChange,
}: TemplatePdfPreviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[90vh] flex-col overflow-hidden sm:max-w-6xl">
                <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
                    <DialogTitle className="flex items-center gap-2 text-base text-blue-950 sm:text-lg">
                        <FileText className="h-4 w-4" />
                        Preview PDF Template Surat
                    </DialogTitle>
                    <DialogDescription>
                        Preview ini menampilkan hasil template dalam format PDF
                        sementara.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 bg-slate-100 p-4">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                            Menyiapkan preview PDF...
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            title="Preview PDF Template Surat"
                            className="h-full w-full rounded-2xl border border-slate-200 bg-white"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                            Preview PDF belum tersedia.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
