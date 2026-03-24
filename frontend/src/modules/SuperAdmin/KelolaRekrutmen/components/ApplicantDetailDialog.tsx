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


interface ApplicantDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    applicant: ApplicantRecord | null;
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
    const cvUrl =
        applicant.cv_file || applicant.cv_url
            ? resolveAssetUrl(apiUrl(`/super-admin/recruitment/${applicant.id}/cv`))
            : null;

    // FUNGSI: Melihat dokumen CV
    const handleViewDocument = () => {
        if (!cvUrl) {
            alert('Dokumen CV belum tersedia.');
            return;
        }

        // Buka dokumen CV di tab baru
        window.open(cvUrl, '_blank');
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


