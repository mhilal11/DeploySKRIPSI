import { Calendar, Clock, Video, FileText } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

export interface UpcomingInterview {
    position: string;
    date: string;
    time: string;
    mode: string;
    interviewer: string;
    link?: string | null;
    notes?: string | null; 
}

interface UpcomingInterviewCardProps {
    interview?: UpcomingInterview | null;
}

export default function UpcomingInterviewCard({
    interview,
}: UpcomingInterviewCardProps) {
    return (
        <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Jadwal Interview
            </h3>

            {!interview ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Belum ada jadwal interview yang tersedia.
                </p>
            ) : (
                <div className="space-y-4 rounded-lg bg-blue-50 p-6">
                    
                    {/* Posisi */}
                    <div>
                        <p className="text-xs text-slate-500">Posisi</p>
                        <p className="text-base font-semibold text-blue-900">
                            {interview.position}
                        </p>
                    </div>

                    {/* Tanggal & Waktu */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-slate-500">Tanggal</p>
                            <div className="mt-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-900" />
                                <span className="text-slate-800">
                                    {interview.date}
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Waktu</p>
                            <div className="mt-1 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-900" />
                                <span className="text-slate-800">
                                    {interview.time}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Metode */}
                    <div>
                        <p className="text-xs text-slate-500">Metode</p>
                        <div className="mt-1 flex items-center gap-2">
                            <Video className="h-4 w-4 text-blue-900" />
                            <span className="text-slate-800">{interview.mode}</span>
                        </div>
                    </div>

                    {/* Pewawancara */}
                    <div>
                        <p className="text-xs text-slate-500">Pewawancara</p>
                        <p className="mt-1 text-slate-800">
                            {interview.interviewer}
                        </p>
                    </div>

                    {/* Notes */}
                    {interview.notes && (
                        <div>
                            <p className="text-xs text-slate-500">Catatan</p>
                            <div className="mt-1 flex items-start gap-2">
                                <FileText className="h-4 w-4 text-blue-900 mt-0.5" />
                                <p className="text-slate-800 whitespace-pre-line">
                                    {interview.notes}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* LINK MEETING + JOIN BUTTON */}
                    {interview.link && (
                        <div className="pt-2 space-y-2">
                            <a
                                href={interview.link}
                                target="_blank"
                                className="block text-center text-sm text-blue-700 underline"
                            >
                                {interview.link}
                            </a>

                            <Button
                                className="w-full bg-blue-900 hover:bg-blue-800"
                                onClick={() => window.open(interview.link!, '_blank')}
                            >
                                Join Interview
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}


