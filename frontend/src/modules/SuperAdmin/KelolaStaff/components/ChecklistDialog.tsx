import { CheckCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
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
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useForm } from '@/shared/lib/inertia';

import { TerminationRecord } from '../types';


interface ChecklistDialogProps {
    termination: TerminationRecord;
    checklistTemplate: string[];
    trigger: React.ReactNode;
    tooltip?: string;
}

export default function ChecklistDialog({
    termination,
    checklistTemplate,
    trigger,
    tooltip,
}: ChecklistDialogProps) {
    const [open, setOpen] = useState(false);
    const defaultChecklist = useMemo(
        () =>
            checklistTemplate.reduce<Record<string, boolean>>(
                (acc, item) => ({
                    ...acc,
                    [item]: Boolean(termination.checklist?.[item]),
                }),
                {}
            ),
        [checklistTemplate, termination.checklist]
    );

    const form = useForm({
        checklist: defaultChecklist,
        notes: termination.notes ?? '',
        status: termination.status as TerminationRecord['status'],
        progress: termination.progress ?? 0,
    });

    const totalItems = checklistTemplate.length || 1;
    const computeProgress = (checklist: Record<string, boolean>) => {
        const completed = Object.values(checklist).filter(Boolean).length;
        return totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
    };
    const progressValue = computeProgress(form.data.checklist);
    const completedItems = Object.values(form.data.checklist).filter(Boolean).length;
    const allChecklistCompleted = completedItems === totalItems;

    const handleSubmit = (
        statusOverride?: TerminationRecord['status'],
        options: {
            closeAfterSuccess?: boolean;
            progressOverride?: number;
        } = {}
    ) => {
        const nextProgress =
            typeof options.progressOverride === 'number'
                ? options.progressOverride
                : statusOverride === 'Selesai'
                    ? 100
                    : computeProgress(form.data.checklist);

        form.transform((data) => ({
            ...data,
            status: statusOverride ?? data.status,
            progress: nextProgress,
        }));

        form.patch(route('super-admin.staff.update', termination.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Progress checklist tersimpan.');
                if (options.closeAfterSuccess) {
                    setOpen(false);
                }
            },
            onFinish: () => {
                form.transform((data) => data);
            },
        });
    };

    const markCompleted = () => {
        const allTrue = checklistTemplate.reduce<Record<string, boolean>>(
            (acc, item) => ({ ...acc, [item]: true }),
            {}
        );
        form.setData('checklist', allTrue);
        handleSubmit('Selesai', {
            closeAfterSuccess: true,
            progressOverride: 100,
        });
    };

    const triggerWithOnClick = React.cloneElement(trigger as React.ReactElement, {
        onClick: (e: React.MouseEvent) => {
            setOpen(true);
            (trigger as React.ReactElement).props.onClick?.(e);
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {tooltip ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {triggerWithOnClick}
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                triggerWithOnClick
            )}

            <DialogContent className="w-[92vw] max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto border-0 bg-white p-0 rounded-xl">
                <DialogHeader className="sticky top-0 z-10 space-y-1 border-b border-slate-200 bg-white px-6 py-4 text-left">
                    <DialogTitle>Checklist Offboarding: {termination.employeeName}</DialogTitle>
                    <DialogDescription>
                        Pantau progres serah terima dan catatan HR terkait karyawan.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 px-6 pb-6 pt-4">
                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                        <DetailItem label="ID" value={termination.reference} />
                        <DetailItem label="Divisi" value={termination.division} />
                        <DetailItem label="Tipe" value={termination.type} />
                        <DetailItem label="Tanggal Efektif" value={termination.effectiveDate} />
                        <DetailItem label="Status saat ini" value={termination.status} />
                        <div>
                            <p className="text-xs text-slate-500">Progress</p>
                            <div className="mt-1 flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-slate-200">
                                    <div
                                        className="h-2 rounded-full bg-blue-900"
                                        style={{ width: `${progressValue}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">{progressValue}%</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-3 text-base font-semibold text-slate-900">
                            Checklist Offboarding
                        </h4>
                        <div className="space-y-2">
                            {checklistTemplate.map((item) => (
                                <label
                                    key={item}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                                >
                                    <Checkbox
                                        checked={form.data.checklist[item] ?? false}
                                        onCheckedChange={(value) =>
                                            form.setData('checklist', {
                                                ...form.data.checklist,
                                                [item]: Boolean(value),
                                            })
                                        }
                                    />
                                    <span className="flex-1 text-slate-700">{item}</span>
                                    {form.data.checklist[item] && (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Status Proses</Label>
                            <Select
                                value={form.data.status}
                                onValueChange={(value) =>
                                    form.setData('status', value as TerminationRecord['status'])
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Diajukan">Diajukan</SelectItem>
                                    <SelectItem value="Proses">Proses</SelectItem>
                                    <SelectItem value="Selesai">Selesai</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.status && (
                                <p className="text-xs text-red-500">{form.errors.status}</p>
                            )}
                        </div>
                        <div>
                            <Label>Catatan HR</Label>
                            <Textarea
                                rows={3}
                                placeholder="Tambahkan catatan..."
                                value={form.data.notes}
                                onChange={(event) => form.setData('notes', event.target.value)}
                            />
                            {form.errors.notes && (
                                <p className="text-xs text-red-500">{form.errors.notes}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={form.processing}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-600"
                        >
                            Batal
                        </Button>
                        <Button
                            className="bg-blue-900 text-white hover:bg-blue-800"
                            onClick={() => handleSubmit(undefined, { closeAfterSuccess: true })}
                            disabled={form.processing}
                        >
                            {form.processing ? 'Menyimpan...' : 'Simpan Progress'}
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-green-500 text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={form.processing || !allChecklistCompleted}
                                    title={!allChecklistCompleted ? `Checklist belum lengkap (${completedItems}/${totalItems})` : ''}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Tandai Selesai
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Sudah yakin checklist selesai?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan menandai seluruh item checklist sebagai selesai dan
                                        memperbarui status offboarding menjadi selesai.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                     Semua {totalItems} tugas checklist telah diselesaikan. Proses offboarding siap ditandai selesai.
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={form.processing}>
                                        Cek Lagi
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-green-600 text-white hover:bg-green-500"
                                        onClick={() => markCompleted()}
                                        disabled={form.processing}
                                    >
                                        Ya, tandai selesai
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {!allChecklistCompleted && (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                                 Checklist belum lengkap ({completedItems}/{totalItems})
                            </Badge>
                        )}
                        <Badge variant="outline" className="border-slate-300 text-slate-600">
                            Checklist bersifat internal untuk tim HR.
                        </Badge>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-sm font-medium text-slate-900">{value ?? '-'}</p>
        </div>
    );
}




