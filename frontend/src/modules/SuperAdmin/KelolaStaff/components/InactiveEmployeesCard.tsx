import { FileText, Trash2 } from 'lucide-react';
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
import { Card } from '@/shared/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useForm } from '@/shared/lib/inertia';


import { InactiveEmployeeRecord } from '../types';

interface InactiveEmployeesCardProps {
    employees: InactiveEmployeeRecord[];
}

export default function InactiveEmployeesCard({ employees }: InactiveEmployeesCardProps) {
    return (
        <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Arsip Karyawan Nonaktif
            </h3>
            {employees.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada data karyawan nonaktif.</p>
            ) : (
                <div className="space-y-3">
                    {employees.map((employee) => (
                        <div
                            key={employee.id ?? `${employee.employeeCode}-${employee.exitDate}`}
                            className="rounded-lg bg-slate-50 p-4"
                        >
                            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="font-medium text-slate-900">{employee.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {formatMetaInfo(employee)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={employee.type === 'Resign' ? 'bg-blue-500' : 'bg-red-500'}>
                                        {employee.type}
                                    </Badge>
                                    <DeleteArchiveButton employee={employee} mode="icon" />
                                </div>
                            </div>
                            <div className="mt-3 grid gap-4 text-sm md:grid-cols-3">
                                <Detail label="Bergabung" value={employee.joinDate} />
                                <Detail label="Keluar" value={employee.exitDate} />
                                <Detail label="Alasan" value={employee.exitReason} />
                            </div>
                            <div className="mt-3">
                                <EmployeeDetailDialog employee={employee} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-sm text-slate-900">{value ?? '-'}</p>
        </div>
    );
}

function EmployeeDetailDialog({ employee }: { employee: InactiveEmployeeRecord }) {
    const exitType = employee.type ?? 'Nonaktif';
    const exitBadgeClass =
        exitType === 'Resign'
            ? 'mt-1 bg-blue-500'
            : exitType === 'Pensiun'
                ? 'mt-1 bg-amber-500'
                : 'mt-1 bg-red-500';

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Lihat Detail
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[92vw] max-w-2xl max-h-[90vh] overflow-y-auto border-0 bg-white p-0">
                <DialogHeader className="space-y-1 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle>{employee.name}</DialogTitle>
                    <DialogDescription>
                        Riwayat singkat karyawan yang sudah tidak aktif.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 px-6 pb-6 pt-4 text-sm">
                    <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
                        <Detail label="ID Karyawan" value={employee.employeeCode} />
                        <Detail label="Divisi" value={employee.division} />
                        <Detail label="Posisi" value={employee.position} />
                        <Detail label="Tanggal Bergabung" value={employee.joinDate} />
                        <Detail label="Tanggal Keluar" value={employee.exitDate} />
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Status Keluar</p>
                            <Badge className={exitBadgeClass}>{exitType}</Badge>
                        </div>
                    </section>

                    <section>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Alasan keluar</p>
                        <p className="mt-1 rounded-lg border border-slate-200 bg-white/70 p-3 text-slate-700">
                            {employee.exitReason ?? 'Belum ada catatan.'}
                        </p>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface DeleteArchiveButtonProps {
    employee: InactiveEmployeeRecord;
    mode?: 'text' | 'icon';
}

function DeleteArchiveButton({ employee, mode = 'text' }: DeleteArchiveButtonProps) {
    const form = useForm({});
    const [open, setOpen] = useState(false);

    if (!employee.id) {
        return null;
    }

    const handleDelete = () => {
        form.delete(route('super-admin.staff.destroy', employee.id), {
            preserveScroll: true,
            onFinish: () => setOpen(false),
        });
    };

    const trigger =
        mode === 'icon' ? (
            <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label="Hapus arsip"
                type="button"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        ) : (
            <Button variant="destructive" size="sm" type="button">
                <Trash2 className="h-4 w-4" />
                Hapus Arsip
            </Button>
        );

    return (
        <AlertDialog open={open} onOpenChange={setOpen} >
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus arsip {employee.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus catatan offboarding secara permanen dan tidak dapat dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={form.processing}>Batalkan</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 text-white hover:bg-red-500"
                        onClick={handleDelete}
                        disabled={form.processing}
                    >
                        {form.processing ? 'Menghapus...' : 'Ya, hapus'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function formatMetaInfo(employee: InactiveEmployeeRecord) {
    const info = [employee.employeeCode, employee.division, employee.position]
        .filter(Boolean)
        .join(' \u2022 ');

    return info || '-';
}



