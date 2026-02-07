import { Download, Eye, FileText, Info, MailCheck, SendHorizontal } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

import { LetterRecord } from '@/modules/SuperAdmin/KelolaSurat/components/LettersTable';
import { PriorityBadge } from '@/modules/SuperAdmin/KelolaSurat/components/PriorityBadge';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Separator } from '@/shared/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/components/ui/utils';

interface PendingDispositionPanelProps {
    pendingDisposition: LetterRecord[];
    selectedIds: number[];
    selectedCount: number;
    headerCheckboxState: boolean | 'indeterminate';
    isAllSelected: boolean;
    priorityFilter: string | null;
    onHeaderCheckboxChange: (checked: boolean) => void;
    onToggleSelect: (id: number, checked: boolean) => void;
    onOpenDialog: (letters?: LetterRecord | LetterRecord[]) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
}

export default function PendingDispositionPanel({
    pendingDisposition,
    selectedIds,
    selectedCount,
    headerCheckboxState,
    isAllSelected,
    priorityFilter,
    onHeaderCheckboxChange,
    onToggleSelect,
    onOpenDialog,
    onSelectAll,
    onClearSelection,
}: PendingDispositionPanelProps) {
    // Filter by priority if set
    const filteredByPriority = useMemo(() => {
        if (!priorityFilter) return pendingDisposition;
        return pendingDisposition.filter(letter => letter.priority === priorityFilter);
    }, [pendingDisposition, priorityFilter]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredByPriority.length / itemsPerPage);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (totalPages > 0 && currentPage === 0) {
            setCurrentPage(1);
        }
    }, [pendingDisposition.length, totalPages, currentPage]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredByPriority.slice(start, start + itemsPerPage);
    }, [filteredByPriority, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <Card className="overflow-hidden border border-slate-100 bg-white">
            <div className="flex flex-col gap-3 md:gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-transparent px-3 md:px-6 py-4 md:py-6">
                <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-2 md:gap-3">
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                            <MailCheck className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-blue-600">
                                Menunggu Disposisi HR
                            </p>
                            <p className="text-sm md:text-lg font-semibold text-slate-900">
                                Surat staff yang harus diteruskan ke divisi tujuan
                            </p>
                            <p className="text-xs md:text-sm text-slate-500">
                                Pilih beberapa surat sekaligus dan kirim dalam satu kali proses.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <BadgeCount count={pendingDisposition.length} />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-full border border-blue-100/80 bg-white px-3 py-1 text-xs font-semibold text-blue-700"
                                >
                                    <Info className="h-3.5 w-3.5" />
                                    Status HR
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Surat menanti pengalihan dari tim HR ke divisi tujuan.
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">{selectedCount} surat dipilih</Badge>
                    {/* <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        disabled={selectedCount === 0}
                        onClick={() => onOpenDialog()}
                    >
                        <SendHorizontal className="mr-2 h-4 w-4" />
                        Disposisi Terpilih
                    </Button> */}
                </div>
            </div>

            {pendingDisposition.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-3 md:px-6 py-12 md:py-16 text-center">
                    <MailCheck className="h-8 w-8 md:h-10 md:w-10 text-blue-400" />
                    <p className="text-sm md:text-base font-semibold text-slate-900">Semua surat sudah dialihkan</p>
                    <p className="text-xs md:text-sm text-slate-500">Tidak ada surat yang menunggu disposisi saat ini.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <Table className="text-xs md:text-sm text-slate-700">
                            <TableHeader>
                                <TableRow className="text-slate-500">
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={headerCheckboxState}
                                            onCheckedChange={(value) => onHeaderCheckboxChange(value === true)}
                                            aria-label="Pilih semua surat"
                                        />
                                    </TableHead>
                                    <TableHead>Nomor</TableHead>
                                    <TableHead className="hidden sm:table-cell">Pengirim</TableHead>
                                    <TableHead className="hidden md:table-cell">Divisi Tujuan</TableHead>
                                    <TableHead className="hidden lg:table-cell">Prioritas</TableHead>
                                    <TableHead>Subjek</TableHead>
                                    <TableHead className="hidden xl:table-cell">Lampiran</TableHead>
                                    <TableHead className="hidden lg:table-cell">Tanggal</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedItems.map((letter) => {
                                    const isSelected = selectedIds.includes(letter.id);
                                    const latestReply =
                                        letter.replyHistory && letter.replyHistory.length > 0
                                            ? letter.replyHistory[letter.replyHistory.length - 1]
                                            : undefined;
                                    const replyPreview = latestReply?.note ?? letter.replyNote ?? null;

                                    return (
                                        <TableRow
                                            key={letter.id}
                                            data-state={isSelected ? 'selected' : undefined}
                                            className={cn('text-xs md:text-sm', isSelected && 'bg-blue-50/70')}
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(value) =>
                                                        onToggleSelect(letter.id, value === true)
                                                    }
                                                    aria-label={`Pilih surat ${letter.letterNumber}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                                                {letter.letterNumber}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <div>
                                                    <p className="text-xs md:text-sm font-medium text-slate-900">
                                                        {letter.senderName}
                                                    </p>
                                                    <p className="text-[10px] md:text-xs text-slate-500">
                                                        {letter.senderDivision}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="outline">{letter.targetDivision ?? '-'}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <PriorityBadge priority={letter.priority} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[150px] md:max-w-[180px]">
                                                    <p className="truncate text-xs md:text-sm">{letter.subject}</p>
                                                    {replyPreview && (
                                                        <p className="mt-1 line-clamp-2 text-[10px] md:text-[11px] text-emerald-700">
                                                            Balasan: {replyPreview}
                                                        </p>
                                                    )}
                                                    <div className="sm:hidden text-[10px] text-slate-500 mt-1">
                                                        {letter.senderName}
                                                    </div>
                                                    <div className="md:hidden mt-1">
                                                        <Badge variant="outline" className="text-[10px]">{letter.targetDivision ?? '-'}</Badge>
                                                    </div>
                                                    <div className="lg:hidden mt-1">
                                                        <PriorityBadge priority={letter.priority} />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden xl:table-cell">
                                                {letter.attachment?.url ? (
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-blue-500" />
                                                        <span className="max-w-[112px] truncate text-xs font-semibold text-slate-600">
                                                            {letter.attachment?.name ?? 'Lampiran'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">{letter.date}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* {letter.attachment?.url && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="text-slate-500" asChild>
                                                            <a href={letter.attachment.url} target="_blank" rel="noreferrer">
                                                                <Eye className="h-4 w-4" />
                                                                <span className="sr-only">Lihat lampiran</span>
                                                            </a>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-slate-500" asChild>
                                                            <a
                                                                href={letter.attachment.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                download={letter.attachment.name ?? undefined}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                                <span className="sr-only">Unduh lampiran</span>
                                                            </a>
                                                        </Button>
                                                    </>
                                                )} */}
                                                    <Button
                                                        size="sm"
                                                        className="bg-blue-500 text-white hover:bg-blue-600 text-xs md:text-sm"
                                                        onClick={() => onOpenDialog(letter)}
                                                    >
                                                        Disposisi
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
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-3 md:px-6 py-4 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, pendingDisposition.length)} dari {pendingDisposition.length} surat
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <span className="sr-only">Sebelumnya</span>
                                    <span aria-hidden="true">â€¹</span>
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        className={cn("h-8 w-8 p-0", currentPage === page ? "bg-blue-600 hover:bg-blue-700" : "")}
                                        onClick={() => handlePageChange(page)}
                                    >
                                        {page}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <span className="sr-only">Selanjutnya</span>
                                    <span aria-hidden="true">â€º</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    <Separator />
                    <div className="flex flex-wrap items-center justify-between gap-3 px-3 md:px-6 py-3 md:py-4">
                        <p className="text-xs md:text-sm text-slate-500">
                            {selectedCount > 0
                                ? `${selectedCount} surat siap didisposisi`
                                : 'Pilih minimal satu surat untuk meneruskan.'}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 hover:text-slate-900"
                                disabled={pendingDisposition.length === 0}
                                onClick={() => (isAllSelected ? onClearSelection() : onSelectAll())}
                            >
                                {isAllSelected ? 'Batalkan Pilihan' : 'Pilih Semua'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                disabled={selectedCount === 0}
                                onClick={() => onOpenDialog()}
                            >
                                <SendHorizontal className="mr-2 h-4 w-4" />
                                Disposisi Terpilih
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}

function BadgeCount({ count }: { count: number }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100/80 bg-white px-4 py-1 text-xs font-semibold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {count} surat
        </span>
    );
}



