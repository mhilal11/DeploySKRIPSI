import { AlertCircle, FileText, Loader2, MessageSquare, Paperclip, Send, Upload, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Separator } from '@/shared/components/ui/separator';
import { Textarea } from '@/shared/components/ui/textarea';

interface LetterReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  replyNote: string;
  onReplyNoteChange: (value: string) => void;
  replyNoteError?: string;
  replyAttachment: File | null;
  onReplyAttachmentChange: (file: File | null) => void;
  replyAttachmentError?: string;
  processing: boolean;
  onSubmit: () => void;
}

export function LetterReplyDialog({
  open,
  onOpenChange,
  subject,
  replyNote,
  onReplyNoteChange,
  replyNoteError,
  replyAttachment,
  onReplyAttachmentChange,
  replyAttachmentError,
  processing,
  onSubmit,
}: LetterReplyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-white p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Balas Surat
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Kirim catatan balasan untuk surat yang dipilih
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          <Card className="mb-5 border-blue-200 bg-blue-50/50">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-700 mb-1">
                    Subjek Surat
                  </p>
                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                    {subject}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-600" />
                <label className="text-sm font-semibold text-slate-900">
                  Catatan Balasan <span className="text-rose-500">*</span>
                </label>
              </div>
              <Textarea
                rows={6}
                placeholder="Tulis tanggapan untuk pengirim atau HR..."
                value={replyNote}
                onChange={(event) => onReplyNoteChange(event.target.value)}
                className="resize-none border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              />
              {replyNoteError && (
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-xs font-medium">{replyNoteError}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-600" />
                <label htmlFor="reply-attachment" className="text-sm font-semibold text-slate-900">
                  Lampiran Balasan (opsional)
                </label>
              </div>

              <label
                htmlFor="reply-attachment"
                className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 transition hover:border-blue-500 hover:text-blue-600"
              >
                <Upload className="mx-auto mb-2 h-5 w-5" />
                Klik untuk mengunggah lampiran PDF/Word
              </label>
              <input
                id="reply-attachment"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => onReplyAttachmentChange(event.target.files?.[0] ?? null)}
              />

              {replyAttachment && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{replyAttachment.name}</p>
                    <p className="text-xs text-slate-500">
                      {(replyAttachment.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-500 hover:text-rose-600"
                    onClick={() => onReplyAttachmentChange(null)}
                    disabled={processing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {replyAttachmentError && (
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-xs font-medium">{replyAttachmentError}</p>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={processing}
                className="border-slate-300 hover:bg-slate-50"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Kirim Balasan
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
