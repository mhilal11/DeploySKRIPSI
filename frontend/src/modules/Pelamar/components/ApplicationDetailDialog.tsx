import {
    CheckCircle2,
    Circle,
    Briefcase,
    Building2,
    Calendar,
    Clock,
    AlertCircle,
    XCircle
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { cn } from '@/shared/components/ui/utils';

interface ApplicationStage {
    name: string;
    status: 'pending' | 'current' | 'completed';
    date: string;
}

interface ApplicationStatus {
    id: number;
    position: string;
    division: string;
    status: string;
    progress: number;
    stages: ApplicationStage[];
    rejection_reason?: string | null;
    updated_at_diff: string;
    submitted_at_formatted: string;
}

interface ApplicationDetailDialogProps {
    application: ApplicationStatus | null;
    onClose: () => void;
    getStatusBadge: (status: string) => JSX.Element;
}

export default function ApplicationDetailDialog({
    application,
    onClose,
    getStatusBadge,
}: ApplicationDetailDialogProps) {
    return (
        <Dialog open={!!application} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0">
                <DialogHeader className="px-5 py-3 border-b">
                    <DialogTitle className="text-lg">Detail Lamaran</DialogTitle>
                    <DialogDescription className="text-sm">
                        Informasi lengkap mengenai status dan perjalanan lamaran Anda.
                    </DialogDescription>
                </DialogHeader>

                {application && (
                    <ScrollArea className="max-h-[70vh]">
                        <div className="px-5 py-5 space-y-6">
                            {/* Key Information Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-start gap-2.5 rounded-lg border p-2.5 bg-slate-50/50">
                                    <div className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                                        <Briefcase className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Posisi</p>
                                        <p className="text-sm font-semibold text-slate-900">{application.position}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 rounded-lg border p-2.5 bg-slate-50/50">
                                    <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Divisi</p>
                                        <p className="text-sm font-semibold text-slate-900">{application.division}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 rounded-lg border p-2.5 bg-slate-50/50">
                                    <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-600">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Tanggal Melamar</p>
                                        <p className="text-sm font-semibold text-slate-900">{application.submitted_at_formatted}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 rounded-lg border p-2.5 bg-slate-50/50">
                                    <div className="p-1.5 bg-violet-100 rounded-md text-violet-600">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Status Terkini</p>
                                        {getStatusBadge(application.status)}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Timeline Section */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
                                    <div className="h-5 w-1 bg-blue-600 rounded-full" />
                                    Riwayat Perjalanan
                                </h4>
                                <div className="relative pl-2 ml-2 border-l border-slate-200 space-y-6">
                                    {application.stages.map((stage, index) => {
                                        const isLast = index === application.stages.length - 1;
                                        const isCompleted = stage.status === 'completed';
                                        const isCurrent = stage.status === 'current';
                                        const isPending = stage.status === 'pending';

                                        return (
                                            <div key={index} className="relative pl-6">
                                                {/* Dot Indicator */}
                                                <div className={cn(
                                                    "absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 bg-white transition-colors duration-300",
                                                    isCompleted ? "border-green-500 bg-green-500" :
                                                        isCurrent ? "border-blue-500 bg-blue-500 ring-4 ring-blue-100" :
                                                            "border-slate-300"
                                                )} />

                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                                                    <div>
                                                        <p className={cn(
                                                            "text-sm font-semibold transition-colors",
                                                            isCompleted ? "text-slate-900" :
                                                                isCurrent ? "text-blue-700" :
                                                                    "text-slate-500"
                                                        )}>
                                                            {stage.name}
                                                        </p>
                                                        {isCurrent && (
                                                            <p className="text-xs text-blue-600 mt-0.5 font-medium">
                                                                Sedang berlangsung
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-xs font-medium",
                                                            isCompleted ? "text-slate-600" : "text-slate-400"
                                                        )}>
                                                            {stage.date !== '-' ? stage.date : 'Menunggu'}
                                                        </span>
                                                        {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                        {isCurrent && <Clock className="h-4 w-4 text-blue-500 animate-pulse" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Rejection Details */}
                            {application.rejection_reason && (
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-start gap-3">
                                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-semibold text-red-900">Lamaran Tidak Dilanjutkan</h4>
                                            <p className="text-sm text-red-700 leading-relaxed">
                                                {application.rejection_reason}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="px-5 py-3 border-t bg-slate-50">
                    <Button onClick={onClose} variant="outline" size="sm" className="w-full sm:w-auto">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


