import { Download, Eye, FileText, SendHorizontal, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

import { LetterRecord } from '@/modules/SuperAdmin/KelolaSurat/components/LettersTable';
import { PriorityBadge } from '@/modules/SuperAdmin/KelolaSurat/components/PriorityBadge';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';
import type { InertiaFormProps } from '@/shared/lib/inertia';

interface DispositionDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  targets: LetterRecord[];
  dispositionForm: InertiaFormProps<{
    disposition_note: string;
    letter_ids: number[];
  }>;
  onSubmit: (mode: 'forward' | 'reject' | 'final') => void;
}

export default function DispositionDialog({
  open,
  onOpenChange,
  targets,
  dispositionForm,
  onSubmit,
}: DispositionDialogProps) {
  const setDispositionData = dispositionForm.setData;
  const resetDisposition = dispositionForm.reset;

  // Sinkronisasi letter_ids
  useEffect(() => {
    if (!open) return;
    setDispositionData(
      'letter_ids',
      targets.map((letter) => letter.id),
    );
  }, [open, targets, setDispositionData]);

  // Reset saat dialog ditutup
  useEffect(() => {
    if (!open) {
      resetDisposition('disposition_note', 'letter_ids');
    }
  }, [open, resetDisposition]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 bg-white p-0 sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4">
          <DialogTitle>Disposisi Surat</DialogTitle>
          <DialogDescription>
            Catatan opsional untuk disposisi biasa, tetapi wajib saat menolak dan disposisi final.
          </DialogDescription>
        </DialogHeader>

        {targets.length > 0 ? (
          <div className="flex flex-col gap-5 px-6 pb-6 pt-4">

            {/* Kartu daftar surat */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Surat terpilih
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {targets.length} dokumen siap dikirim
                  </p>

                  {/* PETUNJUK SCROLL */}
                  {targets.length > 2 && (
                    <p className="text-[11px] mt-1 text-red-600">
                      Scroll ke bawah untuk melihat semua surat
                    </p>
                  )}
                </div>

                <Badge className="bg-blue-600 text-white">
                  HR  Divisi Tujuan
                </Badge>
              </div>

              {/* LIST SURAT (scrollable + fade effect) */}
              <div className="mt-4 relative">
                <ScrollArea className="h-64 pr-2">
                  <div className="space-y-3 pr-1 pb-1">
                    {targets.map((letter) => (
                      <div
                        key={letter.id}
                        className="rounded-xl border bg-white p-3 shadow-sm"
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {letter.letterNumber}
                            </p>
                            <p className="text-xs text-slate-500">
                              {letter.subject}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <PriorityBadge priority={letter.priority} />
                            <Badge variant="outline">
                              {letter.targetDivision ?? '-'}
                            </Badge>
                          </div>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {letter.senderName} - {letter.date}
                        </p>

                        {letter.attachment?.url && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg border bg-slate-50 px-2 py-1 text-xs">
                            <FileText className="h-3.5 w-3.5 text-blue-500" />
                            <span className="flex-1 truncate">
                              {letter.attachment?.name ?? 'Lampiran'}
                            </span>

                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={letter.attachment.url} target="_blank">
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                            </Button>

                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a
                                href={letter.attachment.url}
                                download={letter.attachment.name ?? undefined}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* FADE EFFECT */}
                {targets.length > 2 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50/95 to-transparent" />
                )}
              </div>
            </div>

            {/* CATATAN */}
            <div className="space-y-2">
              <Label htmlFor="disposition-note">Catatan (opsional, wajib untuk tolak/final)</Label>
              <Textarea
                id="disposition-note"
                rows={4}
                placeholder="Tambahkan konteks sebelum surat diteruskan..."
                value={dispositionForm.data.disposition_note}
                onChange={(event) =>
                  dispositionForm.setData('disposition_note', event.target.value)
                }
              />
              {dispositionForm.errors.disposition_note && (
                <p className="text-xs text-red-500">
                  {dispositionForm.errors.disposition_note}
                </p>
              )}
            </div>

            {/* TOMBOL */}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                disabled={dispositionForm.processing}
                onClick={() => onSubmit('reject')}
              >
                {dispositionForm.processing ? 'Memproses...' : 'Tolak Surat'}
              </Button>

              <Button
                onClick={() => onSubmit('forward')}
                disabled={dispositionForm.processing}
                className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                {dispositionForm.processing ? (
                  'Memproses...'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <SendHorizontal className="h-4 w-4" />
                    Disposisi
                  </span>
                )}
              </Button>
            </div>

            {/* FINAL BUTTON - marks letter as finalized, recipient cannot reply */}
            <Button
              type="button"
              className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={dispositionForm.processing}
              onClick={() => onSubmit('final')}
            >
              {dispositionForm.processing ? (
                'Memproses...'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Disposisi Final
                </span>
              )}
            </Button>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Pilih surat yang ingin didisposisi.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}





