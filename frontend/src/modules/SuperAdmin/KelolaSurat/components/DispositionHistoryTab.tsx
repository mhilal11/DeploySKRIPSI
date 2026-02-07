import { ArrowRight, Eye, FileText, History, MessageSquare } from 'lucide-react';
import { useState } from 'react';

import { LetterRecord, ReplyHistoryEntry } from '@/modules/SuperAdmin/KelolaSurat/components/LettersTable';
import { PriorityBadge } from '@/modules/SuperAdmin/KelolaSurat/components/PriorityBadge';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';

interface DispositionHistoryTabProps {
    letters: LetterRecord[];
    onSelect: (letter: LetterRecord) => void;
}

export default function DispositionHistoryTab({ letters, onSelect }: DispositionHistoryTabProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const withReplyCount = letters.filter((letter) => (letter.replyHistory?.length ?? 0) > 0).length;
    const archivedCount = letters.filter((letter) =>
        (letter.status ?? '').toLowerCase().includes('arsip')
    ).length;
    const rejectedCount = letters.filter((letter) =>
        (letter.status ?? '').toLowerCase().includes('tolak')
    ).length;

    if (letters.length === 0) {
        return (
            <Card className="border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Belum ada riwayat disposisi yang bisa ditampilkan.
            </Card>
        );
    }

    const totalPages = Math.ceil(letters.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentLetters = letters.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <Card className="border border-slate-100 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Riwayat Disposisi</p>
                        <p className="text-xs text-slate-500">
                            Pantau alur surat yang sudah didisposisi dan tindak lanjut antar divisi.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <Badge variant="outline" className="border-blue-200 text-blue-700">
                        Total {letters.length} surat
                    </Badge>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                        {withReplyCount} ada balasan
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 text-slate-700">
                        {archivedCount} diarsipkan
                    </Badge>
                    <Badge variant="outline" className="border-rose-200 text-rose-700">
                        {rejectedCount} ditolak
                    </Badge>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">No</TableHead>
                            <TableHead>Nomor Surat</TableHead>
                            <TableHead>Pengirim</TableHead>
                            <TableHead>Subjek</TableHead>
                            <TableHead>Divisi Tujuan</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Prioritas</TableHead>
                            <TableHead>Update Terakhir</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentLetters.map((letter, index) => {
                            const { latestEvent, steps } = resolveLatestEvent(letter);

                            return (
                                <TableRow key={letter.id}>
                                    <TableCell className="font-medium text-slate-900">
                                        {startIndex + index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {letter.attachment && <FileText className="h-4 w-4 text-blue-500" />}
                                            <span className="text-sm font-semibold text-slate-900">
                                                {letter.letterNumber}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <p className="font-semibold text-slate-900">
                                                {letter.senderDivision ?? letter.senderName}
                                            </p>
                                            <p className="text-xs text-slate-500">{letter.senderName}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-sm">
                                        <p className="line-clamp-1 text-sm text-slate-900">{letter.subject}</p>
                                        {latestEvent.note && (
                                            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                                                <MessageSquare className="mr-1 inline h-3 w-3" />
                                                {latestEvent.note}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-medium text-slate-900">
                                            {letter.targetDivision ?? letter.recipientName ?? '-'}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{letter.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <PriorityBadge priority={letter.priority} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-slate-500">
                                            <p className="font-semibold text-slate-900">
                                                {latestEvent.timestamp ?? '-'}
                                            </p>
                                            <p className="mt-1 flex items-center gap-1">
                                                {latestEvent.from && <span>{latestEvent.from}</span>}
                                                {(latestEvent.from || latestEvent.to) && (
                                                    <ArrowRight className="h-3 w-3 text-slate-400" />
                                                )}
                                                {latestEvent.to && <span>{latestEvent.to}</span>}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(letter.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge variant="outline" className="border-blue-200 text-blue-700">
                                                {steps} langkah
                                            </Badge>
                                            <Button variant="ghost" size="sm" onClick={() => onSelect(letter)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Detail
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, letters.length)} dari {letters.length} data
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Sebelumnya
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => handlePageChange(page)}
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Selanjutnya
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}

function resolveLatestEvent(letter: LetterRecord): {
    latestEvent: {
        timestamp?: string | null;
        note?: string | null;
        from?: string | null;
        to?: string | null;
    };
    steps: number;
} {
    const history: ReplyHistoryEntry[] = letter.replyHistory ?? [];

    if (history.length > 0) {
        const latest = history[history.length - 1];
        return {
            latestEvent: {
                timestamp: latest.timestamp,
                note: latest.note,
                from: latest.division ?? latest.author ?? letter.senderDivision ?? letter.senderName,
                to: latest.toDivision ?? letter.targetDivision ?? letter.recipientName,
            },
            steps: history.length,
        };
    }

    return {
        latestEvent: {
            timestamp: letter.disposedAt ?? letter.date,
            note: letter.dispositionNote,
            from: letter.senderDivision ?? letter.senderName,
            to: letter.targetDivision ?? letter.recipientName,
        },
        steps: 1,
    };
}

function getStatusBadge(status?: string | null) {
    if (!status) {
        return <Badge variant="outline">-</Badge>;
    }

    const normalized = status.toLowerCase();

    if (normalized.includes('arsip')) {
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Diarsipkan</Badge>;
    }

    if (normalized.includes('tolak')) {
        return <Badge variant="outline" className="border-rose-500 text-rose-600">Ditolak</Badge>;
    }

    if (normalized.includes('disposisi') || normalized.includes('terkirim')) {
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Didisposisi</Badge>;
    }

    if (normalized.includes('proses') || normalized.includes('tunggu')) {
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Dalam Proses</Badge>;
    }

    return <Badge variant="outline">{status}</Badge>;
}



