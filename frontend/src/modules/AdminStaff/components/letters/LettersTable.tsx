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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor</TableHead>
              <TableHead>Pengirim</TableHead>
              <TableHead>Subjek</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Tanggal</TableHead>
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

              return (
                <TableRow key={letter.id}>
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
                  <TableCell>{letter.date}</TableCell>
                  <TableCell>
                    <StatusBadge status={letter.status} />
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
}: {
  letter: LetterRecord;
  onConfirm: (letter: LetterRecord) => void;
  disabled?: boolean;
  isProcessing?: boolean;
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
              size="icon"
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              disabled={disabled || letter.status === 'Diarsipkan'}
              onClick={() => setOpen(true)}
            >
              {isProcessing ? (
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
}: {
  letter: LetterRecord;
  onConfirm: (letter: LetterRecord) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canUnarchive = letter.status === 'Diarsipkan';

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:text-amber-800"
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
