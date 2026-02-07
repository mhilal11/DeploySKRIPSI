import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

import InterviewDetailDialog from './InterviewDetailDialog';

import type { InterviewSchedule, ApplicantRecord } from '../types';


interface RecruitmentCalendarProps {
    interviews: InterviewSchedule[];
    onNavigate?: (page: string) => void;
    userData?: any;
    isEmbedded?: boolean;
    embedded?: boolean;
}

type InterviewType = 'online' | 'offline';
type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

interface NormalizedInterview {
    id: string;
    applicationId?: number | null;
    candidateName: string;
    role: string;
    date: Date;
    startTime: string;
    endTime?: string | null;
    interviewer: string;
    interviewerRole?: string | null;
    type: InterviewType;
    status: InterviewStatus;
    location?: string | null;
    link?: string | null;
    notes?: string | null;
    rawDate?: string | null;
}

export function RecruitmentCalendar({
    interviews,
    onNavigate,
    userData,
    isEmbedded,
    embedded,
}: RecruitmentCalendarProps) {
    const embeddedMode = isEmbedded || embedded || false;

    const normalizeInterview = (item: InterviewSchedule): NormalizedInterview | null => {
        const rawDate = item.date_value || item.date;
        const parsedDate = rawDate ? new Date(rawDate) : null;
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) return null;

        return {
            id: String(item.application_id ?? `${item.candidate}-${item.time}-${item.position}`),
            applicationId: item.application_id ?? null,
            candidateName: item.candidate,
            role: item.position,
            date: parsedDate,
            startTime: item.time,
            endTime: item.end_time ?? null,
            interviewer: item.interviewer,
            interviewerRole: null,
            type: item.mode === 'Offline' ? 'offline' : 'online',
            status: 'scheduled',
            location: item.mode === 'Offline' ? 'Office / Meeting Room' : item.meeting_link ?? null,
            link: item.mode === 'Online' ? item.meeting_link ?? null : null,
            notes: item.interview_notes ?? '',
            rawDate: rawDate ?? null,
        };
    };

    const normalizedInterviews = useMemo(
        () => interviews.map(normalizeInterview).filter(Boolean) as NormalizedInterview[],
        [interviews],
    );

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [sidebarPage, setSidebarPage] = useState(1);
    const SIDEBAR_PAGE_SIZE = 4;
    const [detailApplicant, setDetailApplicant] = useState<ApplicantRecord | null>(null);

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    const getInterviewsForDate = (date: Date) =>
        normalizedInterviews.filter((i) => isSameDay(i.date, date)).sort((a, b) => a.startTime.localeCompare(b.startTime));

    const getStatusBadge = (status: InterviewStatus) => {
        switch (status) {
            case 'scheduled':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Scheduled</Badge>;
            case 'completed':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelled</Badge>;
            case 'rescheduled':
                return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Rescheduled</Badge>;
            default:
                return null;
        }
    };

    const getTypeIcon = (type: InterviewType) =>
        type === 'online' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />;

    const renderCalendarGrid = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const startDay = getFirstDayOfMonth(currentDate);
        const totalSlots = Math.ceil((daysInMonth + startDay) / 7) * 7;
        const days: JSX.Element[] = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-gray-50/50 min-h-[100px] border-b border-r" />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayInterviews = getInterviewsForDate(date);
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            days.push(
                <div
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[100px] border-b border-r p-2 transition-colors cursor-pointer hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'bg-white'
                        } ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span
                            className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                                }`}
                        >
                            {day}
                        </span>
                        {dayInterviews.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {dayInterviews.length}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-1">
                        {dayInterviews.slice(0, 3).map((interview) => (
                            <div
                                key={interview.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailApplicant(toApplicantRecord(interview));
                                }}
                                className={`text-[10px] p-1.5 rounded border border-l-2 truncate cursor-pointer hover:opacity-80 ${interview.status === 'completed'
                                        ? 'bg-green-50 border-green-200 border-l-green-500 text-green-700'
                                        : ''
                                    } ${interview.status === 'cancelled'
                                        ? 'bg-red-50 border-red-200 border-l-red-500 text-red-700'
                                        : ''
                                    } ${interview.status === 'scheduled'
                                        ? 'bg-blue-50 border-blue-200 border-l-blue-500 text-blue-700'
                                        : ''
                                    }`}
                            >
                                <span className="font-semibold mr-1">{interview.startTime}</span>
                                {interview.candidateName}
                            </div>
                        ))}
                        {dayInterviews.length > 3 && (
                            <div className="text-[10px] text-gray-400 pl-1">+ {dayInterviews.length - 3} more</div>
                        )}
                    </div>
                </div>,
            );
        }

        const remainingSlots = totalSlots - days.length;
        for (let i = 0; i < remainingSlots; i++) {
            days.push(<div key={`empty-next-${i}`} className="bg-gray-50/50 min-h-[100px] border-b border-r" />);
        }

        return days;
    };

    const sidebarInterviews = selectedDate
        ? getInterviewsForDate(selectedDate)
        : normalizedInterviews.filter((i) => i.status === 'scheduled').slice(0, 8);
    const totalSidebarPages = Math.max(1, Math.ceil(sidebarInterviews.length / SIDEBAR_PAGE_SIZE));
    const sidebarItems = sidebarInterviews.slice(
        (sidebarPage - 1) * SIDEBAR_PAGE_SIZE,
        sidebarPage * SIDEBAR_PAGE_SIZE,
    );

    const goToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        setSidebarPage(1);
    };

    const toApplicantRecord = (interview: NormalizedInterview): ApplicantRecord => ({
        id: interview.applicationId ?? (Number.parseInt(interview.id, 10) || 0),
        name: interview.candidateName,
        position: interview.role,
        status: 'Interview' as any,
        date: interview.rawDate ?? interview.date.toISOString(),
        submitted_date: interview.rawDate ?? interview.date.toISOString(),
        email: '',
        has_interview_schedule: true,
        interview_date: interview.rawDate ?? interview.date.toISOString().split('T')[0],
        interview_time: interview.startTime,
        interview_end_time: interview.endTime ?? undefined,
        interview_mode: interview.type === 'online' ? 'Online' : 'Offline',
        interviewer_name: interview.interviewer,
        meeting_link: interview.link ?? undefined,
        interview_notes: interview.notes ?? undefined,
    });

    const Content = (
        <div className={`h-full ${embeddedMode ? '' : 'p-6 lg:p-8 space-y-6'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-blue-600" />
                        Interview Schedule
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Kelola jadwal interview dari data pelamar yang ada.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={prevMonth}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <span className="text-lg font-semibold min-w-[140px] text-center">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <Button variant="ghost" size="icon" onClick={nextMonth}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={goToday}>
                                Today
                            </Button>
                        </div>
                    </div>

                    <Card className="overflow-hidden shadow-sm">
                        <div className="grid grid-cols-7 border-b bg-gray-50">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div
                                    key={day}
                                    className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 bg-gray-200 gap-px border-l">
                            {renderCalendarGrid()}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-4 shadow-sm h-full flex flex-col">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {selectedDate
                                ? `Schedule for ${selectedDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                })}`
                                : 'Upcoming Interviews'}
                        </h3>

                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-3">
                                {sidebarItems.map((interview) => (
                                    <div
                                        key={interview.id}
                                        onClick={() => setDetailApplicant(toApplicantRecord(interview))}
                                        className="p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group bg-white"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                {interview.startTime}
                                                {interview.endTime ? ` - ${interview.endTime}` : ''}
                                            </span>
                                            {getStatusBadge(interview.status)}
                                        </div>
                                        <h4 className="font-medium text-gray-900 text-sm group-hover:text-blue-700">
                                            {interview.candidateName}
                                        </h4>
                                        <p className="text-xs text-gray-500 mb-2">{interview.role}</p>

                                        <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-2 mt-2">
                                            <Avatar className="w-5 h-5">
                                                <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                                                    {interview.interviewer.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">{interview.interviewer}</span>
                                        </div>
                                    </div>
                                ))}

                                {sidebarInterviews.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">
                                        <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No interviews scheduled</p>
                                    </div>
                                )}
                                {sidebarInterviews.length > SIDEBAR_PAGE_SIZE && (
                                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                                        <span>
                                            Page {sidebarPage} of {totalSidebarPages}
                                        </span>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2"
                                                onClick={() => setSidebarPage((p) => Math.max(1, p - 1))}
                                                disabled={sidebarPage === 1}
                                            >
                                                Prev
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2"
                                                onClick={() =>
                                                    setSidebarPage((p) =>
                                                        Math.min(totalSidebarPages, p + 1),
                                                    )
                                                }
                                                disabled={sidebarPage === totalSidebarPages}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>

            <InterviewDetailDialog
                applicant={detailApplicant}
                onClose={() => setDetailApplicant(null)}
            />
        </div>
    );

    if (embeddedMode) {
        return <div className="h-full bg-gray-50/50">{Content}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl">{Content}</div>
        </div>
    );
}


