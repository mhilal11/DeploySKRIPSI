import { Search, UserMinus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { router, useForm } from '@/shared/lib/inertia';

import type { StaffOptionRecord } from '../types';

interface TerminationDialogProps {
    typeOptions?: Array<'Resign' | 'PHK' | 'Pensiun'>;
    staffOptions?: StaffOptionRecord[];
}

export default function TerminationDialog({
    typeOptions = ['Resign', 'PHK', 'Pensiun'],
    staffOptions = [],
}: TerminationDialogProps) {
    const [open, setOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const form = useForm({
        employee_code: '',
        type: '' as '' | 'Resign' | 'PHK' | 'Pensiun',
        effective_date: '',
        reason: '',
    });

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredStaff = normalizedSearch
        ? staffOptions.filter((staff) => {
              const code = staff.employeeCode.toLowerCase();
              const name = staff.name.toLowerCase();
              const division = (staff.division ?? '').toLowerCase();
              return (
                  code.includes(normalizedSearch) ||
                  name.includes(normalizedSearch) ||
                  division.includes(normalizedSearch)
              );
          })
        : staffOptions;

    const selectedStaff =
        staffOptions.find((staff) => staff.employeeCode === form.data.employee_code) ?? null;

    const handleSelectStaff = (staff: StaffOptionRecord) => {
        form.setData('employee_code', staff.employeeCode);
        setPickerOpen(false);
        setSearchQuery('');
    };

    const handleSubmit = () => {
        form.post(route('super-admin.staff.store'), {
            onSuccess: () => {
                toast.success('Pengajuan termination berhasil disimpan');
                form.reset();
                setOpen(false);
                setPickerOpen(false);
                setSearchQuery('');
                void router.reload({
                    only: ['stats', 'terminations', 'inactiveEmployees', 'staffOptions', 'sidebarNotifications'],
                    preserveScroll: true,
                    replace: true,
                });
            },
            onError: () => toast.error('Gagal menyimpan data, periksa input Anda'),
        });
    };

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        setPickerOpen(false);
                        setSearchQuery('');
                    }
                }}
            >
                <DialogTrigger asChild>
                    <Button className="bg-blue-900 text-white hover:bg-blue-800">
                        <UserMinus className="mr-2 h-4 w-4" />
                        Input Termination
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl border-0 bg-white p-0">
                    <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4">
                        <DialogTitle>Input Termination Baru</DialogTitle>
                        <DialogDescription>
                            Pastikan data karyawan lengkap sebelum mengajukan proses offboarding.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-5 px-6 pb-6 pt-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>ID Karyawan</Label>
                                    <div className="flex flex-col gap-2 md:flex-row">
                                        <Input
                                            placeholder="Pilih dari daftar staff"
                                            value={form.data.employee_code}
                                            readOnly
                                            className="md:flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-blue-200 text-blue-900 hover:bg-blue-50"
                                            onClick={() => setPickerOpen(true)}
                                        >
                                            <Users className="mr-2 h-4 w-4" />
                                            Pilih Staff
                                        </Button>
                                    </div>
                                    {selectedStaff && (
                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                            <span className="font-medium text-slate-900">{selectedStaff.name}</span>
                                            {' - '}
                                            {selectedStaff.employeeCode}
                                            {' - '}
                                            {selectedStaff.division ?? '-'}
                                        </div>
                                    )}
                                    {form.errors.employee_code && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.employee_code}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipe</Label>
                                    <Select
                                        value={form.data.type}
                                        onValueChange={(value) =>
                                            form.setData('type', value as 'Resign' | 'PHK' | 'Pensiun')
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih tipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {typeOptions.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.type && (
                                        <p className="text-xs text-red-500">{form.errors.type}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Efektif</Label>
                                    <Input
                                        type="date"
                                        value={form.data.effective_date}
                                        onChange={(event) =>
                                            form.setData('effective_date', event.target.value)
                                        }
                                    />
                                    {form.errors.effective_date && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.effective_date}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Alasan</Label>
                                    <Textarea
                                        rows={4}
                                        placeholder="Alasan resign/PHK"
                                        value={form.data.reason}
                                        onChange={(event) => form.setData('reason', event.target.value)}
                                    />
                                    {form.errors.reason && (
                                        <p className="text-xs text-red-500">{form.errors.reason}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                className="md:min-w-[90px]"
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-900 hover:bg-blue-800 md:min-w-[120px] text-white"
                                disabled={form.processing}
                            >
                                {form.processing ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-3xl border border-slate-200 bg-white p-0">
                    <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4">
                        <DialogTitle>Pilih Staff</DialogTitle>
                        <DialogDescription>
                            Pilih karyawan staff aktif untuk mengisi ID karyawan secara otomatis.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Cari nama, ID karyawan, atau divisi..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>

                        <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                            {filteredStaff.length === 0 ? (
                                <div className="px-4 py-10 text-center text-sm text-slate-500">
                                    Data staff tidak ditemukan.
                                </div>
                            ) : (
                                filteredStaff.map((staff) => (
                                    <button
                                        key={staff.id}
                                        type="button"
                                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50"
                                        onClick={() => handleSelectStaff(staff)}
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">
                                                {staff.name}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {staff.employeeCode} - {staff.division ?? '-'}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                                            Pilih
                                        </Badge>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                    <DialogFooter className="border-t border-slate-100 px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPickerOpen(false)}
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
