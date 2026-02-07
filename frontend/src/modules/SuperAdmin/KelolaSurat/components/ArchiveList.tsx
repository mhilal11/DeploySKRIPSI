import { FileText, Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';

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
import { Card } from '@/shared/components/ui/card';

import { LetterRecord } from './LettersTable';

interface ArchiveListProps {
    letters: LetterRecord[];
    onSelect: (letter: LetterRecord) => void;
    onUnarchive?: (letter: LetterRecord) => void;
    unarchivingId?: number | null;
    unarchiveProcessing?: boolean;
}

export default function ArchiveList({
    letters,
    onSelect,
    onUnarchive,
    unarchivingId,
    unarchiveProcessing,
}: ArchiveListProps) {
    if (letters.length === 0) {
        return (
            <div className="py-10 text-center text-slate-500">
                Arsip masih kosong.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {letters.map((letter) => (
                <Card
                    key={letter.id}
                    className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                >
                    <div>
                        <p className="text-sm font-semibold text-slate-900">
                            {letter.subject}
                        </p>
                        <p className="text-xs text-slate-500">
                            {letter.letterNumber} â€¢ {letter.category} â€¢ {letter.date}
                        </p>
                        <p className="text-xs text-slate-500">
                            Pengirim: {letter.senderName} â€¢ Penerima: {letter.recipientName}
                        </p>
                        <p className="text-xs text-slate-500">
                            Divisi Tujuan: {letter.targetDivision ?? letter.recipientName ?? '-'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">Diarsipkan</Badge>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => onSelect(letter)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Detail
                            </Button>
                            {onUnarchive && (
                                <UnarchiveActionButton
                                    letter={letter}
                                    onConfirm={onUnarchive}
                                    disabled={unarchiveProcessing}
                                    isProcessing={unarchiveProcessing && unarchivingId === letter.id}
                                />
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

function UnarchiveActionButton({
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
                        Surat akan dikembalikan ke daftar aktif untuk ditindaklanjuti kembali.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-amber-600 hover:bg-amber-700"
                        disabled={!canUnarchive || disabled || isProcessing}
                        onClick={() => {
                            if (!canUnarchive || disabled || isProcessing) {
                                return;
                            }
                            onConfirm(letter);
                            setOpen(false);
                        }}
                    >
                        {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            'Ya, Batalkan Arsip'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


