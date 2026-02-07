import { useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import { useForm } from '@/shared/lib/inertia';

import type { ComplaintRecord, Option } from '../types';


interface ComplaintDetailDialogProps {
    complaint: ComplaintRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    statusOptions: Option[];
    priorityOptions: Option[];
}

export default function ComplaintDetailDialog({
    complaint,
    open,
    onOpenChange,
    statusOptions,
    priorityOptions,
}: ComplaintDetailDialogProps) {
    const form = useForm({
        status: complaint?.status ?? '',
        priority: complaint?.priority ?? '',
        resolution_notes: complaint?.resolutionNotes ?? '',
    });

    useEffect(() => {
        if (complaint) {
            form.setData({
                status: complaint.status,
                priority: complaint.priority,
                resolution_notes: complaint.resolutionNotes ?? '',
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complaint?.id]);

    const handleSubmit = () => {
        if (!complaint) {
            return;
        }

        form.patch(route('super-admin.complaints.update', complaint.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.clearErrors();
                toast.success('Data pengaduan diperbarui', {
                    description: `Pengaduan ${complaint.code} telah disimpan.`,
                });
                onOpenChange(false);
            },
        });
    };

    const statusValue = form.data.status || complaint?.status || '';
    const priorityValue = form.data.priority || complaint?.priority || '';
    const statusLabel =
        statusOptions.find((option) => option.value === statusValue)?.label ??
        complaint?.statusLabel ??
        '-';
    const priorityLabel =
        priorityOptions.find((option) => option.value === priorityValue)?.label ??
        complaint?.priorityLabel ??
        '-';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl overflow-hidden border-0 bg-white p-0">
                <DialogHeader className="space-y-1 border-b border-slate-100 px-6 py-4">
                    <DialogTitle>Detail Pengaduan</DialogTitle>
                    <DialogDescription>
                        Pantau konteks laporan karyawan dan perbarui status penanganan.
                    </DialogDescription>
                    {complaint && (
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                            ID Pengaduan {complaint.code}
                        </p>
                    )}
                </DialogHeader>

                {!complaint ? (
                    <div className="max-h-[calc(85vh-4.5rem)] overflow-y-auto px-6 py-12 text-center text-sm text-slate-500">
                        Pilih pengaduan pada tabel untuk melihat detail lengkap.
                    </div>
                ) : (
                    <div className="max-h-[calc(85vh-4.5rem)] space-y-6 overflow-y-auto px-6 pb-6 pt-4">
                        <section className="grid gap-4 md:grid-cols-3">
                            <SummaryCard label="Status">
                                <StatusBadge status={statusValue} label={statusLabel} />
                            </SummaryCard>
                            <SummaryCard label="Prioritas">
                                <PriorityBadge priority={priorityValue} label={priorityLabel} />
                            </SummaryCard>
                            <SummaryCard label="Penanggung Jawab">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {complaint.handler ?? 'Belum ditugaskan'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {complaint.resolvedAt
                                            ? `Selesai ${complaint.resolvedAt}`
                                            : `Dibuat ${complaint.submittedAt ?? '-'}`}
                                    </p>
                                </div>
                            </SummaryCard>
                        </section>

                        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                            <div className="space-y-6">
                                <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <DetailItem label="Pelapor">
                                            <div className="flex flex-col gap-1 text-sm text-slate-700">
                                                <div className="flex items-center gap-2 text-slate-900">
                                                    <span className="font-semibold">
                                                        {complaint.isAnonymous
                                                            ? 'Anonim'
                                                            : complaint.reporter}
                                                    </span>
                                                    {complaint.isAnonymous && (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-amber-200 bg-amber-50 text-amber-800"
                                                        >
                                                            Anonim
                                                        </Badge>
                                                    )}
                                                </div>
                                                {complaint.reporterEmail && !complaint.isAnonymous && (
                                                    <span className="text-xs text-slate-500">
                                                        {complaint.reporterEmail}
                                                    </span>
                                                )}
                                            </div>
                                        </DetailItem>
                                        <DetailItem label="Kategori">{complaint.category}</DetailItem>
                                        <DetailItem label="Tanggal Pengaduan">
                                            {complaint.submittedAt ?? '-'}
                                        </DetailItem>
                                        <DetailItem label="Status Saat Ini">
                                            <StatusBadge status={statusValue} label={statusLabel} />
                                        </DetailItem>
                                    </div>
                                </section>

                                <section className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-5">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Subjek
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-slate-900">
                                            {complaint.subject}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Deskripsi
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white/60 p-3 text-sm text-slate-700">
                                            {complaint.description ?? '-'}
                                        </p>
                                    </div>
                                    {complaint.attachment?.url && (
                                        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                                    Lampiran
                                                </p>
                                                <p className="mt-1 font-medium text-slate-900">
                                                    {complaint.attachment.name ?? 'File lampiran'}
                                                </p>
                                            </div>
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                                className="border-blue-200 text-blue-900 hover:bg-blue-50"
                                            >
                                                <a
                                                    href={complaint.attachment.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Lihat
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </section>
                            </div>

                            <div className="space-y-6">
                                <section className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">
                                                Tindak Lanjut
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                Perbarui status dan catatan penanganan pengaduan.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <Label>Status Tindak Lanjut</Label>
                                            <Select
                                                value={form.data.status}
                                                onValueChange={(value) => form.setData('status', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statusOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {form.errors.status && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {form.errors.status}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Prioritas</Label>
                                            <Select
                                                value={form.data.priority}
                                                onValueChange={(value) => form.setData('priority', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih prioritas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {priorityOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {form.errors.priority && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {form.errors.priority}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Catatan Penanganan</Label>
                                            <Textarea
                                                rows={6}
                                                value={form.data.resolution_notes}
                                                onChange={(event) =>
                                                    form.setData('resolution_notes', event.target.value)
                                                }
                                                placeholder="Tulis tanggapan atau tindak lanjut untuk pengaduan ini..."
                                            />
                                            {form.errors.resolution_notes && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {form.errors.resolution_notes}
                                                </p>
                                            )}
                                        </div>
                                        {complaint.resolvedAt && (
                                            <p className="text-xs text-emerald-600">
                                                Ditandai selesai pada {complaint.resolvedAt}
                                            </p>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 py-1 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                className="sm:min-w-[90px]"
                                onClick={() => onOpenChange(false)}
                            >
                                Tutup
                            </Button>
                            <Button
                                type="button"
                                className="bg-blue-900 hover:bg-blue-800 sm:min-w-[120px] text-white"
                                disabled={form.processing}
                                onClick={handleSubmit}
                            >
                                {form.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function DetailItem({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border border-slate-200/70 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <div className="mt-1 text-sm text-slate-700">{children}</div>
        </div>
    );
}

function SummaryCard({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <div className="mt-2">{children}</div>
        </div>
    );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
    return (
        <Badge
            variant="outline"
            className={`border text-xs font-semibold ${statusBadgeClasses(status)}`}
        >
            {label}
        </Badge>
    );
}

function PriorityBadge({
    priority,
    label,
}: {
    priority: string;
    label: string;
}) {
    return (
        <Badge
            variant="outline"
            className={`border text-xs font-semibold ${priorityBadgeClasses(priority)}`}
        >
            {label}
        </Badge>
    );
}

function statusBadgeClasses(status: string) {
    switch (status) {
        case 'new':
        case 'open':
            return 'border-sky-200 bg-sky-50 text-sky-800';
        case 'in_progress':
        case 'processing':
            return 'border-amber-200 bg-amber-50 text-amber-800';
        case 'resolved':
        case 'closed':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        default:
            return 'border-slate-200 bg-slate-50 text-slate-700';
    }
}

function priorityBadgeClasses(priority: string) {
    switch (priority) {
        case 'high':
            return 'border-red-200 bg-red-50 text-red-700';
        case 'medium':
            return 'border-orange-200 bg-orange-50 text-orange-700';
        case 'low':
            return 'border-blue-200 bg-blue-50 text-blue-700';
        default:
            return 'border-slate-200 bg-slate-50 text-slate-700';
    }
}



