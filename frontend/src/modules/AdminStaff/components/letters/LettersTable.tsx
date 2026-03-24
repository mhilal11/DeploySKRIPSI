import { Archive, Eye, FileText, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';
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
} from '@/shared/components/ui/tooltip';

import { EmptyState, PriorityBadge, StatusBadge } from './badges';
import { LetterRecord, TabValue } from './types';

interface LettersTableProps {
  letters: LetterRecord[];
  variant?: TabValue;
  newLetterIds?: number[];
  onViewDetail: (letter: LetterRecord) => void;
  onArchive?: (letter: LetterRecord) => void;
  archivingId?: number | null;
  archiveProcessing?: boolean;
  onUnarchive?: (letter: LetterRecord) => void;
  unarchivingId?: number | null;
  unarchiveProcessing?: boolean;
}

export function LettersTable({
  letters,
  variant = 'inbox',
  newLetterIds = [],
  onViewDetail,
  onArchive,
  archivingId,
  archiveProcessing,
  onUnarchive,
  unarchivingId,
  unarchiveProcessing,
}: LettersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [letters, variant]);

  if (letters.length === 0) {
    return <EmptyState message="Belum ada surat pada tab ini." />;
  }

  const totalPages = Math.ceil(letters.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLetters = letters.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const newIdSet = new Set(newLetterIds);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: Array<number | 'ellipsis'> = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 md:hidden">
        {paginatedLetters.map((letter) => {
          const latestReply =
            letter.replyHistory && letter.replyHistory.length > 0
              ? letter.replyHistory[letter.replyHistory.length - 1]
              : undefined;
          const hasReply = Boolean(latestReply || letter.replyNote);
          const isNewlyReceived = variant === 'inbox' && newIdSet.has(letter.id);

          return (
            <div
              key={letter.id}
              className={`rounded-xl border p-4 shadow-sm ${
                isNewlyReceived ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{letter.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">{letter.letterNumber}</p>
                </div>
                {letter.hasAttachment && <FileText className="h-4 w-4 shrink-0 text-slate-400" />}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="min-w-0">
                  <p className="text-slate-500">Pengirim</p>
                  <p className="truncate font-medium text-slate-900">{letter.sender}</p>
                  <p className="truncate text-slate-500">{letter.from}</p>
                </div>
                <div>
                  <p className="text-slate-500">Kategori</p>
                  <span className="mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs">
                    {letter.category}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500">Prioritas</p>
                  <div className="mt-1">
                    <PriorityBadge priority={letter.priority} />
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={letter.status} />
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>Diterima: <span className="text-slate-700">{letter.receivedAt ?? '-'}</span></p>
                <p>Dibuat: <span className="text-slate-700">{letter.date}</span></p>
                {isNewlyReceived && (
                  <p className="font-medium text-blue-600">Surat baru diterima</p>
                )}
                {hasReply && (
                  <p className="font-medium text-emerald-600">Balasan dikirim</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-[120px] border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => onViewDetail(letter)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Detail
                </Button>

                {onArchive && variant !== 'archive' && (
                  <ArchiveConfirmButton
                    letter={letter}
                    onConfirm={onArchive}
                    disabled={archiveProcessing}
                    isProcessing={archiveProcessing && archivingId === letter.id}
                    buttonClassName="flex-1 min-w-[120px] justify-center"
                    buttonSize="sm"
                    showLabel
                  />
                )}
                {onUnarchive && variant === 'archive' && (
                  <UnarchiveConfirmButton
                    letter={letter}
                    onConfirm={onUnarchive}
                    disabled={unarchiveProcessing}
                    isProcessing={unarchiveProcessing && unarchivingId === letter.id}
                    buttonClassName="flex-1 min-w-[140px] justify-center"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor</TableHead>
              <TableHead>Pengirim</TableHead>
              <TableHead>Subjek</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Tanggal Terima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLetters.map((letter) => {
              const latestReply =
                letter.replyHistory && letter.replyHistory.length > 0
                  ? letter.replyHistory[letter.replyHistory.length - 1]
                  : undefined;
              const hasReply = Boolean(latestReply || letter.replyNote);
              const isNewlyReceived = variant === 'inbox' && newIdSet.has(letter.id);

              return (
                <TableRow key={letter.id} className={isNewlyReceived ? 'bg-blue-50/60' : undefined}>
                  <TableCell>{letter.letterNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{letter.sender}</p>
                      <p className="text-xs text-slate-500">{letter.from}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{letter.subject}</span>
                      {letter.hasAttachment && <FileText className="h-4 w-4 text-slate-400" />}
                      {isNewlyReceived && (
                        <Badge className="bg-blue-600 text-white hover:bg-blue-600">Baru</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-md border px-2 py-0.5 text-xs">
                      {letter.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={letter.priority} />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-900">{letter.receivedAt ?? '-'}</p>
                    <p className="text-[11px] text-slate-500">Surat dibuat: {letter.date}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={letter.status} />
                    {isNewlyReceived && (
                      <p className="mt-1 text-[11px] font-medium text-blue-600">
                        Surat baru diterima
                      </p>
                    )}
                    {hasReply && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-600">
                        Balasan dikirim
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
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => onViewDetail(letter)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Detail Surat</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {onArchive && variant !== 'archive' && (
                        <ArchiveConfirmButton
                          letter={letter}
                          onConfirm={onArchive}
                          disabled={archiveProcessing}
                          isProcessing={archiveProcessing && archivingId === letter.id}
                        />
                      )}
                      {onUnarchive && variant === 'archive' && (
                        <UnarchiveConfirmButton
                          letter={letter}
                          onConfirm={onUnarchive}
                          disabled={unarchiveProcessing}
                          isProcessing={unarchiveProcessing && unarchivingId === letter.id}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {letters.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Menampilkan <span className="font-medium">{startIndex + 1}</span> -{' '}
            <span className="font-medium">
              {Math.min(startIndex + ITEMS_PER_PAGE, letters.length)}
            </span>{' '}
            dari <span className="font-medium">{letters.length}</span> surat
          </div>

          <Pagination className="w-auto mx-0 justify-center sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {getPageNumbers().map((page, idx) => (
                <PaginationItem key={idx}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={currentPage === page}
                      onClick={(e) => {
                        e.preventDefault();
                        if (typeof page === 'number') handlePageChange(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

function ArchiveConfirmButton({
  letter,
  onConfirm,
  disabled,
  isProcessing,
  buttonClassName,
  buttonSize = 'icon',
  showLabel = false,
}: {
  letter: LetterRecord;
  onConfirm: (letter: LetterRecord) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  buttonClassName?: string;
  buttonSize?: 'icon' | 'sm';
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canArchive = ['Didisposisi', 'Disposisi Final', 'Ditolak HR'].includes(letter.status);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={buttonSize}
              className={`text-rose-600 hover:bg-rose-50 hover:text-rose-700 ${buttonSize === 'icon' ? 'h-8 w-8' : ''} ${buttonClassName ?? ''}`}
              disabled={disabled || letter.status === 'Diarsipkan'}
              onClick={() => setOpen(true)}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  {showLabel && <span className="ml-2">Arsipkan</span>}
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Arsipkan</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Arsipkan surat?</AlertDialogTitle>
          <AlertDialogDescription>
            {canArchive
              ? 'Surat akan disimpan sebagai arsip dan tidak tampil di daftar aktif.'
              : 'Surat ini belum didisposisi HR sehingga belum dapat diarsipkan.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700"
            disabled={!canArchive || disabled || isProcessing}
            onClick={() => {
              if (!canArchive || disabled || isProcessing) return;
              onConfirm(letter);
              setOpen(false);
            }}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Arsipkan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UnarchiveConfirmButton({
  letter,
  onConfirm,
  disabled,
  isProcessing,
  buttonClassName,
}: {
  letter: LetterRecord;
  onConfirm: (letter: LetterRecord) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const canUnarchive = letter.status === 'Diarsipkan';

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`text-amber-700 hover:text-amber-800 ${buttonClassName ?? ''}`}
          disabled={disabled || !canUnarchive}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          Batalkan Arsip
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan arsip surat?</AlertDialogTitle>
          <AlertDialogDescription>
            Surat akan dikembalikan ke daftar aktif untuk diproses kembali.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-600 hover:bg-amber-700"
            disabled={!canUnarchive || disabled || isProcessing}
            onClick={() => {
              if (!canUnarchive || disabled || isProcessing) return;
              onConfirm(letter);
              setOpen(false);
            }}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Batalkan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
