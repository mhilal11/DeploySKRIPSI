import { Trash2, User } from 'lucide-react';
import { useState } from 'react';

import {
    ApplicantRecord,
    formatApplicationId,
} from '@/modules/SuperAdmin/KelolaRekrutmen/types';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';


import {
    formatScore,
    normalizeDivisionLabel,
    recommendationBadgeClass,
    renderSlaTooltipIcon,
    renderSlaTooltipIconDesktop,
    scoreBadgeClass,
    slaBadge,
    statusBadge,
} from './utils';

type ApplicantsResultsSectionProps = {
    paginatedApplications: ApplicantRecord[];
    isUpdatingStatus: boolean;
    updatingApplicantId: number | null;
    onViewProfile?: (application: ApplicantRecord) => void;
    onDeleteApplication: (application: ApplicantRecord) => void;
    isDeletingApplication: boolean;
    deletingApplicationId: number | null;
    rawTotalPages: number;
    startIndex: number;
    itemsPerPage: number;
    filteredApplicationsLength: number;
    totalPages: number;
    currentPage: number;
    setCurrentPage: (value: number | ((previous: number) => number)) => void;
};

export function ApplicantsResultsSection({
    paginatedApplications,
    isUpdatingStatus,
    updatingApplicantId,
    onViewProfile,
    onDeleteApplication,
    isDeletingApplication,
    deletingApplicationId,
    rawTotalPages,
    startIndex,
    itemsPerPage,
    filteredApplicationsLength,
    totalPages,
    currentPage,
    setCurrentPage,
}: ApplicantsResultsSectionProps) {
    return (
        <>
            <div className="block space-y-3 md:hidden">
                {paginatedApplications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">Tidak ada data pelamar.</p>
                ) : (
                    paginatedApplications.map((application) => {
                        const isCurrentlyUpdating = isUpdatingStatus && updatingApplicantId === application.id;
                        const recruitmentScore = application.recruitment_score;
                        const totalScore = recruitmentScore?.total;
                        const rankingLabel =
                            recruitmentScore?.rank && recruitmentScore?.total_candidates
                                ? `${recruitmentScore.rank}/${recruitmentScore.total_candidates}`
                                : '-';
                        const recommendation = recruitmentScore?.recommendation;

                        return (
                            <div key={application.id} className="space-y-2 rounded-lg border p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-slate-900">{application.name}</p>
                                        <p className="truncate text-[10px] text-slate-500">{application.email}</p>
                                    </div>
                                    {statusBadge(application.status)}
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                    <div>
                                        <p className="text-[10px] text-slate-400">ID Lamaran</p>
                                        <p className="text-[11px] font-semibold text-blue-700">
                                            {formatApplicationId(application.id)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Divisi</p>
                                        <p className="truncate text-[11px] text-slate-700">
                                            {normalizeDivisionLabel(application.division)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Posisi</p>
                                        <p className="truncate text-[11px] text-slate-700">{application.position}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Skor</p>
                                        <Badge variant="outline" className={`text-[10px] ${scoreBadgeClass(totalScore)}`}>
                                            {formatScore(totalScore)}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Peringkat</p>
                                        <p className="text-[11px] font-semibold text-slate-700">{rankingLabel}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-slate-400">Rekomendasi</p>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] ${recommendationBadgeClass(recommendation, recruitmentScore?.eligible)}`}
                                        >
                                            {recommendation ?? '-'}
                                        </Badge>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-1">
                                            <p className="text-[10px] text-slate-400">SLA Stage</p>
                                            {renderSlaTooltipIcon()}
                                        </div>
                                        {slaBadge(application)}
                                    </div>
                                </div>
                                {onViewProfile && (
                                    <div className="border-t border-slate-100 pt-1.5">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onViewProfile(application)}
                                                disabled={isCurrentlyUpdating}
                                                className="h-7 flex-1 justify-center px-2 text-xs"
                                            >
                                                <User className="mr-1 h-3 w-3 text-blue-600" />
                                                Lihat Profil
                                            </Button>
                                            <DeleteApplicationButton
                                                application={application}
                                                onDeleteApplication={onDeleteApplication}
                                                isDeletingApplication={isDeletingApplication}
                                                deletingApplicationId={deletingApplicationId}
                                                mode="icon"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[50px]">No</TableHead>
                            <TableHead>ID Lamaran</TableHead>
                            <TableHead>Pelamar</TableHead>
                            <TableHead>Divisi</TableHead>
                            <TableHead>Posisi</TableHead>
                            <TableHead>Skor</TableHead>
                            <TableHead>Peringkat</TableHead>
                            <TableHead>Rekomendasi</TableHead>
                            <TableHead className="w-[170px]">
                                <div className="flex items-center gap-1">
                                    <span>SLA Stage</span>
                                    {renderSlaTooltipIconDesktop()}
                                </div>
                            </TableHead>
                            <TableHead className="w-[90px]">Status</TableHead>
                            <TableHead className="w-[210px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {paginatedApplications.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={11} className="py-8 text-center text-sm text-slate-500">
                                    Tidak ada data pelamar untuk kombinasi filter saat ini.
                                </TableCell>
                            </TableRow>
                        )}
                        {paginatedApplications.map((application, index) => {
                            const isCurrentlyUpdating = isUpdatingStatus && updatingApplicantId === application.id;
                            const recruitmentScore = application.recruitment_score;
                            const totalScore = recruitmentScore?.total;
                            const rankingLabel =
                                recruitmentScore?.rank && recruitmentScore?.total_candidates
                                    ? `${recruitmentScore.rank}/${recruitmentScore.total_candidates}`
                                    : '-';
                            const recommendation = recruitmentScore?.recommendation;

                            return (
                                <TableRow key={application.id}>
                                    <TableCell className="font-medium text-slate-900">
                                        {startIndex + index + 1}
                                    </TableCell>
                                    <TableCell className="font-semibold text-blue-900">
                                        {formatApplicationId(application.id)}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-slate-900">{application.name}</p>
                                        <p className="text-sm text-slate-500">{application.email}</p>
                                    </TableCell>
                                    <TableCell>{normalizeDivisionLabel(application.division)}</TableCell>
                                    <TableCell>{application.position}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={scoreBadgeClass(totalScore)}>
                                            {formatScore(totalScore)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-700">{rankingLabel}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={recommendationBadgeClass(recommendation, recruitmentScore?.eligible)}
                                        >
                                            {recommendation ?? '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{slaBadge(application)}</TableCell>
                                    <TableCell>{statusBadge(application.status)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            {onViewProfile && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onViewProfile(application)}
                                                    disabled={isCurrentlyUpdating}
                                                    className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    <User className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <DeleteApplicationButton
                                                application={application}
                                                onDeleteApplication={onDeleteApplication}
                                                isDeletingApplication={isDeletingApplication}
                                                deletingApplicationId={deletingApplicationId}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {rawTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="text-xs text-slate-500">
                        Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredApplicationsLength)} dari{' '}
                        {filteredApplicationsLength} pelamar
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8 px-3"
                        >
                            Sebelumnya
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="h-8 w-8 p-0"
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 px-3"
                        >
                            Selanjutnya
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

type DeleteApplicationButtonProps = {
    application: ApplicantRecord;
    onDeleteApplication: (application: ApplicantRecord) => void;
    isDeletingApplication: boolean;
    deletingApplicationId: number | null;
    mode?: 'default' | 'icon';
};

function DeleteApplicationButton({
    application,
    onDeleteApplication,
    isDeletingApplication,
    deletingApplicationId,
    mode = 'default',
}: DeleteApplicationButtonProps) {
    const [open, setOpen] = useState(false);
    const isDeletingCurrent = isDeletingApplication && deletingApplicationId === application.id;

    const trigger =
        mode === 'icon' ? (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={isDeletingApplication}
                aria-label={`Hapus lamaran ${application.name}`}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        ) : (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={isDeletingApplication}
                aria-label={`Hapus lamaran ${application.name}`}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        );

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus lamaran {application.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini hanya akan menghapus data lamaran recruitment untuk posisi
                        {` ${application.position}`}. Akun pelamar tidak akan dihapus.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingApplication}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 text-white hover:bg-red-500"
                        disabled={isDeletingApplication}
                        onClick={() => {
                            onDeleteApplication(application);
                            setOpen(false);
                        }}
                    >
                        {isDeletingCurrent ? 'Menghapus...' : 'Ya, hapus lamaran'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
