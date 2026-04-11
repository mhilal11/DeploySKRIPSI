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
    <div className="w-full overflow-x-auto pb-1">
      <TabsList className="h-auto min-w-max justify-start gap-3 bg-transparent p-0 pr-1 whitespace-nowrap">
        <TabsTrigger
          value="applicants"
          className="shrink-0 rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
        >
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate">Daftar Pelamar</span>
          {applicantsInProgressCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {formatTabBadgeCount(applicantsInProgressCount)}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="interviews"
          className="shrink-0 rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
        >
          <Video className="h-4 w-4 shrink-0" />
          <span className="truncate">Jadwal Interview</span>
          {interviewsInProgressCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {formatTabBadgeCount(interviewsInProgressCount)}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="onboarding"
          className="shrink-0 rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
        >
          <UserCheck className="h-4 w-4 shrink-0" />
          <span className="truncate">Onboarding</span>
          {onboardingInProgressCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {formatTabBadgeCount(onboardingInProgressCount)}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="calendar"
          className="shrink-0 rounded-lg border border-input bg-background px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary font-medium gap-2 shadow-sm transition-all hover:border-primary/50"
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">Calendar</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
