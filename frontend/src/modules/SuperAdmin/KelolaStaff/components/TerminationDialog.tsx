import { UserMinus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { useForm } from '@/shared/lib/inertia';

interface TerminationDialogProps {
    typeOptions?: Array<'Resign' | 'PHK' | 'Pensiun'>;
}

export default function TerminationDialog({
    typeOptions = ['Resign', 'PHK', 'Pensiun'],
}: TerminationDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useForm({
        employee_code: '',
        type: '' as '' | 'Resign' | 'PHK' | 'Pensiun',
        effective_date: '',
        reason: '',
    });

    const handleSubmit = () => {
        form.post(route('super-admin.staff.store'), {
            onSuccess: () => {
                toast.success('Pengajuan termination berhasil disimpan');
                form.reset();
                setOpen(false);
            },
            onError: () => toast.error('Gagal menyimpan data, periksa input Anda'),
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                            <div className="space-y-2">
                                <Label>ID Karyawan</Label>
                                <Input
                                    placeholder="STFXXXX"
                                    value={form.data.employee_code}
                                    onChange={(event) =>
                                        form.setData('employee_code', event.target.value.toUpperCase())
                                    }
                                />
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
                            <div className="space-y-2">
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
    );
}



