import { Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
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
} from "@/shared/components/ui/tooltip";

import type { ComplaintRecord } from '../types';


interface ComplaintTableProps {
    complaints: ComplaintRecord[];
    onSelect: (complaint: ComplaintRecord) => void;
}

export default function ComplaintTable({ complaints, onSelect }: ComplaintTableProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const emptyState = (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-600">
            Belum ada data yang sesuai filter.
        </div>
    );

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(complaints.length / pageSize)),
        [complaints.length, pageSize]
    );

    const displayPage = Math.min(page, totalPages);

    const currentItems = useMemo(() => {
        const start = (displayPage - 1) * pageSize;
        return complaints.slice(start, start + pageSize);
    }, [complaints, displayPage, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [pageSize, complaints]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    if (complaints.length === 0) {
        return <div className="mt-6">{emptyState}</div>;
    }

    const startItem = (displayPage - 1) * pageSize + 1;
    const endItem = Math.min(startItem + currentItems.length - 1, complaints.length);

    return (
        <div className="mt-6 space-y-4">
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
                <Table className="min-w-[900px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="whitespace-nowrap">ID</TableHead>
                            <TableHead className="whitespace-nowrap">Kategori</TableHead>
                            <TableHead>Subjek</TableHead>
                            <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                            <TableHead>Prioritas</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Catatan Penanganan</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems.map((complaint) => {
                            const resolutionText = getResolutionText(complaint);

                            return (
                                <TableRow key={complaint.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {complaint.letterNumber ?? '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{complaint.category}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[220px]">{complaint.subject}</TableCell>
                                    <TableCell className="whitespace-nowrap">{complaint.date}</TableCell>
                                    <TableCell>
                                        <PriorityBadge priority={complaint.priority} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={complaint.status} />
                                    </TableCell>
                                    <TableCell className="max-w-xs text-sm text-slate-600">
                                        {resolutionText}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => onSelect(complaint)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Lihat Detail</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="space-y-3 md:hidden">
                {currentItems.map((complaint) => {
                    const resolutionText = getResolutionText(complaint);

                    return (
                        <Card
                            key={complaint.id}
                            className="border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {complaint.letterNumber ?? '-'}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {complaint.subject}
                                    </p>
                                    <p className="text-xs text-slate-500">{complaint.category}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <PriorityBadge priority={complaint.priority} />
                                    <StatusBadge status={complaint.status} />
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                                <span className="text-slate-500">Tanggal</span>
                                <span className="text-right font-medium text-slate-800">
                                    {complaint.date}
                                </span>
                                <span className="text-slate-500">Catatan</span>
                                <span className="text-right text-slate-800">{resolutionText}</span>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                                {complaint.handler ? (
                                    <Badge variant="outline" className="border-blue-200 text-blue-900">
                                        {complaint.handler}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-slate-200 text-slate-700">
                                        ID {complaint.id}
                                    </Badge>
                                )}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => onSelect(complaint)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Lihat Detail</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-600">
                    Menampilkan {startItem}-{endItem} dari {complaints.length} data
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        Per halaman
                        <Select
                            value={String(pageSize)}
                            onValueChange={(val) => setPageSize(Number(val))}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={String(pageSize)} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 15].map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={displayPage === 1}
                        >
                            Sebelumnya
                        </Button>
                        <span className="text-sm text-slate-700">
                            Halaman {displayPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={displayPage === totalPages}
                        >
                            Selanjutnya
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getResolutionText(complaint: ComplaintRecord) {
    if (complaint.resolutionNotes?.length) {
        return complaint.resolutionNotes;
    }

    if (complaint.handler) {
        return `Menunggu catatan dari ${complaint.handler}`;
    }

    return 'Belum ada catatan penanganan';
}

function StatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();

    if (normalized.includes('selesai')) {
        return (
            <Badge variant="outline" className="border-emerald-200 text-emerald-600">
                {status}
            </Badge>
        );
    }

    if (normalized.includes('proses') || normalized.includes('menunggu')) {
        return (
            <Badge variant="outline" className="border-amber-200 text-amber-600">
                {status}
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-blue-200 text-blue-700">
            {status}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const normalized = priority.toLowerCase();

    if (normalized.includes('tinggi') || normalized === 'high') {
        return <Badge className="bg-red-100 text-red-600 hover:bg-red-200">Tinggi</Badge>;
    }

    if (normalized.includes('sedang') || normalized === 'medium') {
        return <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-200">Sedang</Badge>;
    }

    return <Badge className="bg-blue-100 text-blue-600 hover:bg-blue-200">Rendah</Badge>;
}


