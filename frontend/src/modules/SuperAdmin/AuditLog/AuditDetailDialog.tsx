import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

import {
    changeTypeMeta,
    formatObjectLabel,
    summarizeValue,
} from './audit-log-utils';

import type { AuditDetailState } from './audit-log-utils';

type AuditDetailDialogProps = {
    activeDetail: AuditDetailState | null;
    onClose: () => void;
};

export function AuditDetailDialog({ activeDetail, onClose }: AuditDetailDialogProps) {
    return (
        <Dialog open={Boolean(activeDetail)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] w-[96vw] overflow-hidden border-0 bg-white p-0 sm:w-[92vw] sm:max-w-4xl">
                {activeDetail && (
                    <>
                        <DialogHeader className="space-y-1 border-b border-slate-100 px-4 py-4 text-left sm:px-6">
                            <DialogTitle>Detail Perubahan Log Aktivitas</DialogTitle>
                            <DialogDescription className="space-y-1">
                                <span className="block text-xs text-slate-500">
                                    {activeDetail.item.created_at}
                                </span>
                                <span className="block text-sm text-slate-700">
                                    {formatObjectLabel(activeDetail.item)}
                                </span>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[65vh] space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
                            {activeDetail.changes.length === 0 ? (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    Log ini tidak memiliki perubahan field terstruktur, namun sudah ditandai
                                    sebagai dilihat.
                                </div>
                            ) : (
                                activeDetail.changes.map((change) => (
                                    <div
                                        key={`modal-${activeDetail.item.id}-${change.key}`}
                                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                                    >
                                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="break-words text-sm font-semibold text-slate-800">{change.label}</p>
                                            <Badge variant="outline" className={`w-fit ${changeTypeMeta[change.type].className}`}>
                                                {changeTypeMeta[change.type].label}
                                            </Badge>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div className="rounded-md border border-slate-200 bg-white p-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sebelum</p>
                                                <p className="mt-1 break-words text-xs text-slate-700">
                                                    {summarizeValue(change.before)}
                                                </p>
                                            </div>
                                            <div className="rounded-md border border-slate-200 bg-white p-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sesudah</p>
                                                <p className="mt-1 break-words text-xs text-slate-700">
                                                    {summarizeValue(change.after)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <DialogFooter className="border-t border-slate-100 px-4 py-4 sm:px-6">
                            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                                Tutup
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
