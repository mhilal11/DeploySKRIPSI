import {
    AlertTriangle,
    XCircle,
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
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';


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
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-xl gap-0 p-0 sm:max-h-[90vh]">
                <DialogHeader className="space-y-4 border-b p-6 pb-6">
                    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                        <div className="rounded-full bg-red-100 p-3">
                            <Ban className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                Maaf, Anda Belum Memenuhi Kriteria
                            </DialogTitle>
                            <DialogDescription className="text-base text-slate-600">
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
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] overflow-y-auto">
                    <div className="space-y-6 p-6">
                        {/* Passed Criteria Section */}
                        {passed.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
                                        Memenuhi Syarat
                                    </Badge>
                                    <Separator className="flex-1" />
                                </div>
                                <div className="grid gap-3">
                                    {passed.map((item, index) => {
                                        const Icon = fieldIcons[item.field] ?? CheckCircle2;
                                        return (
                                            <Alert key={`passed-${index}`} className="border-green-200 bg-green-50/30">
                                                <Icon className="h-4 w-4 text-green-600" />
                                                <AlertTitle className="mb-0 text-sm font-medium text-green-800">
                                                    Kriteria Terpenuhi
                                                </AlertTitle>
                                                <AlertDescription className="text-sm text-green-700/90">
                                                    {item.message}
                                                </AlertDescription>
                                            </Alert>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Failed Criteria Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">
                                    Tidak Memenuhi Syarat
                                </Badge>
                                <Separator className="flex-1" />
                            </div>
                            <div className="grid gap-3">
                                {failures.map((failure, index) => {
                                    const Icon = fieldIcons[failure.field] ?? AlertTriangle;
                                    return (
                                        <Alert key={`failed-${index}`} variant="destructive" className="border-red-200 bg-red-50 text-red-800 [&>svg]:text-red-600">
                                            <Icon className="h-4 w-4" />
                                            <AlertTitle className="mb-0 text-sm font-medium">
                                                Perlu Penyesuaian
                                            </AlertTitle>
                                            <AlertDescription className="text-sm opacity-90">
                                                {failure.message}
                                            </AlertDescription>
                                        </Alert>
                                    );
                                })}
                            </div>
                        </div>

                        <Alert className="border-blue-200 bg-blue-50/50">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800">Saran</AlertTitle>
                            <AlertDescription className="text-blue-700">
                                Silakan perbarui data profil Anda agar sesuai dengan kriteria yang dibutuhkan, lalu coba lamar kembali.
                            </AlertDescription>
                        </Alert>
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2 border-t bg-slate-50/50 p-6">
                    <Button onClick={onClose} variant="default" className="w-full sm:w-auto">
                        Tutup & Perbarui Profil
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


