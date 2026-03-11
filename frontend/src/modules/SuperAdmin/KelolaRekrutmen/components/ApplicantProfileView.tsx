import {
  Award,
  Bot,
  Briefcase,
  GraduationCap,
  Sparkles,
  User,
} from 'lucide-react';
import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { apiUrl, resolveAssetUrl } from '@/shared/lib/api';

import { ApplicantRecord } from '../types';
import AcceptanceModal from './AcceptanceModal';
import { ApplicantAIScreeningTab } from './applicant-profile/ApplicantAIScreeningTab';
import { ApplicantCertificationTab } from './applicant-profile/ApplicantCertificationTab';
import { ApplicantEducationTab } from './applicant-profile/ApplicantEducationTab';
import { ApplicantExperienceTab } from './applicant-profile/ApplicantExperienceTab';
import { ApplicantPersonalTab } from './applicant-profile/ApplicantPersonalTab';
import { ApplicantProfileActions } from './applicant-profile/ApplicantProfileActions';
import { ApplicantProfileHeader } from './applicant-profile/ApplicantProfileHeader';
import { ApplicantScoringTab } from './applicant-profile/ApplicantScoringTab';
import RejectionModal from './RejectionModal';

interface ApplicantProfileViewProps {
  applicant: ApplicantRecord;
  onAccept?: () => void;
  onReject?: (reason: string) => void;
  onScheduleInterview?: () => void;
  onViewInterviewDetails?: () => void;
  isUpdatingStatus?: boolean;
}

export function ApplicantProfileView({
  applicant,
  onAccept,
  onReject,
  onScheduleInterview,
  onViewInterviewDetails,
  isUpdatingStatus = false,
}: ApplicantProfileViewProps) {
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false);

  const educations = applicant.educations ?? [];
  const experiences = applicant.experiences ?? [];
  const certifications = applicant.certifications ?? [];
  const profileName = applicant.profile_name ?? applicant.name;
  const profileEmail = applicant.profile_email ?? applicant.email;
  const profilePhone = applicant.profile_phone ?? applicant.phone;
  const profileAddress = applicant.profile_address;
  const profileCity = applicant.profile_city;
  const profileProvince = applicant.profile_province;
  const profileGender = applicant.profile_gender;
  const profileReligion = applicant.profile_religion;
  const profileBirthDate = applicant.profile_date_of_birth;
  const isHired = applicant.status === 'Hired';
  const isRejected = applicant.status === 'Rejected';
  const scoring = applicant.recruitment_score;
  const aiScreening = applicant.ai_screening;
  const cvUrl =
    applicant.cv_file || applicant.cv_url
      ? resolveAssetUrl(apiUrl(`/super-admin/recruitment/${applicant.id}/cv`))
      : null;
  const profilePhotoUrl = resolveAssetUrl(applicant.profile_photo_url ?? null);
  const scoreValue = scoring?.total;
  const rankingLabel =
    scoring?.rank && scoring?.total_candidates
      ? `#${scoring.rank} dari ${scoring.total_candidates}`
      : null;
  const scoreBadgeClassName =
    typeof scoreValue !== 'number'
      ? 'border-slate-300 text-slate-600'
      : scoreValue >= 85
        ? 'border-emerald-500 text-emerald-700'
        : scoreValue >= 70
          ? 'border-blue-500 text-blue-700'
          : scoreValue >= 55
            ? 'border-amber-500 text-amber-700'
            : 'border-rose-500 text-rose-700';
  const hasInterviewSchedule =
    applicant.has_interview_schedule ||
    applicant.status === 'Interview' ||
    Boolean(applicant.interview_date || applicant.interview_time || applicant.interview_mode);
  const scheduleButtonLabel = hasInterviewSchedule ? 'Edit Jadwal' : 'Jadwalkan Interview';
  const aiScore =
    aiScreening && typeof aiScreening.match_score === 'number'
      ? aiScreening.match_score
      : null;
  const aiScoreBadgeClassName =
    aiScore === null
      ? 'border-slate-300 text-slate-600'
      : aiScore >= 85
        ? 'border-emerald-500 text-emerald-700'
        : aiScore >= 70
          ? 'border-blue-500 text-blue-700'
          : aiScore >= 55
            ? 'border-amber-500 text-amber-700'
            : 'border-rose-500 text-rose-700';
  const aiScreeningStatus = (aiScreening?.status ?? '').trim().toLowerCase();
  const visibleScoringBreakdown =
    scoring?.breakdown?.filter((item) => item.key !== 'skills') ?? [];

  const handleRejectClick = () => {
    setIsRejectionModalOpen(true);
  };

  const handleAcceptClick = () => {
    setIsAcceptanceModalOpen(true);
  };

  const handleConfirmReject = (reason: string) => {
    if (onReject) {
      onReject(reason);
    }
    setIsRejectionModalOpen(false);
  };

  const handleConfirmAccept = () => {
    if (onAccept) {
      onAccept();
    }
    setIsAcceptanceModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <ApplicantProfileHeader
        applicant={applicant}
        profileName={profileName}
        profileEmail={profileEmail}
        profilePhone={profilePhone}
        profilePhotoUrl={profilePhotoUrl}
        scoreValue={scoreValue}
        scoreBadgeClassName={scoreBadgeClassName}
        rankingLabel={rankingLabel}
      />

      <ApplicantProfileActions
        cvUrl={cvUrl}
        isHired={isHired}
        isRejected={isRejected}
        hasInterviewSchedule={hasInterviewSchedule}
        scheduleButtonLabel={scheduleButtonLabel}
        isUpdatingStatus={isUpdatingStatus}
        onAccept={onAccept ? handleAcceptClick : undefined}
        onReject={onReject ? handleRejectClick : undefined}
        onScheduleInterview={onScheduleInterview}
        onViewInterviewDetails={onViewInterviewDetails}
      />

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto bg-gray-100 p-1 rounded-xl">
          <TabsTrigger
            value="personal"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4"
          >
            <User className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Data Pribadi</span>
            <span className="sm:hidden">Pribadi</span>
          </TabsTrigger>
          <TabsTrigger
            value="education"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4"
          >
            <GraduationCap className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Pendidikan</span>
            <span className="sm:hidden">Edu</span>
          </TabsTrigger>
          <TabsTrigger
            value="experience"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4"
          >
            <Briefcase className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Pengalaman</span>
            <span className="sm:hidden">Exp</span>
          </TabsTrigger>
          <TabsTrigger
            value="certification"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4"
          >
            <Award className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Sertifikasi</span>
            <span className="sm:hidden">Cert</span>
          </TabsTrigger>
          <TabsTrigger
            value="scoring"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4"
          >
            <Sparkles className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Skoring</span>
            <span className="sm:hidden">Skor</span>
          </TabsTrigger>
          <TabsTrigger
            value="ai-screening"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4"
          >
            <Bot className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">AI Screening</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <ApplicantPersonalTab
            applicant={applicant}
            profileName={profileName}
            profileEmail={profileEmail}
            profilePhone={profilePhone}
            profileAddress={profileAddress}
            profileCity={profileCity}
            profileProvince={profileProvince}
            profileGender={profileGender}
            profileReligion={profileReligion}
            profileBirthDate={profileBirthDate}
            isRejected={isRejected}
          />
        </TabsContent>

        <TabsContent value="education">
          <ApplicantEducationTab
            educations={educations}
            legacyEducation={applicant.education}
          />
        </TabsContent>

        <TabsContent value="experience">
          <ApplicantExperienceTab
            experiences={experiences}
            legacyExperience={applicant.experience}
          />
        </TabsContent>

        <TabsContent value="certification">
          <ApplicantCertificationTab certifications={certifications} />
        </TabsContent>

        <TabsContent value="scoring">
          <ApplicantScoringTab
            scoring={scoring}
            visibleScoringBreakdown={visibleScoringBreakdown}
            scoreBadgeClassName={scoreBadgeClassName}
          />
        </TabsContent>

        <TabsContent value="ai-screening">
          <ApplicantAIScreeningTab
            aiScreening={aiScreening}
            aiScore={aiScore}
            aiScoreBadgeClassName={aiScoreBadgeClassName}
            aiScreeningStatus={aiScreeningStatus}
          />
        </TabsContent>
      </Tabs>

      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onConfirm={handleConfirmReject}
        applicant={applicant}
        isSubmitting={isUpdatingStatus}
      />

      <AcceptanceModal
        isOpen={isAcceptanceModalOpen}
        onClose={() => setIsAcceptanceModalOpen(false)}
        onConfirm={handleConfirmAccept}
        applicant={applicant}
        isSubmitting={isUpdatingStatus}
      />
    </div>
  );
}
