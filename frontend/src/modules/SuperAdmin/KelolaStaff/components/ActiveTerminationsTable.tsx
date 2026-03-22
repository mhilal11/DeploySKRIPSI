import { AlertTriangle, CheckSquare, FileText, Search, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import { Input } from '@/shared/components/ui/input';
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
import { router } from '@/shared/lib/inertia';

import { TerminationRecord } from '../types';
import ChecklistDialog from './ChecklistDialog';
import TerminationDetailDialog from './TerminationDetailDialog';



interface ActiveTerminationsTableProps {
    terminations: TerminationRecord[];
    checklistTemplate: string[];
}

export default function ActiveTerminationsTable({
    terminations,
    checklistTemplate,
}: ActiveTerminationsTableProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const getDisplayProgress = (request: TerminationRecord) => {
        const status = (request.status ?? '').toLowerCase();
        if (status.includes('diajukan') || status.includes('menunggu') || status.includes('pending') || status.includes('baru')) {
            return 0;
        }
        const raw = Number(request.progress ?? 0);
        return Number.isFinite(raw) ? Math.max(0, raw) : 0;
    };

    const handleCancelOffboarding = (terminationId: number, employeeName: string) => {
        router.delete(
            route('super-admin.staff.destroy', terminationId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Offboarding ${employeeName} berhasil dibatalkan`);
                    void router.reload({
                        only: ['stats', 'terminations', 'inactiveEmployees', 'sidebarNotifications'],
                        preserveScroll: true,
                        replace: true,
                    });
                },
                onError: () => {
                    toast.error('Gagal membatalkan offboarding');
                },
            }
        );
    };

    const filteredTerminations = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return terminations;
        }

        return terminations.filter((request) => {
            const haystack = [
                request.reference,
                request.employeeName,
                request.employeeCode,
                request.division,
                request.position,
                request.type,
                request.status,
                request.effectiveDate,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [terminations, searchQuery]);

    if (terminations.length === 0) {
        return (
            <p className="py-6 text-center text-xs md:text-sm text-slate-500">
                Belum ada proses offboarding aktif.
            </p>
        );
    }

    return (
        <>
            <div className="mb-3 md:mb-4 w-full md:max-w-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Cari offboarding karyawan..."
                        className="pl-9"
                    />
                </div>
            </div>

            {filteredTerminations.length === 0 && (
                <p className="py-4 text-center text-xs md:text-sm text-slate-500">
                    Tidak ada data offboarding yang cocok dengan pencarian.
                </p>
            )}

            {filteredTerminations.length > 0 && (
                <>
                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-3">
                        {filteredTerminations.map((request, index) => (
                            <div key={request.id} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400">No. {index + 1}</p>
                                        <p className="font-semibold text-xs text-slate-900 truncate">{request.employeeName}</p>
                                        <p className="text-[10px] text-slate-500">{request.employeeCode}</p>
                                    </div>
                                    {statusBadge(request.status, true)}
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                    <div>
                                        <p className="text-[10px] text-slate-400">ID</p>
                                        <p className="text-[11px] text-slate-700">{request.reference}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Divisi</p>
                                        <p className="text-[11px] text-slate-700 truncate">{request.division ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Tipe</p>
                                        {typeBadge(request.type, true)}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Tanggal Efektif</p>
                                        <p className="text-[10px] text-slate-700">{request.effectiveDate ?? '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                                        <div
                                            className="h-1.5 rounded-full bg-blue-900"
                                            style={{ width: `${getDisplayProgress(request)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500">{getDisplayProgress(request)}%</span>
                                </div>
                                <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                                    <ChecklistDialog
                                        termination={request}
                                        checklistTemplate={checklistTemplate}
                                        tooltip="Checklist Offboarding"
                                        trigger={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs px-2"
                                            >
                                                <CheckSquare className="h-3 w-3" />
                                            </Button>
                                        }
                                    />
                                    <TerminationDetailDialog
                                        termination={request}
                                        tooltip="Lihat Detail"
                                        trigger={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs px-2"
                                            >
                                                <FileText className="h-3 w-3" />
                                            </Button>
                                        }
                                    />
                                    <CancelTerminationButton
                                        termination={request}
                                        onConfirm={handleCancelOffboarding}
                                        mobile
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">No</TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Nama Karyawan</TableHead>
                                    <TableHead>Divisi</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Tanggal Efektif</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTerminations.map((request, index) => (
                                    <TableRow key={request.id}>
                                        <TableCell className="text-slate-600">{index + 1}</TableCell>
                                        <TableCell>{request.reference}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {request.employeeName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {request.employeeCode}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{request.division ?? '-'}</TableCell>
                                        <TableCell>{typeBadge(request.type)}</TableCell>
                                        <TableCell>{request.effectiveDate ?? '-'}</TableCell>
                                        <TableCell>{statusBadge(request.status)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 flex-1 rounded-full bg-slate-200">
                                                    <div
                                                        className="h-2 rounded-full bg-blue-900"
                                                        style={{ width: `${getDisplayProgress(request)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {getDisplayProgress(request)}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <ChecklistDialog
                                                    termination={request}
                                                    checklistTemplate={checklistTemplate}
                                                    tooltip="Checklist Offboarding"
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                        >
                                                            <CheckSquare className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                <TerminationDetailDialog
                                                    termination={request}
                                                    tooltip="Lihat Detail"
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                <CancelTerminationButton
                                                    termination={request}
                                                    onConfirm={handleCancelOffboarding}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </>
    );
}

function statusBadge(status: string, small = false) {
    const sizeClass = small ? 'text-[10px] px-1.5 py-0' : '';
    switch (status) {
        case 'Diajukan':
            return (
                <Badge variant="outline" className={`border-blue-500 text-blue-500 ${sizeClass}`}>
                    Diajukan
                </Badge>
            );
        case 'Proses':
            return (
                <Badge variant="outline" className={`border-orange-500 text-orange-500 ${sizeClass}`}>
                    Proses
                </Badge>
            );
        case 'Selesai':
            return (
                <Badge variant="outline" className={`border-green-500 text-green-500 ${sizeClass}`}>
                    Selesai
                </Badge>
            );
        default:
            return <Badge variant="outline" className={sizeClass}>{status}</Badge>;
    }
}

function typeBadge(type: string, small = false) {
    const sizeClass = small ? 'text-[10px] px-1.5 py-0' : '';
    return (
        <Badge className={`${type === 'Resign' ? 'bg-blue-500' : 'bg-red-500'} ${sizeClass}`}>
            {type}
        </Badge>
    );
}

function CancelTerminationButton({
    termination,
    onConfirm,
    mobile = false,
}: {
    termination: TerminationRecord;
    onConfirm: (id: number, name: string) => void;
    mobile?: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${mobile ? 'h-7 text-xs px-2' : ''}`}
                            onClick={() => setOpen(true)}
                        >
                            <XCircle className={`h-4 w-4 ${mobile ? 'mr-1 h-3 w-3' : ''}`} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Batalkan Offboarding</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <AlertDialogContent className="max-w-md bg-white border-0 rounded-2xl shadow-2xl">
                <AlertDialogHeader className="relative">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-7 w-7 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-center text-xl font-bold text-slate-900">
                        Batalkan Offboarding?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-slate-600">
                        Apakah Anda yakin ingin membatalkan proses offboarding untuk <span className="font-semibold text-slate-900">{termination.employeeName}</span>?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="relative my-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">
                        <strong>Perhatian:</strong> Tindakan ini akan menghapus semua data offboarding yang telah diinput.
                    </p>
                </div>
                <AlertDialogFooter className="relative flex-col gap-2 sm:flex-row">
                    <AlertDialogCancel className="m-0 w-full sm:w-auto">
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            onConfirm(termination.id, termination.employeeName);
                            setOpen(false);
                        }}
                        className="m-0 w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                    >
                        Ya, Batalkan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}



