import {
    AlertTriangle,
    CheckCircle2,
    User,
    GraduationCap,
    Briefcase,
    Calendar,
    Ban,
    Info,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

export type EligibilityCriteriaResult = {
    field: string;
    message: string;
};

type EligibilityRejectDialogProps = {
    open: boolean;
    onClose: () => void;
    failures: EligibilityCriteriaResult[];
    passed: EligibilityCriteriaResult[];
    jobTitle?: string;
};

const fieldIcons: Record<string, typeof AlertTriangle> = {
    umur: Calendar,
    jenis_kelamin: User,
    pendidikan: GraduationCap,
    pengalaman: Briefcase,
};

export default function EligibilityRejectDialog({
    open,
    onClose,
    failures,
    passed,
    jobTitle,
}: EligibilityRejectDialogProps) {
    const passedCount = passed.length;
    const failedCount = failures.length;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="flex max-h-[90vh] w-[96vw] max-w-2xl flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 space-y-4 border-b bg-white p-5 sm:p-6">
                    <div className="flex items-start gap-3 pr-12">
                        <div className="rounded-xl bg-red-100 p-2.5">
                            <Ban className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <DialogTitle className="text-left text-xl font-bold tracking-tight text-slate-900">
                                Maaf, Anda Belum Memenuhi Kriteria
                            </DialogTitle>
                            <DialogDescription className="text-left text-[15px] leading-relaxed text-slate-600">
                                {jobTitle ? (
                                    <>
                                        Posisi <span className="font-semibold text-slate-800">{jobTitle}</span> membutuhkan kriteria spesifik yang belum terdapat pada profil Anda.
                                    </>
                                ) : (
                                    'Posisi ini membutuhkan kriteria spesifik yang belum terdapat pada profil Anda.'
                                )}
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <p className="text-xs font-medium text-emerald-700">Kriteria Terpenuhi</p>
                            <p className="text-lg font-bold text-emerald-800">{passedCount}</p>
                        </div>
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-xs font-medium text-red-700">Perlu Penyesuaian</p>
                            <p className="text-lg font-bold text-red-800">{failedCount}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40">
                    <div className="space-y-5 p-5 pb-7 sm:p-6 sm:pb-8">
                        {passedCount > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-emerald-800">
                                        Kriteria yang sudah sesuai
                                    </h4>
                                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                        {passedCount} terpenuhi
                                    </Badge>
                                </div>
                                <div className="space-y-2.5">
                                    {passed.map((item, index) => {
                                        const Icon = fieldIcons[item.field] ?? CheckCircle2;
                                        return (
                                            <div
                                                key={`passed-${index}`}
                                                className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="rounded-md bg-emerald-100 p-2">
                                                        <Icon className="h-4 w-4 text-emerald-700" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-emerald-900">
                                                            Kriteria Terpenuhi
                                                        </p>
                                                        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                                                            {item.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-red-800">
                                    Kriteria yang perlu diperbaiki
                                </h4>
                                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">
                                    {failedCount} belum sesuai
                                </Badge>
                            </div>
                            <div className="space-y-2.5">
                                {failures.map((failure, index) => {
                                    const Icon = fieldIcons[failure.field] ?? AlertTriangle;
                                    return (
                                        <div
                                            key={`failed-${index}`}
                                            className="rounded-xl border border-red-200 bg-red-50 p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="rounded-md bg-red-100 p-2">
                                                    <Icon className="h-4 w-4 text-red-700" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-red-900">
                                                        Perlu Penyesuaian
                                                    </p>
                                                    <p className="mt-1 text-sm leading-relaxed text-red-800">
                                                        {failure.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <Alert className="border-blue-200 bg-blue-50">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800">Saran Tindakan</AlertTitle>
                            <AlertDescription className="text-blue-700">
                                Silakan perbarui data profil Anda agar sesuai dengan kriteria yang dibutuhkan, lalu coba lamar kembali.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>

                <DialogFooter className="relative z-10 shrink-0 gap-2 border-t bg-white p-4 sm:p-5">
                    <Button
                        onClick={onClose}
                        variant="default"
                        className="w-full bg-blue-900 text-white hover:bg-blue-800 sm:w-auto"
                    >
                        Tutup & Perbarui Profil
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
