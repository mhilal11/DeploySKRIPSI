import { Archive, Eye, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import { PriorityBadge } from './PriorityBadge';

export type ReplyHistoryEntry = {
    id: number | null;
    note: string;
    author?: string | null;
    division?: string | null;
    toDivision?: string | null;
    timestamp?: string | null;
    attachment?: {
        name?: string | null;
        size?: string | number | null;
        url?: string | null;
    } | null;
};

export interface LetterRecord {
    id: number;
    letterNumber: string;
    senderName: string;
    senderDivision?: string | null;
    senderPosition?: string | null;
    recipientName: string;
    subject: string;
    letterType: string;
    category: string;
    priority: string;
    date: string;
    receivedAt?: string | null;
    status: string;
    content: string;
    type: 'masuk' | 'keluar';
    attachment?: {
        name: string | null;
        size?: string | null;
        url?: string | null;
    } | null;
    targetDivision?: string | null;
    currentRecipient?: string;
    replyNote?: string | null;
    replyBy?: string | null;
    replyAt?: string | null;
    replyHistory?: ReplyHistoryEntry[];
    dispositionNote?: string | null;
    disposedBy?: string | null;
    disposedAt?: string | null;
    approvalDate?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

interface LettersTableProps {
    letters: LetterRecord[];
    variant: 'inbox' | 'outbox';
    onSelect: (letter: LetterRecord) => void;
    onArchive?: (letter: LetterRecord) => void;
    archivingId?: number | null;
    archiveProcessing?: boolean;
}

function getStatusBadge(status: string) {
    const normalized = status.toLowerCase();

    if (normalized === 'diterima') {
        return (
            <Badge variant="outline" className="border-blue-500 text-blue-600">
                Diterima
            </Badge>
        );
    }
    if (normalized === 'diproses') {
        return (
            <Badge
                variant="outline"
                className="border-orange-500 text-orange-600"
            >
                Diproses
            </Badge>
        );
    }
    if (normalized === 'selesai') {
        return (
            <Badge
                variant="outline"
                className="border-green-500 text-green-600"
            >
                Selesai
            </Badge>
        );
    }

    return <Badge variant="outline">{status}</Badge>;
}

export default function LettersTable({
    letters,
    variant,
    onSelect,
    onArchive,
    archivingId,
    archiveProcessing,
}: LettersTableProps) {
    const isInbox = variant === 'inbox';
    const [currentPage, setCurrentPage] = useState(1);
    const [archiveTarget, setArchiveTarget] = useState<LetterRecord | null>(null);
    const lastArchiveConfirmAtRef = useRef(0);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(letters.length / itemsPerPage);
    const closeArchiveDialog = () => setArchiveTarget(null);
    const canArchiveTarget = archiveTarget?.status === 'Didisposisi';
    const isTargetProcessing =
        Boolean(archiveProcessing) && archiveTarget !== null && archivingId === archiveTarget.id;

    if (letters.length === 0) {
        return (
            <div className="py-8 md:py-10 text-center text-xs md:text-sm text-slate-500">
                Tidak ada data surat pada tab ini.
            </div>
        );
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentLetters = letters.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">No</TableHead>
                            <TableHead>Nomor Surat</TableHead>
                            <TableHead>{isInbox ? 'Pengirim' : 'Kepada'}</TableHead>
                            <TableHead className="hidden lg:table-cell">Divisi Tujuan</TableHead>
                            {!isInbox && <TableHead className="hidden xl:table-cell">Jenis Surat</TableHead>}
                            <TableHead className="hidden md:table-cell">Kategori</TableHead>
                            <TableHead className="hidden md:table-cell">Prioritas</TableHead>
                            <TableHead className="hidden lg:table-cell">Diterima</TableHead>
                            <TableHead className="hidden sm:table-cell">Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentLetters.map((letter, index) => {
                            const latestReply =
                                letter.replyHistory && letter.replyHistory.length > 0
                                    ? letter.replyHistory[letter.replyHistory.length - 1]
                                    : undefined;
                            const hasReply = Boolean(latestReply || letter.replyNote);

                            return (
                                <TableRow key={letter.id}>
                                    <TableCell className="font-medium text-slate-900">
                                        {startIndex + index + 1}
                                    </TableCell>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        <div>{letter.letterNumber}</div>
                                        <div className="sm:hidden text-xs text-slate-500 mt-1">
                                            {getStatusBadge(letter.status)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm text-slate-900">
                                            {isInbox ? letter.senderName : letter.recipientName}
                                        </p>
                                        {letter.senderPosition && (
                                            <p className="text-xs text-slate-500">
                                                {letter.senderPosition}
                                            </p>
                                        )}
                                        <div className="sm:hidden text-xs text-slate-500 mt-1">
                                            {isInbox ? letter.senderDivision : letter.senderName}
                                        </div>
                                        <div className="md:hidden text-xs mt-2 space-y-0.5">
                                            <div><PriorityBadge priority={letter.priority} /></div>
                                            <Badge variant="outline" className="text-[10px]">{letter.category}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <p className="text-sm font-medium text-slate-900">
                                            {letter.targetDivision ?? letter.recipientName ?? '-'}
                                        </p>
                                    </TableCell>
                                    {!isInbox && (
                                        <TableCell className="hidden xl:table-cell">
                                            <Badge variant="outline">{(letter.letterType ?? '').trim() || 'Tidak diketahui'}</Badge>
                                        </TableCell>
                                    )}
                                    <TableCell className="hidden md:table-cell">
                                        <Badge variant="outline">{letter.category}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <PriorityBadge priority={letter.priority} />
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell whitespace-nowrap">{letter.receivedAt ?? letter.date}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        {getStatusBadge(letter.status)}
                                        {hasReply && (
                                            <p className="mt-1 text-xs font-medium text-emerald-700">
                                                Balasan tersedia
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onSelect(letter)}
                                                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Detail Surat</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {onArchive && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                                disabled={archiveProcessing || letter.status === 'Diarsipkan'}
                                                                onClick={() => {
                                                                    if (Date.now() - lastArchiveConfirmAtRef.current < 450) {
                                                                        return;
                                                                    }
                                                                    setArchiveTarget(letter);
                                                                }}
                                                            >
                                                                {archiveProcessing && archivingId === letter.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Archive className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Arsipkan</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
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

            {onArchive && (
                <AlertDialog
                    open={Boolean(archiveTarget)}
                    onOpenChange={(nextOpen) => {
                        if (!nextOpen) {
                            closeArchiveDialog();
                        }
                    }}
                >
                    <AlertDialogContent
                        className="bg-white"
                        onCloseAutoFocus={(event) => event.preventDefault()}
                    >
                        <AlertDialogHeader>
                            <AlertDialogTitle>Arsipkan surat ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {canArchiveTarget
                                    ? 'Surat akan dipindahkan ke tab Arsip dan tidak muncul di daftar aktif.'
                                    : 'Surat belum didisposisi oleh HR sehingga belum dapat diarsipkan.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeArchiveDialog}
                                disabled={isTargetProcessing}
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                className="bg-rose-600 hover:bg-rose-700"
                                disabled={!canArchiveTarget || archiveProcessing || isTargetProcessing}
                                onClick={() => {
                                    if (!archiveTarget || !canArchiveTarget || archiveProcessing || isTargetProcessing) {
                                        return;
                                    }
                                    const selectedLetter = archiveTarget;
                                    lastArchiveConfirmAtRef.current = Date.now();
                                    closeArchiveDialog();
                                    onArchive(selectedLetter);
                                }}
                            >
                                {isTargetProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    'Ya, Arsipkan'
                                )}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}



