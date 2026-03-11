import { useState } from 'react';

import type { StaffMember } from '@/modules/SuperAdmin/KelolaDivisi/types';
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


type DivisionStaffTableProps = {
    staff: StaffMember[];
};

export function DivisionStaffTable({ staff }: DivisionStaffTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;
    const totalPages = Math.ceil(staff.length / ITEMS_PER_PAGE);

    if (staff.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-4 text-center text-slate-500 md:p-8">
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

    const getPageNumbers = () => {
        const pages: Array<number | 'ellipsis'> = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i += 1) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
        }
        return pages;
    };

    return (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
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
                                <TableCell className="hidden text-slate-600 md:table-cell">{member.email}</TableCell>
                                <TableCell className="hidden text-slate-600 lg:table-cell">{member.join_date ?? '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex flex-col-reverse gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-center text-xs text-slate-500 sm:text-left">
                        Menampilkan <span className="font-medium">{startIndex + 1}</span> -{' '}
                        <span className="font-medium">
                            {Math.min(startIndex + ITEMS_PER_PAGE, staff.length)}
                        </span>{' '}
                        dari <span className="font-medium">{staff.length}</span> staff
                    </div>

                    <Pagination className="mx-0 w-auto justify-center sm:justify-end">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        handlePageChange(currentPage - 1);
                                    }}
                                    className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                                />
                            </PaginationItem>

                            {getPageNumbers().map((page, index) => (
                                <PaginationItem key={`${page}-${index}`}>
                                    {page === 'ellipsis' ? (
                                        <PaginationEllipsis />
                                    ) : (
                                        <PaginationLink
                                            href="#"
                                            isActive={currentPage === page}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                handlePageChange(page);
                                            }}
                                        >
                                            {page}
                                        </PaginationLink>
                                    )}
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        handlePageChange(currentPage + 1);
                                    }}
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
