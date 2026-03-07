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
    onRunAIScreening?: (applicantId: number) => void;
    isRunningAIScreening?: boolean;
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
    onRunAIScreening,
    isRunningAIScreening = false,
    onAccept,
    onReject,
    onScheduleInterview,
    onViewInterviewDetails,
    isUpdatingStatus = false,
}: ApplicantProfileDialogProps) {

    if (!applicant) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto border-0 bg-white p-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Profil Pelamar - {applicant.name}</DialogTitle>
                </DialogHeader>
                <div className="p-6">
                    <ApplicantProfileView
                        applicant={applicant}
                        onRunAIScreening={onRunAIScreening}
                        isRunningAIScreening={isRunningAIScreening}
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



