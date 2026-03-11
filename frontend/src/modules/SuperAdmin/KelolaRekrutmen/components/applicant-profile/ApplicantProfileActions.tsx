import { Calendar, Clock, FileText } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface ApplicantProfileActionsProps {
  cvUrl: string | null;
  isHired: boolean;
  isRejected: boolean;
  hasInterviewSchedule: boolean;
  scheduleButtonLabel: string;
  isUpdatingStatus: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onScheduleInterview?: () => void;
  onViewInterviewDetails?: () => void;
}

export function ApplicantProfileActions({
  cvUrl,
  isHired,
  isRejected,
  hasInterviewSchedule,
  scheduleButtonLabel,
  isUpdatingStatus,
  onAccept,
  onReject,
  onScheduleInterview,
  onViewInterviewDetails,
}: ApplicantProfileActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {cvUrl && (
        <Button
          variant="outline"
          className="shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
          onClick={() => cvUrl && window.open(cvUrl, '_blank')}
        >
          <FileText className="w-4 h-4 mr-2" />
          Lihat CV
        </Button>
      )}
      {onScheduleInterview && !isHired && !isRejected && (
        <Button
          onClick={onScheduleInterview}
          variant="outline"
          className="border-blue-900 text-blue-900 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all"
          title={
            hasInterviewSchedule
              ? 'Edit jadwal interview yang sudah dibuat'
              : 'Buat jadwal interview'
          }
        >
          <Calendar className="w-4 h-4 mr-2" />
          {scheduleButtonLabel}
        </Button>
      )}
      {onViewInterviewDetails && hasInterviewSchedule && !isHired && !isRejected && (
        <Button
          onClick={onViewInterviewDetails}
          variant="outline"
          className="border-purple-600 text-purple-700 hover:bg-purple-50 shadow-sm hover:shadow-md transition-all"
          title="Lihat detail jadwal interview"
        >
          <Clock className="w-4 h-4 mr-2" />
          Detail Interview
        </Button>
      )}
      {onAccept && !isHired && !isRejected && (
        <Button
          onClick={onAccept}
          className="bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
          disabled={isUpdatingStatus}
        >
          Terima
        </Button>
      )}
      {onReject && !isHired && !isRejected && (
        <Button
          onClick={onReject}
          variant="outline"
          className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 shadow-sm hover:shadow-md transition-all"
          disabled={isUpdatingStatus}
        >
          Tolak
        </Button>
      )}
    </div>
  );
}
