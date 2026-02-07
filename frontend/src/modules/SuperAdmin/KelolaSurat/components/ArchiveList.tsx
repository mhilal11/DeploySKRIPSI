import { FileText, Loader2, RotateCcw } from 'lucide-react';
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
    const [unarchiveTarget, setUnarchiveTarget] = useState<LetterRecord | null>(null);
    const lastUnarchiveConfirmAtRef = useRef(0);
    const closeUnarchiveDialog = () => setUnarchiveTarget(null);
    const canUnarchiveTarget = unarchiveTarget?.status === 'Diarsipkan';
    const isTargetProcessing =
        Boolean(unarchiveProcessing) && unarchiveTarget !== null && unarchivingId === unarchiveTarget.id;

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
                            {letter.letterNumber}  {letter.category}  {letter.date}
                        </p>
                        <p className="text-xs text-slate-500">
                            Pengirim: {letter.senderName}  Penerima: {letter.recipientName}
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-amber-700 hover:text-amber-800"
                                    disabled={unarchiveProcessing || letter.status !== 'Diarsipkan'}
                                    onClick={() => {
                                        if (Date.now() - lastUnarchiveConfirmAtRef.current < 450) {
                                            return;
                                        }
                                        setUnarchiveTarget(letter);
                                    }}
                                >
                                    {unarchiveProcessing && unarchivingId === letter.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                    )}
                                    Batalkan Arsip
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            ))}

            {onUnarchive && (
                <AlertDialog
                    open={Boolean(unarchiveTarget)}
                    onOpenChange={(nextOpen) => {
                        if (!nextOpen) {
                            closeUnarchiveDialog();
                        }
                    }}
                >
                    <AlertDialogContent
                        className="bg-white"
                        onCloseAutoFocus={(event) => event.preventDefault()}
                    >
                        <AlertDialogHeader>
                            <AlertDialogTitle>Batalkan arsip surat?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Surat akan dikembalikan ke daftar aktif untuk ditindaklanjuti kembali.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeUnarchiveDialog}
                                disabled={isTargetProcessing}
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                className="bg-amber-600 hover:bg-amber-700"
                                disabled={!canUnarchiveTarget || unarchiveProcessing || isTargetProcessing}
                                onClick={() => {
                                    if (!unarchiveTarget || !canUnarchiveTarget || unarchiveProcessing || isTargetProcessing) {
                                        return;
                                    }
                                    const selectedLetter = unarchiveTarget;
                                    lastUnarchiveConfirmAtRef.current = Date.now();
                                    closeUnarchiveDialog();
                                    onUnarchive(selectedLetter);
                                }}
                            >
                                {isTargetProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    'Ya, Batalkan Arsip'
                                )}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}




