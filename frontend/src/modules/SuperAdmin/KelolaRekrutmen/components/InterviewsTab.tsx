import { Calendar as CalendarIcon, CheckCircle2, Clock, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

import { InterviewSchedule, ApplicantRecord } from '../types';
import InterviewDetailDialog from './InterviewDetailDialog';

interface InterviewsTabProps {
    interviews: InterviewSchedule[];
    onViewDetails?: (applicationId: number) => void;
}

const completedStatuses = ['Offering', 'Hired', 'Rejected'];

function getInterviewStatusBadge(status?: string | null) {
    if (!status || status === 'Interview') {
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-2 py-0.5">Dijadwalkan</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-2 py-0.5">Selesai</Badge>;
}

export default function InterviewsTab({ interviews, onViewDetails }: InterviewsTabProps) {
    const [selectedInterview, setSelectedInterview] = useState<InterviewSchedule | null>(null);
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [completedPage, setCompletedPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const upcoming = useMemo(
        () => interviews.filter((i) => !i.status || !completedStatuses.includes(i.status)),
        [interviews],
    );
    const completed = useMemo(
        () => interviews.filter((i) => i.status && completedStatuses.includes(i.status)),
        [interviews],
    );

    const upcomingPages = Math.ceil(upcoming.length / ITEMS_PER_PAGE);
    const completedPages = Math.ceil(completed.length / ITEMS_PER_PAGE);
    const paginatedUpcoming = upcoming.slice((upcomingPage - 1) * ITEMS_PER_PAGE, upcomingPage * ITEMS_PER_PAGE);
    const paginatedCompleted = completed.slice((completedPage - 1) * ITEMS_PER_PAGE, completedPage * ITEMS_PER_PAGE);

    const handleViewDetail = (interview: InterviewSchedule) => {
        if (onViewDetails && interview.application_id) {
            onViewDetails(interview.application_id);
        } else {
            setSelectedInterview(interview);
        }
    };

    const getApplicantFromInterview = (interview: InterviewSchedule): ApplicantRecord | null => {
        if (!interview) return null;
        return {
            id: interview.application_id || 0,
            name: interview.candidate,
            email: '',
            position: interview.position,
            status: (interview.status ?? 'Interview') as any,
            date: interview.date,
            submitted_date: interview.date,
            has_interview_schedule: true,
            interview_date: interview.date,
            interview_time: interview.time,
            interview_end_time: interview.end_time,
            interview_mode: interview.mode,
            interviewer_name: interview.interviewer,
        } as ApplicantRecord;
    };

    const renderInterviewCard = (interview: InterviewSchedule, isCompleted: boolean) => (
        <div
            key={`${interview.candidate}-${interview.position}-${interview.time}`}
            className={`rounded-2xl border p-4 shadow-sm ${isCompleted
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-slate-200 bg-white'
                }`}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-slate-500">{interview.position}</p>
                        {getInterviewStatusBadge(interview.status)}
                    </div>
                    <p className={`text-lg font-semibold ${isCompleted ? 'text-green-900' : 'text-blue-900'}`}>
                        {interview.candidate}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                                {interview.date}  {interview.time}
                                {interview.end_time ? ` - ${interview.end_time}` : ''}
                            </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {interview.mode}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-500">
                        Interviewer
                        <p className="font-medium text-slate-900">
                            {interview.interviewer}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleViewDetail(interview)}
                    >
                        <Eye className="h-4 w-4" />
                        Detail
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderPagination = (
        page: number,
        totalPages: number,
        total: number,
        pageSize: number,
        setPage: (p: number) => void,
    ) => {
        if (totalPages <= 1) return null;
        const start = (page - 1) * pageSize;
        return (
            <div className="flex items-center justify-between border-t pt-4 mt-2">
                <div className="text-xs text-slate-500">
                    Menampilkan {start + 1}-{Math.min(start + pageSize, total)} dari {total} data
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-8 w-8 p-0">
                        {'<'}
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button key={p} variant={page === p ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="h-8 w-8 p-0">
                            {p}
                        </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-8 w-8 p-0">
                        {'>'}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Card className="space-y-6 p-6">
            {interviews.length === 0 ? (
                <p className="text-center text-sm text-slate-500">
                    Belum ada jadwal interview yang terdata.
                </p>
            ) : (
                <div className="space-y-8">
                    {/* Akan Datang */}
                    {upcoming.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarIcon className="h-5 w-5 text-blue-600" />
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                                    Akan Datang ({upcoming.length})
                                </h3>
                            </div>
                            <div className="grid gap-4">
                                {paginatedUpcoming.map((interview) => renderInterviewCard(interview, false))}
                            </div>
                            {renderPagination(upcomingPage, upcomingPages, upcoming.length, ITEMS_PER_PAGE, setUpcomingPage)}
                        </div>
                    )}

                    {/* Sudah Selesai */}
                    {completed.length > 0 && (
                        <div>
                            {upcoming.length > 0 && <div className="border-t my-4" />}
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-green-700">
                                    Sudah Selesai ({completed.length})
                                </h3>
                            </div>
                            <div className="grid gap-4">
                                {paginatedCompleted.map((interview) => renderInterviewCard(interview, true))}
                            </div>
                            {renderPagination(completedPage, completedPages, completed.length, ITEMS_PER_PAGE, setCompletedPage)}
                        </div>
                    )}
                </div>
            )}

            {/* Interview Detail Dialog */}
            <InterviewDetailDialog
                applicant={selectedInterview ? getApplicantFromInterview(selectedInterview) : null}
                onClose={() => setSelectedInterview(null)}
            />
        </Card>
    );
}



