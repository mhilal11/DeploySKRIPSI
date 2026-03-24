import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

import { ApplicantRecord } from '../types';
import { ApplicantProfileView } from './ApplicantProfileView';

interface ApplicantProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    applicant: ApplicantRecord | null;
    onAccept?: () => void;
    onReject?: (reason: string) => void;
    onScheduleInterview?: () => void;
    onViewInterviewDetails?: () => void;
    isUpdatingStatus?: boolean;
}

export default function ApplicantProfileDialog({
    open,
    onOpenChange,
    applicant,
    onAccept,
    onReject,
    onScheduleInterview,
    onViewInterviewDetails,
    isUpdatingStatus = false,
}: ApplicantProfileDialogProps) {

    if (!applicant) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[96vw] overflow-y-auto border-0 bg-white p-0 sm:w-full sm:max-w-5xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>Profil Pelamar - {applicant.name}</DialogTitle>
                </DialogHeader>
                <div className="p-4 sm:p-6">
                    <ApplicantProfileView
                        applicant={applicant}
                        onAccept={onAccept}
                        onReject={onReject}
                        onScheduleInterview={onScheduleInterview}
                        onViewInterviewDetails={onViewInterviewDetails}
                        isUpdatingStatus={isUpdatingStatus}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}



