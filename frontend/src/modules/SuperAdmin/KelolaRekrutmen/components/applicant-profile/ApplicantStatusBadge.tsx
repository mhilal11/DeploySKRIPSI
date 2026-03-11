import { Badge } from '@/shared/components/ui/badge';

interface ApplicantStatusBadgeProps {
  status: string;
}

export function ApplicantStatusBadge({ status }: ApplicantStatusBadgeProps) {
  switch (status) {
    case 'Applied':
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-500">
          Applied
        </Badge>
      );
    case 'Screening':
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-500">
          Screening
        </Badge>
      );
    case 'Interview':
      return (
        <Badge variant="outline" className="border-purple-500 text-purple-500">
          Interview
        </Badge>
      );
    case 'Hired':
      return (
        <Badge variant="outline" className="border-green-500 text-green-500">
          Hired
        </Badge>
      );
    case 'Rejected':
      return (
        <Badge variant="outline" className="border-red-500 text-red-500">
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
