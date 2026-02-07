import { FileText, User, Calendar, Tag, AlertCircle, Clock, ArrowRight, Eye, Download } from 'lucide-react';

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
import { Separator } from '@/shared/components/ui/separator';

import { LetterRecord } from './LettersTable';
import { PriorityBadge } from './PriorityBadge';


interface LetterDetailDialogProps {
    letter: LetterRecord | null;
    open: boolean;
    onOpenChange: (value: boolean) => void;
}

export default function LetterDetailDialog({
    letter,
    open,
    onOpenChange,
}: LetterDetailDialogProps) {
    if (!letter) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Detail Surat
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        {letter.letterNumber}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Metadata Card */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
                                    <User className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{letter.senderName}</p>
                                    <p className="text-xs text-slate-500">{letter.senderDivision}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5 text-slate-500 mb-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium">{letter.date}</span>
                                </div>
                                {getStatusBadge(letter.status)}
                            </div>
                        </div>

                        <Separator className="bg-slate-200" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">Penerima</span>
                                <p className="font-medium text-slate-900">{letter.recipientName}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">Divisi Tujuan</span>
                                <p className="font-medium text-slate-900">{letter.targetDivision ?? '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">Kategori</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-slate-200 hover:bg-slate-300 text-slate-700 border-none font-normal text-xs">
                                        {letter.category}
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">Prioritas</span>
                                <PriorityBadge priority={letter.priority} />
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 block">Subjek</span>
                            <h3 className="text-lg font-semibold text-slate-900 leading-tight">
                                {letter.subject}
                            </h3>
                        </div>

                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg border border-slate-100 p-4 shadow-sm min-h-[100px]">
                            {letter.content}
                        </div>
                    </div>

                    {/* Attachment Section */}
                    {letter.attachment && (
                        <div className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Lampiran</span>
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group">
                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{letter.attachment.name}</p>
                                    <p className="text-xs text-slate-500">{letter.attachment.size}</p>
                                </div>
                                {letter.attachment.url && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" asChild className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            <a href={letter.attachment.url} target="_blank" rel="noopener noreferrer">
                                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                Lihat
                                            </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild className="h-8 px-2">
                                            <a
                                                href={letter.attachment.url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                                Download
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reply History / Timeline */}
                    {(() => {
                        const history = letter.replyHistory && letter.replyHistory.length > 0
                            ? letter.replyHistory
                            : letter.replyNote
                                ? [{
                                    id: null,
                                    note: letter.replyNote,
                                    author: letter.replyBy,
                                    division: letter.targetDivision ?? letter.senderDivision,
                                    toDivision: letter.recipientName,
                                    timestamp: letter.replyAt,
                                }]
                                : [];

                        if (history.length === 0) return null;

                        return (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm font-semibold text-slate-900">Riwayat Disposisi</span>
                                </div>
                                <div className="relative pl-4 border-l-2 border-emerald-100 space-y-6">
                                    {history.map((entry, index) => (
                                        <div key={entry.id ?? index} className="relative">
                                            <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 ring-4 ring-emerald-50" />
                                            <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100/50">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-semibold text-emerald-800">{entry.author ?? entry.division ?? 'Divisi'}</span>
                                                        <ArrowRight className="h-3 w-3 text-emerald-400" />
                                                        <span className="text-emerald-700">{entry.toDivision ?? '-'}</span>
                                                    </div>
                                                    {entry.timestamp && (
                                                        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-100/50 px-1.5 py-0.5 rounded">
                                                            {entry.timestamp}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.note}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function getStatusBadge(status: string) {
    const normalized = status.toLowerCase();
    const style =
        normalized === 'diterima' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' :
            normalized === 'diproses' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' :
                normalized === 'selesai' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' :
                    'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';

    return (
        <Badge variant="secondary" className={`${style} border shadow-none font-medium`}>
            {status}
        </Badge>
    );
}


