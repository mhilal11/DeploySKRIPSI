import {
  Calendar as CalendarIcon,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';

import { TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

import { formatTabBadgeCount } from './utils';

interface RecruitmentTabsHeaderProps {
  applicantsInProgressCount: number;
  interviewsInProgressCount: number;
  onboardingInProgressCount: number;
}

export function RecruitmentTabsHeader({
  applicantsInProgressCount,
  interviewsInProgressCount,
  onboardingInProgressCount,
}: RecruitmentTabsHeaderProps) {
  return (
    <TabsList className="w-full justify-start overflow-x-auto p-0 h-auto bg-transparent gap-3 whitespace-nowrap">
      <TabsTrigger
        value="applicants"
        className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
      >
        <Users className="h-4 w-4" />
        <span>Daftar Pelamar</span>
        {applicantsInProgressCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {formatTabBadgeCount(applicantsInProgressCount)}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger
        value="interviews"
        className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
      >
        <Video className="h-4 w-4" />
        <span>Jadwal Interview</span>
        {interviewsInProgressCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {formatTabBadgeCount(interviewsInProgressCount)}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger
        value="onboarding"
        className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
      >
        <UserCheck className="h-4 w-4" />
        <span>Onboarding</span>
        {onboardingInProgressCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {formatTabBadgeCount(onboardingInProgressCount)}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger
        value="calendar"
        className="flex-none rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
      >
        <CalendarIcon className="h-4 w-4" />
        Calendar
      </TabsTrigger>
    </TabsList>
  );
}
