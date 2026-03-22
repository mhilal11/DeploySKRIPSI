import {
    AlertCircle,
    Briefcase,
    CheckCircle2,
    Edit,
    RotateCcw,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

import type {
    DivisionJob,
    DivisionRecord,
} from '@/modules/SuperAdmin/KelolaDivisi/types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/shared/components/ui/tooltip';


import { getActiveDivisionJobs, getInactiveDivisionJobs } from './utils';

type DivisionVacancySectionProps = {
    division: DivisionRecord;
    onOpenJob: (division: DivisionRecord, job?: DivisionJob) => void;
    onReopenJob: (division: DivisionRecord, job: DivisionJob) => void;
    onCloseJob: (division: DivisionRecord, jobId?: number) => void;
};

type VacancyCardProps = {
    division: DivisionRecord;
    job: DivisionJob;
    onEdit: () => void;
    onClose: () => void;
};

function VacancyCard({ division, job, onEdit, onClose }: VacancyCardProps) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const criteria: NonNullable<DivisionJob['job_eligibility_criteria']> =
        job.job_eligibility_criteria ?? {};
    const scoringWeights = criteria.scoring_weights;
    const hasCustomScoring = Boolean(
        scoringWeights &&
            (
                scoringWeights.education != null ||
                scoringWeights.experience != null ||
                scoringWeights.certification != null ||
                scoringWeights.profile != null ||
                scoringWeights.ai_screening != null
            ),
    );
    const cleanRequirements = (job.job_requirements ?? []).filter(
        (requirement) => requirement && requirement.trim() !== '',
    );
    const cleanPrograms = Array.isArray(criteria.program_studies)
        ? criteria.program_studies.filter((item) => item && item.trim() !== '')
        : [];

    return (
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h5 className="text-base font-semibold text-emerald-900 md:text-lg">
                        {job.job_title ?? 'Lowongan tanpa judul'}
                    </h5>
                    <p className="text-xs text-slate-700 md:text-sm">
                        {job.job_description || 'Belum ada deskripsi pekerjaan.'}
                    </p>

                    {cleanRequirements.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-slate-700 md:mt-3 md:text-sm">
                            {cleanRequirements.map((requirement, index) => (
                                <li
                                    key={`${job.id ?? 'legacy'}-req-${index}`}
                                    className="flex items-start gap-2"
                                >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                                    <span>{requirement}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                        {criteria.min_education && (
                            <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-700">
                                Min Edu: {criteria.min_education}
                            </Badge>
                        )}
                        {cleanPrograms.slice(0, 3).map((program) => (
                            <Badge key={`${job.id ?? 'legacy'}-${program}`} variant="outline" className="border-emerald-300 bg-white text-emerald-700">
                                Prodi: {program}
                            </Badge>
                        ))}
                        {cleanPrograms.length > 3 && (
                            <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-700">
                                +{cleanPrograms.length - 3} prodi lain
                            </Badge>
                        )}
                        {(criteria.min_experience_years ?? 0) > 0 && (
                            <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-700">
                                Min Exp: {criteria.min_experience_years} th
                            </Badge>
                        )}
                        {(criteria.min_age ?? 0) > 0 && (
                            <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-700">
                                Umur Min: {criteria.min_age}
                            </Badge>
                        )}
                        {(criteria.max_age ?? 0) > 0 && (
                            <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-700">
                                Umur Max: {criteria.max_age}
                            </Badge>
                        )}
                        {hasCustomScoring && (
                            <Badge variant="outline" className="border-indigo-300 bg-white text-indigo-700">
                                Custom Scoring Aktif
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={onEdit}>
                                    <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Edit Lowongan</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => setIsAlertOpen(true)}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Tutup Lowongan
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Tutup Lowongan</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Tutup Lowongan?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Lowongan akan ditutup dan tidak lagi muncul pada portal pelamar.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={onClose}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                >
                                    Tutup Lowongan
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            {division.available_slots <= 0 && (
                <p className="mt-3 text-xs text-red-600">
                    Kapasitas divisi penuh. Pertimbangkan menambah kapasitas untuk mempercepat
                    pemenuhan posisi.
                </p>
            )}
        </div>
    );
}

type ClosedVacancyCardProps = {
    division: DivisionRecord;
    job: DivisionJob;
    onReopen: () => void;
};

function ClosedVacancyCard({ division, job, onReopen }: ClosedVacancyCardProps) {
    const cleanRequirements = (job.job_requirements ?? []).filter(
        (requirement) => requirement && requirement.trim() !== '',
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                            Ditutup
                        </Badge>
                    </div>
                    <h5 className="text-base font-semibold text-slate-900 md:text-lg">
                        {job.job_title ?? 'Lowongan tanpa judul'}
                    </h5>
                    <p className="text-xs text-slate-700 md:text-sm">
                        {job.job_description || 'Belum ada deskripsi pekerjaan.'}
                    </p>

                    {cleanRequirements.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-slate-700 md:mt-3 md:text-sm">
                            {cleanRequirements.slice(0, 3).map((requirement, index) => (
                                <li
                                    key={`${job.id ?? 'closed'}-req-${index}`}
                                    className="flex items-start gap-2"
                                >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-500" />
                                    <span>{requirement}</span>
                                </li>
                            ))}
                            {cleanRequirements.length > 3 && (
                                <li className="text-xs text-slate-500">+{cleanRequirements.length - 3} persyaratan lain</li>
                            )}
                        </ul>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        onClick={onReopen}
                        disabled={division.available_slots === 0}
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Buka Lagi
                    </Button>
                </div>
            </div>
            {division.available_slots <= 0 && (
                <p className="mt-3 text-xs text-red-600">
                    Kapasitas divisi penuh. Tingkatkan kapasitas sebelum membuka kembali lowongan.
                </p>
            )}
        </div>
    );
}

export function DivisionVacancySection({
    division,
    onOpenJob,
    onReopenJob,
    onCloseJob,
}: DivisionVacancySectionProps) {
    const activeJobs = getActiveDivisionJobs(division);
    const closedJobs = getInactiveDivisionJobs(division);
    const [isCloseAllAlertOpen, setIsCloseAllAlertOpen] = useState(false);

    if (activeJobs.length > 0) {
        return (
            <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-3 md:space-y-4 md:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h4 className="text-base font-semibold text-green-900 md:text-lg">
                            Lowongan Aktif ({activeJobs.length})
                        </h4>
                        <p className="text-xs text-slate-700 md:text-sm">
                            Setiap lowongan bisa dikelola secara terpisah untuk proses rekrutmen
                            yang lebih fleksibel.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <AlertDialog open={isCloseAllAlertOpen} onOpenChange={setIsCloseAllAlertOpen}>
                            <Button
                                variant="outline"
                                className="border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setIsCloseAllAlertOpen(true)}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Tutup Semua Lowongan
                            </Button>
                            <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Tutup Semua Lowongan?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Semua lowongan aktif pada divisi ini akan ditutup.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => onCloseJob(division)}
                                        className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                        Tutup Semua
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button
                            onClick={() => onOpenJob(division)}
                            disabled={division.available_slots === 0}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-60"
                        >
                            <Briefcase className="mr-2 h-4 w-4" />
                            Buka Lowongan Baru
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    {activeJobs.map((job, index) => (
                        <VacancyCard
                            key={job.id ?? `legacy-${division.id}-${index}`}
                            division={division}
                            job={job}
                            onEdit={() => onOpenJob(division, job)}
                            onClose={() => onCloseJob(division, job.id ?? undefined)}
                        />
                    ))}
                </div>

                {division.available_slots === 0 && (
                    <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
                        <AlertCircle className="mr-2 inline h-4 w-4" />
                        Kapasitas sudah penuh. Edit kapasitas divisi terlebih dahulu.
                    </div>
                )}

                {closedJobs.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4">
                        <div>
                            <h5 className="text-sm font-semibold text-slate-900 md:text-base">
                                Lowongan Ditutup ({closedJobs.length})
                            </h5>
                            <p className="text-xs text-slate-600 md:text-sm">
                                Lowongan yang ditutup tidak dihapus dan bisa dibuka kembali.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {closedJobs.map((job, index) => (
                                <ClosedVacancyCard
                                    key={job.id ?? `closed-${division.id}-${index}`}
                                    division={division}
                                    job={job}
                                    onReopen={() => onReopenJob(division, job)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-dashed p-6 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="font-medium text-slate-900">Tidak ada lowongan aktif</p>
            <p className="mt-1 text-sm text-slate-600">
                {division.available_slots > 0
                    ? 'Masih tersedia slot. Anda dapat membuka lowongan baru.'
                    : 'Kapasitas penuh. Tingkatkan kapasitas untuk membuka lowongan.'}
            </p>
            <div className="mt-4 flex justify-center">
                <Button
                    onClick={() => onOpenJob(division)}
                    disabled={division.available_slots === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-60"
                >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Buka Lowongan Baru
                </Button>
            </div>
            {division.available_slots === 0 && (
                <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
                    <AlertCircle className="mr-2 inline h-4 w-4" />
                    Kapasitas sudah penuh. Edit kapasitas divisi terlebih dahulu.
                </div>
            )}

            {closedJobs.length > 0 && (
                <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left md:p-4">
                    <div>
                        <h5 className="text-sm font-semibold text-slate-900 md:text-base">
                            Riwayat Lowongan Ditutup ({closedJobs.length})
                        </h5>
                        <p className="text-xs text-slate-600 md:text-sm">
                            Pilih lowongan untuk dibuka kembali tanpa membuat data baru.
                        </p>
                    </div>
                    <div className="space-y-3">
                        {closedJobs.map((job, index) => (
                            <ClosedVacancyCard
                                key={job.id ?? `closed-empty-${division.id}-${index}`}
                                division={division}
                                job={job}
                                onReopen={() => onReopenJob(division, job)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
