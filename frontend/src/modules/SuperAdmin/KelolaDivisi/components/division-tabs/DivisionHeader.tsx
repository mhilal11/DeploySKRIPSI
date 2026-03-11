import { Briefcase, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { DivisionRecord } from '@/modules/SuperAdmin/KelolaDivisi/types';
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


type DivisionHeaderProps = {
    division: DivisionRecord;
    activeJobsCount: number;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting: boolean;
};

export function DivisionHeader({
    division,
    activeJobsCount,
    onEdit,
    onDelete,
    isDeleting,
}: DivisionHeaderProps) {
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const hasStaff = division.current_staff > 0;

    return (
        <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-blue-900">{division.name}</h3>
                        {activeJobsCount > 0 && (
                            <Badge className="bg-green-600 hover:bg-green-600">
                                <Briefcase className="mr-1 h-3 w-3" />
                                {activeJobsCount} Lowongan Aktif
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-slate-600">
                        {division.description ?? 'Belum ada deskripsi.'}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">
                        Manager:{' '}
                        <span className="font-medium text-slate-900">
                            {division.manager_name ?? 'Belum ditentukan'}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Settings className="mr-2 h-4 w-4" />
                        Pengaturan
                    </Button>
                    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                disabled={hasStaff || isDeleting}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus Divisi
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Divisi?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Divisi yang dihapus tidak akan muncul lagi pada konfigurasi divisi.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={onDelete}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                >
                                    Hapus
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            {hasStaff && (
                <p className="mt-3 text-xs text-red-600">
                    Divisi ini tidak dapat dihapus karena masih memiliki {division.current_staff}{' '}
                    staff/admin aktif.
                </p>
            )}
        </div>
    );
}
