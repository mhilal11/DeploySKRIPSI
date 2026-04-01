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

import type { ConfirmTemplateAction } from './types';

type TemplateConfirmDialogProps = {
    confirmAction: ConfirmTemplateAction;
    isMutatingTemplate: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
};

export function TemplateConfirmDialog({
    confirmAction,
    isMutatingTemplate,
    onConfirm,
    onOpenChange,
}: TemplateConfirmDialogProps) {
    if (!confirmAction) {
        return null;
    }

    const confirmTitle =
        confirmAction.type === 'delete'
            ? 'Hapus template surat?'
            : 'Nonaktifkan template surat?';

    const confirmDescription =
        confirmAction.type === 'delete'
            ? `Template ${confirmAction.template.name} akan dihapus permanen dari sistem.`
            : `Template ${confirmAction.template.name} akan dinonaktifkan dan tidak lagi dipakai sebagai template aktif.`;

    return (
        <AlertDialog open onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {confirmDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isMutatingTemplate}>
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isMutatingTemplate}
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={onConfirm}
                    >
                        {isMutatingTemplate ? 'Memproses...' : 'Lanjutkan'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
