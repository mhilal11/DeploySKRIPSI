import { CheckCircle2, User, Briefcase } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

import { ApplicantRecord } from '../types';

interface AcceptanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    applicant: ApplicantRecord | null;
    isSubmitting?: boolean;
}

export default function AcceptanceModal({
    isOpen,
    onClose,
    onConfirm,
    applicant,
    isSubmitting = false,
}: AcceptanceModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[96vw] gap-6 border-0 p-4 sm:w-full sm:max-w-lg sm:gap-8 sm:p-8">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 ring-4 ring-green-50">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                Terima Pelamar
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-base">
                                Konfirmasi penerimaan pelamar sebagai karyawan baru.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {applicant && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 mt-0.5">
                                    <User className="h-4 w-4 text-blue-600" />
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
                                    <Briefcase className="h-4 w-4 text-blue-600" />
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

                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                        <div className="flex gap-3">
                            <div className="shrink-0 mt-0.5">
                                <span className="flex h-2 w-2 rounded-full bg-blue-600 mt-2" />
                            </div>
                            <p className="text-sm text-blue-800 leading-relaxed">
                                <span className="font-semibold">Catatan:</span> Status pelamar akan diubah menjadi <span className="font-bold underline decoration-blue-300 decoration-2 underline-offset-2">Hired</span> dan proses onboarding akan otomatis dimulai.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="h-11 w-full px-6 text-slate-500 hover:text-slate-900 sm:w-auto"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="h-11 w-full bg-green-600 px-6 text-white shadow-sm hover:bg-green-700 sm:w-auto"
                    >
                        {isSubmitting ? 'Memproses...' : 'Konfirmasi Terima'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


