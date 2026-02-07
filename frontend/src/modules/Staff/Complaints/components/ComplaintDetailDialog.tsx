import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';

import type { ComplaintRecord } from '../types';

interface ComplaintDetailDialogProps {
    complaint: ComplaintRecord | null;
    onOpenChange: (open: boolean) => void;
}

export default function ComplaintDetailDialog({
    complaint,
    onOpenChange,
}: ComplaintDetailDialogProps) {
    if (!complaint) return null;

    return (
        <Dialog open={Boolean(complaint)} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[85vh] max-w-3xl flex-col gap-0 border-0 bg-white p-0 overflow-hidden">
                <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-8 py-5 text-left space-y-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold">Detail Pengaduan</DialogTitle>
                            <DialogDescription className="mt-1.5">
                                Informasi lengkap status penanganan dan catatan penyelesaian.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 w-full bg-white min-h-0">
                    <div className="flex flex-col gap-8 px-8 pb-8 pt-6">

                        {/* Informasi Utama */}
                        <section className="space-y-4">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                Informasi Pengaduan
                            </h4>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5 rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                                <DetailInfo label="Nomor Tiket" value={complaint.letterNumber ?? '-'} />
                                <DetailInfo label="Kategori" value={complaint.category} />
                                <DetailInfo label="Tanggal" value={complaint.date} />
                                <DetailInfo
                                    label="Prioritas"
                                    value={<PriorityBadge priority={complaint.priority} />}
                                />
                                <div className="col-span-2">
                                    <DetailInfo
                                        label="Status"
                                        value={<StatusBadge status={complaint.status} />}
                                    />
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Detail Subjek & Deskripsi */}
                        <div className="grid grid-cols-1 gap-8">
                            <section className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Subjek
                                </h4>
                                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium text-slate-900 shadow-sm">
                                    {complaint.subject}
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Deskripsi Masalah
                                </h4>
                                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700 shadow-sm whitespace-pre-wrap">
                                    {complaint.description ?? '-'}
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h4 className="flex items-center justify-between text-sm font-semibold text-slate-900">
                                    <span>Tindak Lanjut HR</span>
                                    {complaint.handler && (
                                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                            {complaint.handler}
                                        </Badge>
                                    )}
                                </h4>
                                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm leading-relaxed text-slate-900 shadow-sm">
                                    {complaint.resolutionNotes?.length
                                        ? complaint.resolutionNotes
                                        : <span className="text-slate-500 italic">Belum ada catatan penanganan dari tim HR.</span>}
                                </div>
                            </section>

                            {complaint.attachment?.url && (
                                <section className="space-y-3">
                                    <h4 className="text-sm font-semibold text-slate-900">
                                        Lampiran
                                    </h4>
                                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">
                                                    {complaint.attachment.name ?? 'Berkas lampiran'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Klik tombol untuk melihat dokumen.
                                                </p>
                                            </div>
                                        </div>
                                        <Button asChild size="sm" variant="outline">
                                            <a href={complaint.attachment.url} target="_blank" rel="noreferrer">
                                                Lihat
                                            </a>
                                        </Button>
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function DetailInfo({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {label}
            </p>
            <div className="text-sm font-semibold text-slate-900">
                {value}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();

    if (normalized.includes('selesai')) {
        return (
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-600">
                {status}
            </Badge>
        );
    }
    if (normalized.includes('tangani') || normalized.includes('proses')) {
        return (
            <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-600">
                {status}
            </Badge>
        );
    }
    return <Badge variant="outline" className="bg-slate-50 border-blue-200 text-blue-700">{status}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const normalized = priority.toLowerCase();

    if (normalized.includes('tinggi') || normalized === 'high') {
        return <Badge className="bg-red-100 hover:bg-red-200 text-red-600 border-0">Tinggi</Badge>;
    }

    if (normalized.includes('sedang') || normalized === 'medium') {
        return <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-600 border-0">Sedang</Badge>;
    }

    return <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-600 border-0">Rendah</Badge>;
}


