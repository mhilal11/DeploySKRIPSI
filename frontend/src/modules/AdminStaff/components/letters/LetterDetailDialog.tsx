import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Info,
  MapPin,
  MessageSquare,
  Paperclip,
  Users,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

import { InfoTile, PriorityBadge, StatusBadge } from './badges';
import { LetterTrackingView } from './LetterTrackingView';
import { LetterRecord } from './types';

interface LetterDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter: LetterRecord | null;
  detailTab: 'detail' | 'replies' | 'tracking';
  onDetailTabChange: (value: 'detail' | 'replies' | 'tracking') => void;
  onOpenReply: () => void;
}

export function LetterDetailDialog({
  open,
  onOpenChange,
  letter,
  detailTab,
  onDetailTabChange,
  onOpenReply,
}: LetterDetailDialogProps) {
  const selectedLetterStatus = letter?.status?.toLowerCase() ?? '';
  const isSelectedLetterRejected = selectedLetterStatus.includes('tolak');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] max-w-3xl overflow-hidden border-0 bg-white p-0"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4">
          <DialogTitle>Detail Surat</DialogTitle>
          <DialogDescription>
            Ringkasan informasi surat masuk/keluar beserta lampiran yang disertakan.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(85vh-4.5rem)] overflow-y-auto">
          {letter ? (
            <div className="px-6 pb-8 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{letter.subject}</p>
                </div>
                {letter.canReply && (
                  <Button
                    size="sm"
                    className="bg-blue-900 text-white hover:bg-blue-800"
                    onClick={onOpenReply}
                  >
                    Balas Surat
                  </Button>
                )}
                {letter.isFinalized && (
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Disposisi Final
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Diterima pada {letter.receivedAt ?? letter.date}
              </p>
              {letter.isFinalized && (
                <p className="mt-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1 inline-block">
                  Surat ini bersifat final dan tidak dapat dibalas.
                </p>
              )}

              <Tabs
                value={detailTab}
                onValueChange={(value) => onDetailTabChange(value as 'detail' | 'replies' | 'tracking')}
                className="mt-5 space-y-4"
              >
                <TabsList className="grid w-full grid-cols-3 gap-3 bg-transparent p-0">
                  <TabsTrigger
                    value="detail"
                    className="rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Detail Surat
                  </TabsTrigger>
                  <TabsTrigger
                    value="replies"
                    className="rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Balasan
                  </TabsTrigger>
                  <TabsTrigger
                    value="tracking"
                    className="rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Tracking Surat
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detail" className="mt-4">
                  <div className="space-y-5">
                    <Card className="overflow-hidden border-slate-200">
                      <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-5 py-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-slate-900">
                            Informasi Surat
                          </h3>
                        </div>
                      </div>
                      <div className="grid gap-4 p-5 text-sm md:grid-cols-3">
                        <InfoTile label="Nomor Surat" value={letter.letterNumber} />
                        <InfoTile label="Tanggal Surat" value={letter.date} />
                        <InfoTile label="Tanggal Diterima" value={letter.receivedAt ?? '-'} />
                        <InfoTile label="Pengirim" value={letter.sender} />
                        <InfoTile label="Divisi" value={letter.from} />
                        <InfoTile
                          label="Divisi Tujuan"
                          value={letter.targetDivision ?? letter.recipient ?? '-'}
                        />
                        <InfoTile label="Kategori" value={letter.category} />
                        <InfoTile
                          label="Prioritas"
                          value={<PriorityBadge priority={letter.priority} />}
                        />
                        <InfoTile label="Status" value={<StatusBadge status={letter.status} />} />
                      </div>
                    </Card>

                    <Card className="overflow-hidden border-slate-200">
                      <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-5 py-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-slate-900">
                            Subjek & Isi
                          </h3>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                            Subjek
                          </p>
                          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                            {letter.subject}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-slate-300 text-slate-700">
                              Dari: {letter.from ?? '-'}
                            </Badge>
                            <Badge variant="outline" className="border-blue-300 text-blue-700">
                              Ke: {letter.targetDivision ?? letter.recipient ?? '-'}
                            </Badge>
                          </div>
                        </div>
                        {letter.content && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                Isi Surat
                              </p>
                              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed">
                                {letter.content}
                              </div>
                            </div>
                          </>
                        )}
                        {letter.dispositionNote && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                {isSelectedLetterRejected ? 'Catatan Penolakan HR' : 'Catatan HR'}
                              </p>
                              <div
                                className={
                                  isSelectedLetterRejected
                                    ? 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 leading-relaxed whitespace-pre-line'
                                    : 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line'
                                }
                              >
                                {letter.dispositionNote}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>

                    {letter.hasAttachment && letter.attachmentUrl && (
                      <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
                        <div className="bg-blue-100/50 px-5 py-3 border-b border-blue-200">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-blue-600" />
                            <h3 className="text-sm font-semibold text-slate-900">Lampiran</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {letter.subject}
                                </p>
                                <p className="text-xs text-slate-500">Dokumen surat terlampir</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border-blue-300 hover:bg-blue-50"
                              >
                                <a href={letter.attachmentUrl} target="_blank" rel="noreferrer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Lihat
                                </a>
                              </Button>
                              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <a
                                  href={letter.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Unduh
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {letter.isFinalized && letter.dispositionDocumentUrl && (
                      <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
                        <div className="bg-emerald-100/50 px-5 py-3 border-b border-emerald-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold text-slate-900">
                              Lampiran Disposisi Final
                            </h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {letter.dispositionDocumentName ?? 'Surat Disposisi.docx'}
                                </p>
                                <p className="text-xs text-emerald-600">Dokumen disposisi resmi</p>
                              </div>
                            </div>
                            <Button
                              asChild
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
                            >
                              <a href={letter.dispositionDocumentUrl} download>
                                <Download className="mr-2 h-4 w-4" />
                                Unduh
                              </a>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                  </div>
                </TabsContent>

                <TabsContent value="replies" className="mt-4">
                  {(() => {
                    const history =
                      letter.replyHistory && letter.replyHistory.length > 0
                        ? letter.replyHistory
                        : letter.replyNote
                          ? [
                            {
                              id: null,
                              note: letter.replyNote,
                              author: letter.replyBy,
                              division: letter.targetDivision ?? letter.from,
                              toDivision: letter.recipient ?? undefined,
                              timestamp: letter.replyAt,
                              attachment: letter.attachmentUrl
                                ? {
                                  name: letter.subject,
                                  url: letter.attachmentUrl,
                                }
                                : null,
                            },
                          ]
                          : [];

                    if (history.length === 0) {
                      return (
                        <Card className="border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                          Belum ada balasan pada surat ini.
                        </Card>
                      );
                    }

                    return (
                      <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
                        <div className="bg-emerald-100/50 px-5 py-3 border-b border-emerald-200">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold text-slate-900">
                              Riwayat Balasan
                            </h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="space-y-3">
                            {history.map((entry, index) => (
                              <Card
                                key={entry.id ?? index}
                                className="border-emerald-200/60 bg-white shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                          <Users className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-semibold text-sm text-emerald-900 truncate">
                                            {entry.author ?? entry.division ?? 'Divisi'}
                                          </p>
                                          <p className="text-xs text-slate-500 truncate">
                                            {entry.division ?? '-'}
                                            {entry.toDivision ? ` ${entry.toDivision}` : ''}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    {entry.timestamp && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-slate-300 flex-shrink-0"
                                      >
                                        <Clock className="mr-1 h-3 w-3" />
                                        {entry.timestamp}
                                      </Badge>
                                    )}
                                  </div>
                                  <Separator className="my-3" />
                                  <p className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                                    {entry.note}
                                  </p>
                                  {entry.attachment?.url && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                      >
                                        <a href={entry.attachment.url} target="_blank" rel="noreferrer">
                                          <Eye className="mr-2 h-3.5 w-3.5" />
                                          Lihat Lampiran
                                        </a>
                                      </Button>
                                      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                        <a href={entry.attachment.url} download>
                                          <Download className="mr-2 h-3.5 w-3.5" />
                                          Unduh Lampiran
                                        </a>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </Card>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="tracking" className="mt-4">
                  <LetterTrackingView letter={letter} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Pilih surat untuk melihat detail.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
