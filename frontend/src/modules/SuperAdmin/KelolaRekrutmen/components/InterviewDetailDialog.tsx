import { Calendar, Clock, MapPin, User, Link as LinkIcon, FileText } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';


import { ApplicantRecord } from '../types';

interface InterviewDetailDialogProps {
    applicant: ApplicantRecord | null;
    onClose: () => void;
}

export default function InterviewDetailDialog({
    applicant,
    onClose,
}: InterviewDetailDialogProps) {
    if (!applicant || !applicant.has_interview_schedule) {
        return null;
    }

    const getModeBadge = (mode: string) => {
        const styles = {
            'Online': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
            'Offline': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
            'Hybrid': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
        };
        return (
            <Badge variant="outline" className={`font-medium px-2.5 py-0.5 ${styles[mode as keyof typeof styles] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {mode}
            </Badge>
        );
    };

    return (
        <Dialog open={!!applicant} onOpenChange={() => onClose()}>
            <DialogContent className="max-h-[90vh] w-[96vw] overflow-y-auto border-0 p-4 transition-all duration-200 sm:w-full sm:max-w-[500px] sm:p-6">
                <DialogHeader className="mb-2">
                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                        Detail Jadwal Interview
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Applicant Info - Integrated Card */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Informasi Pelamar</h3>
                                <p className="text-base font-semibold text-slate-900">{applicant.name}</p>
                                <p className="text-sm text-slate-600">{applicant.position}</p>
                            </div>
                            <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600 shadow-sm">
                                ID: {String(applicant.id).padStart(3, '0')}
                            </Badge>
                        </div>
                    </div>

                    {/* Interview Schedule Details */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h3 className="text-sm font-semibold text-slate-900">Jadwal & Lokasi</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {/* Date */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Tanggal</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 pl-5.5">{applicant.interview_date || '-'}</p>
                            </div>

                            {/* Time */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Waktu</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 pl-5.5">
                                    {applicant.interview_time || '-'}
                                    {applicant.interview_end_time ? ` - ${applicant.interview_end_time}` : ''}
                                </p>
                            </div>

                            {/* Mode */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Mode</span>
                                </div>
                                <div className="pl-5.5">
                                    {applicant.interview_mode ? getModeBadge(applicant.interview_mode) : '-'}
                                </div>
                            </div>

                            {/* Interviewer */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <User className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Pewawancara</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 pl-5.5">{applicant.interviewer_name || '-'}</p>
                            </div>
                        </div>

                        {/* Link/Location - Full Width */}
                        {(applicant as any).interview_link && (
                            <div className="space-y-1.5 pt-2">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Link / Lokasi Detail</span>
                                </div>
                                <div className="pl-5.5">
                                    <a
                                        href={(applicant as any).interview_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all font-medium transition-colors"
                                    >
                                        {(applicant as any).interview_link}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {applicant.interview_notes && (
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium uppercase tracking-wide">Catatan Tambahan</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-lg p-3 mx-1">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{applicant.interview_notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-8 flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                        onClick={onClose}
                        variant="default"
                        className="w-full min-w-[100px] bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
                    >
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


