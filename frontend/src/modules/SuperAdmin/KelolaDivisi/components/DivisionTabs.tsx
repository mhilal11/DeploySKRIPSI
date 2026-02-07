import {
    AlertCircle,
    Briefcase,
    Building2,
    CheckCircle2,
    Edit,
    Settings,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/shared/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import { DivisionRecord, StaffMember } from '../types';


type DivisionTabsProps = {
    divisions: DivisionRecord[];
    activeDivisionId: string;
    onTabChange: (value: string) => void;
    onEditDivision: (division: DivisionRecord) => void;
    onOpenJobDialog: (division: DivisionRecord) => void;
    onCloseJob: (division: DivisionRecord) => void;
};

export function DivisionTabs({
    divisions,
    activeDivisionId,
    onTabChange,
    onEditDivision,
    onOpenJobDialog,
    onCloseJob,
}: DivisionTabsProps) {
    return (
        <Tabs value={activeDivisionId} onValueChange={onTabChange}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-transparent p-0 gap-2">
                {divisions.map((division) => (
                    <TabsTrigger
                        key={division.id}
                        value={division.id.toString()}
                        className="rounded-full px-4 py-2 text-sm font-medium border border-slate-200 bg-white text-slate-600 data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:border-blue-900 transition-all hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{division.name}</span>
                        </div>
                    </TabsTrigger>
                ))}
            </TabsList>

            {divisions.map((division) => (
                <TabsContent key={division.id} value={division.id.toString()} className="space-y-6 pt-6">
                    <DivisionHeader division={division} onEdit={() => onEditDivision(division)} />
                    <DivisionOverview division={division} />
                    <DivisionStaffTable staff={division.staff} />
                    <DivisionVacancySection
                        division={division}
                        onOpenJob={() => onOpenJobDialog(division)}
                        onCloseJob={() => onCloseJob(division)}
                    />
                </TabsContent>
            ))}
        </Tabs>
    );
}

function DivisionHeader({ division, onEdit }: { division: DivisionRecord; onEdit: () => void }) {
    return (
        <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-blue-900">{division.name}</h3>
                        {division.is_hiring && (
                            <Badge className="bg-green-600 hover:bg-green-600">
                                <Briefcase className="mr-1 h-3 w-3" />
                                Lowongan Terbuka
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-slate-600">
                        {division.description ?? 'Belum ada deskripsi.'}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">
                        Manager:{' '}
                        <span className="font-medium text-slate-900">
                            {division.manager_name ?? 'Belum ditentukan'}
                        </span>
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}>
                    <Settings className="mr-2 h-4 w-4" />
                    Pengaturan
                </Button>
            </div>
        </div>
    );
}

function DivisionOverview({ division }: { division: DivisionRecord }) {
    const ratio =
        division.capacity > 0
            ? Math.min((division.current_staff / division.capacity) * 100, 100)
            : 0;
    const capacityStatus =
        division.available_slots <= 0
            ? { color: 'text-red-600', bg: 'bg-red-100' }
            : division.capacity > 0 && division.current_staff / division.capacity >= 0.8
                ? { color: 'text-orange-600', bg: 'bg-orange-100' }
                : { color: 'text-green-600', bg: 'bg-green-100' };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">Kapasitas Staff</p>
                    <Badge className={`${capacityStatus.bg} ${capacityStatus.color}`}>
                        {division.current_staff}/{division.capacity}
                    </Badge>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div
                        className={`h-2 rounded-full ${division.available_slots === 0
                            ? 'bg-red-500'
                            : division.capacity > 0 && division.current_staff / division.capacity >= 0.8
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                            }`}
                        style={{ width: `${ratio}%` }}
                    />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                    {division.available_slots > 0 ? (
                        <span className="text-green-600">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            {division.available_slots} slot tersedia
                        </span>
                    ) : (
                        <span className="text-red-600">
                            <XCircle className="mr-1 inline h-3 w-3" />
                            Kapasitas penuh
                        </span>
                    )}
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard label="Total Staff" value={`${division.current_staff} orang`} />
                <InfoCard label="Slot Tersedia" value={`${division.available_slots} slot`} />
                <InfoCard label="Status Rekrutmen" value={division.is_hiring ? 'Aktif' : 'Tidak Aktif'} />
                <InfoCard label="Manager" value={division.manager_name ?? '-'} />
            </div>
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs text-slate-600">{label}</p>
            <p className="mt-2 font-semibold text-blue-900">{value}</p>
        </div>
    );
}


// ... (other imports)

function DivisionStaffTable({ staff }: { staff: StaffMember[] }) {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;
    const totalPages = Math.ceil(staff.length / ITEMS_PER_PAGE);

    if (staff.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-4 md:p-8 text-center text-slate-500">
                Belum ada staff pada divisi ini.
            </div>
        );
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedStaff = staff.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Helper to generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">No</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Posisi</TableHead>
                            <TableHead className="hidden md:table-cell">Email</TableHead>
                            <TableHead className="hidden lg:table-cell">Tanggal Bergabung</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedStaff.map((member, index) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium text-slate-900">
                                    {startIndex + index + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div>{member.name}</div>
                                    <div className="text-xs text-slate-500 md:hidden">{member.email}</div>
                                </TableCell>
                                <TableCell>
                                    <div>{member.position}</div>
                                    <div className="text-xs text-slate-500 lg:hidden">{member.join_date ?? '-'}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-slate-600">{member.email}</TableCell>
                                <TableCell className="hidden lg:table-cell text-slate-600">{member.join_date ?? '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col-reverse gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500 text-center sm:text-left">
                        Menampilkan <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, staff.length)}</span> dari <span className="font-medium">{staff.length}</span> staff
                    </div>

                    <Pagination className="w-auto mx-0 justify-center sm:justify-end">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                                    className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                                />
                            </PaginationItem>

                            {getPageNumbers().map((page, idx) => (
                                <PaginationItem key={idx}>
                                    {page === 'ellipsis' ? (
                                        <PaginationEllipsis />
                                    ) : (
                                        <PaginationLink
                                            href="#"
                                            isActive={currentPage === page}
                                            onClick={(e) => { e.preventDefault(); typeof page === 'number' && handlePageChange(page); }}
                                        >
                                            {page}
                                        </PaginationLink>
                                    )}
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                                    className={`${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}

function DivisionVacancySection({
    division,
    onOpenJob,
    onCloseJob,
}: {
    division: DivisionRecord;
    onOpenJob: () => void;
    onCloseJob: () => void;
}) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    if (division.is_hiring && division.job_title) {
        return (
            <div className="space-y-3 md:space-y-4 rounded-xl border border-green-200 bg-green-50 p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="text-base md:text-lg font-semibold text-green-900">{division.job_title}</h4>
                        <p className="text-xs md:text-sm text-slate-700">{division.job_description}</p>
                        {division.job_requirements && division.job_requirements.length > 0 && (
                            <ul className="mt-2 md:mt-3 space-y-1 text-xs md:text-sm text-slate-700">
                                {division.job_requirements
                                    .filter(req => req && req.trim() !== '')
                                    .map((requirement, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                                            <span>{requirement}</span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={onOpenJob}>
                                        <Edit className="h-4 w-4 text-blue-600" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Edit Lowongan</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => setIsAlertOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Hapus Lowongan</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Lowongan?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Lowongan akan ditutup dan tidak lagi muncul pada portal pelamar.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={onCloseJob}
                                        className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                        Hapus
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-dashed p-6 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="font-medium text-slate-900">Tidak ada lowongan aktif</p>
            <p className="mt-1 text-sm text-slate-600">
                {division.available_slots > 0
                    ? 'Masih tersedia slot. Anda dapat membuka lowongan baru.'
                    : 'Kapasitas penuh. Tingkatkan kapasitas untuk membuka lowongan.'}
            </p>
            <div className="mt-4 flex justify-center">
                <Button
                    onClick={onOpenJob}
                    disabled={division.available_slots === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-60"
                >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Buka Lowongan Baru
                </Button>
            </div>
            {division.available_slots === 0 && (
                <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
                    <AlertCircle className="mr-2 inline h-4 w-4" />
                    Kapasitas sudah penuh. Edit kapasitas divisi terlebih dahulu.
                </div>
            )}
        </div>
    );
}


