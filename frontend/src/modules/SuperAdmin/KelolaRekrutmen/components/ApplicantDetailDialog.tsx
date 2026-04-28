// src/Pages/SuperAdmin/Recruitment/components/ApplicantDetailDialog.tsx

import { FileText } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';
import { apiUrl, resolveAssetUrl } from '@/shared/lib/api';

import { ApplicantRecord, formatApplicationId } from '../types';
import { openCvViewer } from './openCvViewer';


interface ApplicantDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    applicant: ApplicantRecord | null;
}

function resolveCvExtension(path: string | null | undefined): string {
    const value = (path ?? '').trim();
    if (!value) {
        return '.pdf';
    }

    const clean = value.split('?')[0];
    const dot = clean.lastIndexOf('.');
    if (dot < 0) {
        return '.pdf';
    }

    const ext = clean.slice(dot).toLowerCase();
    if (/^\.[a-z0-9]{1,8}$/.test(ext)) {
        return ext;
    }

    return '.pdf';
}

function sanitizeCvName(name: string | null | undefined): string {
    const raw = (name ?? '').trim();
    if (!raw) {
        return 'Pelamar';
    }

    const normalized = raw
        .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
        .replace(/[\s_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return normalized || 'Pelamar';
}

function Detail({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-medium text-slate-900">{value ?? '-'}</p>
        </div>
    );
}

export default function ApplicantDetailDialog({
    open,
    onOpenChange,
    applicant,
}: ApplicantDetailDialogProps) {
    
    if (!applicant) return null;
    const cvDisplayName = applicant.name?.trim() ?? '';
    const cvSource = applicant.cv_file || applicant.cv_url;
    const cvDisplayFileName = `CV_${sanitizeCvName(cvDisplayName)}${resolveCvExtension(cvSource)}`;
    const cvDisplayNameQuery = cvDisplayName
        ? `?display_name=${encodeURIComponent(cvDisplayName)}`
        : '';
    const cvUrl =
        cvSource
            ? resolveAssetUrl(apiUrl(`/super-admin/recruitment/${applicant.id}/cv/${encodeURIComponent(cvDisplayFileName)}${cvDisplayNameQuery}`))
            : null;

    // FUNGSI: Melihat dokumen CV
    const handleViewDocument = () => {
        if (!cvUrl) {
            alert('Dokumen CV belum tersedia.');
            return;
        }

        // Buka dokumen CV di tab baru dengan judul yang lebih deskriptif.
        openCvViewer(cvUrl, cvDisplayName);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[96vw] overflow-hidden border-0 bg-white p-0 sm:w-full sm:max-w-xl">
                <DialogHeader className="space-y-1 border-b border-slate-100 px-4 py-4 sm:px-6">
                    <DialogTitle>Detail Pelamar</DialogTitle>
                    <DialogDescription>
                        Informasi singkat kandidat untuk memudahkan proses screening lanjutan.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
                    <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                        <Detail label="ID Lamaran" value={formatApplicationId(applicant.id)} />
                        <Detail label="Nama" value={applicant.name} />
                        <Detail label="Posisi" value={applicant.position} />
                        <Detail label="Email" value={applicant.email} />
                        <Detail label="Telepon" value={applicant.phone} />
                        <Detail label="Pendidikan" value={applicant.education} />
                        <Detail label="Pengalaman" value={applicant.experience} />
                        <Detail label="Status Saat Ini" value={applicant.status} />
                    </div>
                </div>

                <DialogFooter className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row">
                    {/* Tombol Lihat Dokumen */}
                    <Button 
                        variant="secondary" 
                        onClick={handleViewDocument}
                        className="flex w-full items-center sm:w-auto"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Lihat Dokumen
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


