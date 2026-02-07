// src/Pages/SuperAdmin/Recruitment/components/ApplicantsTab.tsx

import { format } from 'date-fns';
import { Calendar as CalendarIcon, X, Filter, Search, User } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/shared/components/ui/tooltip';



import {
    ApplicantRecord,
    ApplicantStatus,
    StatusSummary,
    formatApplicationId,
    ApplicantActionHandler,
    ApplicantRejectHandler,
} from '../types';
import InterviewDetailDialog from './InterviewDetailDialog';
import RejectionModal from './RejectionModal';

interface ApplicantsTabProps {
    statusOptions: string[];
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    dateRange: { from: Date | null; to: Date | null };
    onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    statusOrder: ApplicantStatus[];
    statusSummary: StatusSummary;
    visibleApplications: ApplicantRecord[];
    onStatusUpdate: ApplicantActionHandler;
    onReject: ApplicantRejectHandler;
    isUpdatingStatus: boolean;
    updatingApplicantId: number | null;
    onScheduleInterview: (application: ApplicantRecord) => void;
    onViewProfile?: (application: ApplicantRecord) => void;
}

const statusBadge = (status: ApplicantStatus) => {
    switch (status) {
        case 'Applied':
            return (
                <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-50">
                    Applied
                </Badge>
            );
        case 'Screening':
            return (
                <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-500 hover:bg-orange-50">
                    Screening
                </Badge>
            );
        case 'Interview':
            return (
                <Badge variant="outline" className="border-purple-500 bg-purple-50 text-purple-500 hover:bg-purple-50">
                    Interview
                </Badge>
            );
        case 'Offering':
            return (
                <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-50">
                    Offering
                </Badge>
            );
        case 'Hired':
            return (
                <Badge variant="outline" className="border-green-500 bg-green-50 text-green-500 hover:bg-green-50">
                    Hired
                </Badge>
            );
        case 'Rejected':
            return (
                <Badge variant="outline" className="border-red-500 bg-red-50 text-red-500 hover:bg-red-50">
                    Rejected
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

export default function ApplicantsTab({
    statusOptions,
    searchTerm,
    onSearchTermChange,
    statusFilter,
    onStatusFilterChange,
    dateRange,
    onDateRangeChange,
    statusOrder,
    statusSummary,
    visibleApplications,
    onStatusUpdate,
    onReject,
    isUpdatingStatus,
    updatingApplicantId,
    onScheduleInterview,
    onViewProfile,
}: ApplicantsTabProps) {
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [rejectingApplicant, setRejectingApplicant] = useState<ApplicantRecord | null>(null);
    const [viewingInterview, setViewingInterview] = useState<ApplicantRecord | null>(null);
    const [datePickerMonth, setDatePickerMonth] = useState<Date | undefined>(
        dateRange.from ?? dateRange.to ?? new Date(),
    );

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, dateRange]);

    // Calculate pagination
    const totalPages = Math.ceil(visibleApplications.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedApplications = visibleApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const displayDateRange = useMemo(() => {
        const { from, to } = dateRange;
        const formatDate = (date: Date) => format(date, 'd MMM yyyy');
        if (from && to) return `${formatDate(from)} - ${formatDate(to)}`;
        if (from) return `${formatDate(from)} - Pilih akhir`;
        return 'Pilih rentang tanggal';
    }, [dateRange]);

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        onSearchTermChange(event.target.value);
    };

    const handleHire = (application: ApplicantRecord) => {
        const confirmed = window.confirm(
            `Konfirmasi penerimaan (Hired) untuk ${application.name}?`
        );
        if (confirmed) {
            onStatusUpdate(application.id, 'Hired');
        }
    };

    const handleReject = (application: ApplicantRecord) => {
        setRejectingApplicant(application);
        setIsRejectionModalOpen(true);
    };

    const handleConfirmReject = (reason: string) => {
        if (rejectingApplicant) {
            onReject(rejectingApplicant.id, reason);
        }
    };

    useEffect(() => {
        if (dateRange.from) {
            setDatePickerMonth(dateRange.from);
        } else if (dateRange.to) {
            setDatePickerMonth(dateRange.to);
        }
    }, [dateRange.from, dateRange.to]);

    return (
        <>
            <Card className="space-y-4 md:space-y-6 p-3 md:p-6">
                <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-500 shrink-0" />
                        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                            <SelectTrigger className="w-full md:w-[135px] h-9 md:h-10 text-xs md:text-sm">
                                <SelectValue placeholder="Semua status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                {statusOrder.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-1 md:gap-2 h-9 md:h-10 text-xs md:text-sm w-full md:w-auto"
                                >
                                    <CalendarIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    <span className="truncate">{displayDateRange}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 max-h-[80vh] overflow-auto" align="start">
                                <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-semibold text-slate-600">Mulai</p>
                                        <Calendar
                                            mode="single"
                                            selected={dateRange.from ?? undefined}
                                            onSelect={(date) => {
                                                onDateRangeChange({
                                                    from: date ?? null,
                                                    to: dateRange.to,
                                                });
                                            }}
                                            disabled={(date) =>
                                                dateRange.to ? date > dateRange.to : false
                                            }
                                            className="text-[9px] md:text-[10px] [&_.rdp-caption]:text-[9px] [&_.rdp-caption]:md:text-[10px] [&_.rdp-cell]:w-4 [&_.rdp-cell]:h-4 [&_.rdp-cell]:md:w-5 [&_.rdp-cell]:md:h-5 [&_.rdp-head_cell]:w-4 [&_.rdp-head_cell]:md:w-5 [&_.rdp-button]:h-4 [&_.rdp-button]:w-4 [&_.rdp-button]:md:h-5 [&_.rdp-button]:md:w-5 [&_.rdp-nav_button]:h-4 [&_.rdp-nav_button]:w-4"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-semibold text-slate-600">Selesai</p>
                                        <Calendar
                                            mode="single"
                                            selected={dateRange.to ?? undefined}
                                            onSelect={(date) => {
                                                onDateRangeChange({
                                                    from: dateRange.from,
                                                    to: date ?? null,
                                                });
                                            }}
                                            disabled={(date) =>
                                                dateRange.from ? date < dateRange.from : false
                                            }
                                            className="text-[9px] md:text-[10px] [&_.rdp-caption]:text-[9px] [&_.rdp-caption]:md:text-[10px] [&_.rdp-cell]:w-4 [&_.rdp-cell]:h-4 [&_.rdp-cell]:md:w-5 [&_.rdp-cell]:md:h-5 [&_.rdp-head_cell]:w-4 [&_.rdp-head_cell]:md:w-5 [&_.rdp-button]:h-4 [&_.rdp-button]:w-4 [&_.rdp-button]:md:h-5 [&_.rdp-button]:md:w-5 [&_.rdp-nav_button]:h-4 [&_.rdp-nav_button]:w-4"
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-end border-t pt-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 h-6 text-[10px]"
                                        onClick={() => onDateRangeChange({ from: null, to: null })}
                                    >
                                        <X className="h-3 w-3" /> Reset
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-2.5 md:left-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Cari pelamar..."
                            className="pl-8 md:pl-9 h-9 md:h-10 text-xs md:text-sm"
                        />
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                    {paginatedApplications.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-500">Tidak ada data pelamar.</p>
                    ) : (
                        paginatedApplications.map((application) => {
                            const isCurrentlyUpdating = isUpdatingStatus && updatingApplicantId === application.id;
                            return (
                                <div key={application.id} className="rounded-lg border p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-xs text-slate-900 truncate">{application.name}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{application.email}</p>
                                        </div>
                                        {statusBadge(application.status)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                        <div>
                                            <p className="text-[10px] text-slate-400">ID Lamaran</p>
                                            <p className="text-[11px] text-blue-900 font-semibold">{formatApplicationId(application.id)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400">Posisi</p>
                                            <p className="text-[11px] text-slate-700 truncate">{application.position}</p>
                                        </div>
                                    </div>
                                    {onViewProfile && (
                                        <div className="pt-1.5 border-t border-slate-100">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onViewProfile(application)}
                                                disabled={isCurrentlyUpdating}
                                                className="h-7 text-xs px-2 w-full justify-center"
                                            >
                                                <User className="h-3 w-3 mr-1 text-blue-600" />
                                                Lihat Profil
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>ID Lamaran</TableHead>
                                <TableHead>Pelamar</TableHead>
                                <TableHead>Posisi</TableHead>
                                <TableHead className="w-[90px]">Status</TableHead>
                                <TableHead className="text-right w-[210px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {paginatedApplications.map((application, index) => {
                                const isCurrentlyUpdating =
                                    isUpdatingStatus && updatingApplicantId === application.id;

                                return (
                                    <TableRow key={application.id}>
                                        <TableCell className="font-medium text-slate-900">
                                            {startIndex + index + 1}
                                        </TableCell>
                                        <TableCell className="font-semibold text-blue-900">
                                            {formatApplicationId(application.id)}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-slate-900">
                                                {application.name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {application.email}
                                            </p>
                                        </TableCell>
                                        <TableCell>{application.position}</TableCell>
                                        <TableCell>{statusBadge(application.status)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                {onViewProfile && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => onViewProfile(application)}
                                                                    disabled={isCurrentlyUpdating}
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                >
                                                                    <User className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Lihat Profil Lengkap</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                            Menampilkan {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, visibleApplications.length)} dari {visibleApplications.length} pelamar
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                                        onClick={() => setCurrentPage(page)}
                                        className="h-8 w-8 p-0"
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                            >
                                <span className="sr-only">Next</span>
                                <span aria-hidden="true">Â»</span>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <RejectionModal
                isOpen={isRejectionModalOpen}
                onClose={() => {
                    setIsRejectionModalOpen(false);
                    setRejectingApplicant(null);
                }}
                onConfirm={handleConfirmReject}
                applicant={rejectingApplicant}
                isSubmitting={isUpdatingStatus}
            />

            <InterviewDetailDialog
                applicant={viewingInterview}
                onClose={() => setViewingInterview(null)}
            />
        </>
    );
}


