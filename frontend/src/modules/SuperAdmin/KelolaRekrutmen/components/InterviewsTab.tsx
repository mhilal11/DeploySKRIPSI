import { Calendar as CalendarIcon, Clock, Eye } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

import { InterviewSchedule, ApplicantRecord } from '../types';
import InterviewDetailDialog from './InterviewDetailDialog';

interface InterviewsTabProps {
    interviews: InterviewSchedule[];
    onViewDetails?: (applicationId: number) => void;
}

export default function InterviewsTab({ interviews, onViewDetails }: InterviewsTabProps) {
    const [selectedInterview, setSelectedInterview] = useState<InterviewSchedule | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const totalPages = Math.ceil(interviews.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedInterviews = interviews.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleViewDetail = (interview: InterviewSchedule) => {
        if (onViewDetails && interview.application_id) {
            onViewDetails(interview.application_id);
        } else {
            setSelectedInterview(interview);
        }
    };

    // Convert InterviewSchedule to ApplicantRecord format for dialog
    const getApplicantFromInterview = (interview: InterviewSchedule): ApplicantRecord | null => {
        if (!interview) return null;

        return {
            id: interview.application_id || 0,
            name: interview.candidate,
            email: '',
            position: interview.position,
            status: 'Interview' as any,
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
    return (
        <Card className="space-y-6 p-6">
            {interviews.length === 0 ? (
                <p className="text-center text-sm text-slate-500">
                    Belum ada jadwal interview yang terdata.
                </p>
            ) : (
                <div className="grid gap-4">
                    {paginatedInterviews.map((interview) => (
                        <div
                            key={`${interview.candidate}-${interview.position}-${interview.time}`}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{interview.position}</p>
                                    <p className="text-lg font-semibold text-blue-900">
                                        {interview.candidate}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" />
                                            <span>
                                                {interview.date} â€¢ {interview.time}
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
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-xs text-slate-500">
                        Menampilkan {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, interviews.length)} dari {interviews.length} data
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                        >
                            <span className="sr-only">Previous</span>
                            <span aria-hidden="true">Â«</span>
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(page)}
                                    className="h-8 w-8 p-0"
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0"
                        >
                            <span className="sr-only">Next</span>
                            <span aria-hidden="true">Â»</span>
                        </Button>
                    </div>
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


