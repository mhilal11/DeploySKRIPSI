import { Eye } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
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

import { PaginationLink, ComplaintRecord } from '../types';

interface ComplaintTableProps {
    complaints: ComplaintRecord[];
    links: PaginationLink[];
    rowStart?: number;
    onSelect: (complaint: ComplaintRecord) => void;
}

export default function ComplaintTable({
    complaints,
    links,
    rowStart = 1,
    onSelect,
}: ComplaintTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {/* Mobile Card View */}
            <div className="block md:hidden">
                {complaints.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-slate-500">
                        Tidak ada pengaduan yang sesuai filter.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {complaints.map((complaint, index) => (
                            <div key={complaint.id} className="p-3 space-y-2" onClick={() => onSelect(complaint)}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] text-slate-400">No. {rowStart + index}</p>
                                        <p className="font-semibold text-xs text-slate-900">{complaint.code}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{complaint.reporter}</p>
                                    </div>
                                    {renderStatusBadge(complaint.status, complaint.statusLabel, true)}
                                </div>
                                <p className="text-xs text-slate-700 truncate">{complaint.subject}</p>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium">
                                            {complaint.category}
                                        </span>
                                        {renderPriorityBadge(complaint.priority, complaint.priorityLabel, true)}
                                    </div>
                                    <span className="text-[10px] text-slate-400">{complaint.submittedAt ?? '-'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-12">No</TableHead>
                            <TableHead className="uppercase">ID</TableHead>
                            <TableHead>Pelapor</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Subjek</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Prioritas</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complaints.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="px-4 py-12 text-center text-slate-500"
                                >
                                    Tidak ada pengaduan yang sesuai filter.
                                </TableCell>
                            </TableRow>
                        )}

                        {complaints.map((complaint, index) => (
                            <TableRow
                                key={complaint.id}
                                className="hover:bg-slate-50/70 transition"
                            >
                                <TableCell className="text-slate-600">
                                    {rowStart + index}
                                </TableCell>
                                <TableCell className="font-semibold text-slate-900">
                                    {complaint.code}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-900">
                                            {complaint.reporter}
                                        </span>
                                        {complaint.reporterEmail && (
                                            <span className="text-xs text-slate-500">
                                                {complaint.reporterEmail}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium">
                                        {complaint.category}
                                    </span>
                                </TableCell>
                                <TableCell className="max-w-[180px] truncate">
                                    {complaint.subject}
                                </TableCell>
                                <TableCell>{complaint.submittedAt ?? '-'}</TableCell>
                                <TableCell>
                                    {renderPriorityBadge(complaint.priority, complaint.priorityLabel)}
                                </TableCell>
                                <TableCell>
                                    {renderStatusBadge(complaint.status, complaint.statusLabel)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onSelect(complaint)}
                                                    className="text-blue-900 hover:text-blue-800 hover:bg-blue-50"
                                                >
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
                        ))}
                    </TableBody>
                </Table>
            </div>

            {links.length > 1 && (
                <div className="flex flex-col gap-2 md:gap-3 border-t px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm md:flex-row md:items-center md:justify-between">
                    <span className="text-slate-500 text-center md:text-left text-[11px] md:text-sm">
                        Menampilkan {complaints.length} data
                    </span>
                    <div className="flex flex-wrap justify-center gap-0.5 md:gap-2">
                        {links.map((link, index) => (
                            <a
                                key={`${link.label}-${index}`}
                                href={link.url ?? '#'}
                                onClick={(event) => {
                                    if (!link.url) {
                                        event.preventDefault();
                                    }
                                }}
                                className={`rounded px-1.5 py-0.5 text-[10px] md:text-sm md:px-3 md:py-1 ${link.active
                                    ? 'bg-blue-900 text-white'
                                    : link.url
                                        ? 'text-blue-900 hover:bg-blue-50'
                                        : 'text-slate-400'
                                    }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function resolvePriorityLabel(priority: string, label?: string) {
    if (label?.trim()) {
        return label;
    }
    switch (priority) {
        case 'high':
            return 'Tinggi';
        case 'medium':
            return 'Sedang';
        case 'low':
            return 'Rendah';
        default:
            return '-';
    }
}

function resolveStatusLabel(status: string, label?: string) {
    if (label?.trim()) {
        return label;
    }
    switch (status) {
        case 'new':
            return 'Baru';
        case 'in_progress':
            return 'OnProgress';
        case 'resolved':
            return 'Selesai';
        case 'archived':
            return 'Diarsipkan';
        default:
            return '-';
    }
}

function renderPriorityBadge(priority: string, label?: string, small = false) {
    const sizeClass = small ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
    const safeLabel = resolvePriorityLabel(priority, label);
    switch (priority) {
        case 'high':
            return (
                <span className={`rounded-full bg-red-100 ${sizeClass} font-semibold text-red-600`}>
                    {safeLabel}
                </span>
            );
        case 'medium':
            return (
                <span className={`rounded-full bg-amber-100 ${sizeClass} font-semibold text-amber-600`}>
                    {safeLabel}
                </span>
            );
        default:
            return (
                <span className={`rounded-full bg-blue-100 ${sizeClass} font-semibold text-blue-600`}>
                    {safeLabel}
                </span>
            );
    }
}

function renderStatusBadge(status: string, label?: string, small = false) {
    const sizeClass = small ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
    const safeLabel = resolveStatusLabel(status, label);
    switch (status) {
        case 'new':
            return (
                <span className={`rounded-full border border-blue-200 ${sizeClass} font-semibold text-blue-700`}>
                    {safeLabel}
                </span>
            );
        case 'in_progress':
            return (
                <span className={`rounded-full border border-amber-200 ${sizeClass} font-semibold text-amber-600`}>
                    {safeLabel}
                </span>
            );
        case 'resolved':
            return (
                <span className={`rounded-full border border-emerald-200 ${sizeClass} font-semibold text-emerald-600`}>
                    {safeLabel}
                </span>
            );
        default:
            return (
                <span className={`rounded-full border border-slate-200 ${sizeClass} font-semibold text-slate-600`}>
                    {safeLabel}
                </span>
            );
    }
}


