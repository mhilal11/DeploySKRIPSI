import { AlertCircle, XCircle, User, Briefcase } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

import { ApplicantRecord } from '../types';

interface RejectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    applicant: ApplicantRecord | null;
    isSubmitting?: boolean;
}

export default function RejectionModal({
    isOpen,
    onClose,
    onConfirm,
    applicant,
    isSubmitting = false,
}: RejectionModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!reason.trim()) {
            setError('Alasan penolakan wajib diisi');
            return;
        }

        onConfirm(reason.trim());
        handleClose();
    };

    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg p-8 gap-8">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                Tolak Pelamar
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-base">
                                Anda akan menolak pelamar berikut.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {applicant && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 mt-0.5">
                                    <User className="h-4 w-4 text-slate-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                                        Nama Pelamar
                                    </p>
                                    <p className="text-lg font-bold text-slate-900 leading-none">
                                        {applicant.name}
                                    </p>
                                </div>
                            </div>

                            <div className="h-px bg-slate-200/80" />

                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 mt-0.5">
                                    <Briefcase className="h-4 w-4 text-slate-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                                        Posisi yang Dilamar
                                    </p>
                                    <p className="text-lg font-bold text-slate-900 leading-none">
                                        {applicant.position}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rejection-reason" className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                                Alasan Penolakan <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="rejection-reason"
                                placeholder="Tuliskan alasan penolakan secara detail dan profesional..."
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (error) setError('');
                                }}
                                className={`min-h-[120px] resize-none text-base p-4 rounded-lg bg-white ${error
                                        ? 'border-red-300 focus-visible:ring-red-200'
                                        : 'border-slate-200 focus-visible:ring-slate-200'
                                    }`}
                                disabled={isSubmitting}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <div className="flex items-start gap-2 text-xs text-slate-500">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <p>Alasan ini akan dikirimkan kepada pelamar sebagai feedback resmi.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3 sm:gap-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-slate-500 hover:text-slate-900 h-11 px-6"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-11 px-6"
                    >
                        {isSubmitting ? 'Memproses...' : 'Konfirmasi Penolakan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


