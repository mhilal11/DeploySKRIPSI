import { Lightbulb, Sparkles } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

interface ProfileReminderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate: () => void;
}

export default function ProfileReminderDialog({
    open,
    onOpenChange,
    onNavigate,
}: ProfileReminderDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border border-blue-100 p-6">
                <DialogHeader className="space-y-2 text-left">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                        <Lightbulb className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-xl font-semibold text-blue-900">
                        Lengkapi Profil Anda
                    </DialogTitle>
                    <DialogDescription className="text-slate-600">
                        Kami membutuhkan informasi dasar untuk menyesuaikan lamaran Anda.
                        Lengkapi profil terlebih dahulu agar dapat melamar posisi yang tersedia.
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-blue-500" />
                        Pastikan nomor telepon, tanggal lahir, dan alamat sesuai identitas Anda.
                    </p>
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => onOpenChange(false)}
                    >
                        Nanti Saja
                    </Button>
                    <Button
                        className="w-full bg-blue-900 text-white hover:bg-blue-800 sm:w-auto"
                        onClick={onNavigate}
                    >
                        Lengkapi Profil
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


