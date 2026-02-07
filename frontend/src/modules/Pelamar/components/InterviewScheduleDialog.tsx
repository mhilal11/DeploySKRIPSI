import {
    Calendar,
    Clock,
    Video,
    FileText,
    MapPin,
    User,
    Link as LinkIcon,
    ExternalLink
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
import { cn } from '@/shared/components/ui/utils';

interface InterviewData {
    date: string;
    time: string;
    mode: string;
    link?: string | null;
    interviewer: string;
    notes?: string | null;
}

interface ApplicationStatus {
    position: string;
    interview?: InterviewData | null;
}

interface InterviewScheduleDialogProps {
    application: ApplicationStatus | null;
    onClose: () => void;
}

export default function InterviewScheduleDialog({
    application,
    onClose,
}: InterviewScheduleDialogProps) {
    const isOnline = application?.interview?.mode?.toLowerCase().includes('online') ||
        application?.interview?.mode?.toLowerCase().includes('google meet') ||
        application?.interview?.mode?.toLowerCase().includes('zoom');

    return (
        <Dialog open={!!application} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
                <DialogHeader className="px-5 py-4 border-b">
                    <DialogTitle className="text-lg">Jadwal Interview</DialogTitle>
                    <DialogDescription className="text-sm">
                        Detail jadwal dan informasi interview Anda.
                    </DialogDescription>
                </DialogHeader>

                {application?.interview && (
                    <ScrollArea className="max-h-[70vh]">
                        <div className="px-5 py-5 space-y-6">

                            {/* Position & Interviewer */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-lg border">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Posisi</p>
                                    <p className="text-sm font-semibold text-slate-900 line-clamp-2">{application.position}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Pewawancara</p>
                                    <div className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{application.interview.interviewer}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Time & Date */}
                            <div className="rounded-lg border bg-blue-50/30 p-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Calendar className="h-4 w-4" />
                                            <span className="text-xs font-semibold uppercase tracking-wide">Tanggal</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 pl-6">
                                            {application.interview.date}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Clock className="h-4 w-4" />
                                            <span className="text-xs font-semibold uppercase tracking-wide">Waktu</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 pl-6">
                                            {application.interview.time} WIB
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Method & Location */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "p-2 rounded-md",
                                        isOnline ? "bg-purple-100 text-purple-600" : "bg-orange-100 text-orange-600"
                                    )}>
                                        {isOnline ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">
                                            {isOnline ? 'Interview Online' : 'Interview Offline'}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {application.interview.mode}
                                        </p>
                                    </div>
                                </div>

                                {/* Link Button if Online */}
                                {application.interview.link && (
                                    <div className="pl-11">
                                        <Button
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                            onClick={() => window.open(application.interview?.link!, '_blank')}
                                        >
                                            <Video className="h-4 w-4" />
                                            Join Meeting
                                            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                        </Button>
                                        <p className="text-xs text-center text-slate-400 mt-2">
                                            Klik tombol di atas untuk bergabung ke ruang interview
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {application.interview.notes && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-start gap-2.5">
                                        <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Catatan</p>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                {application.interview.notes}
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


