// src/Pages/SuperAdmin/Recruitment/types.ts

import { PageProps } from '@/shared/types';

export type ApplicantStatus =
    | 'Applied'
    | 'Screening'
    | 'Interview'
    | 'Offering'
    | 'Hired'
    | 'Rejected';

export type ApplicantActionHandler = (
    applicantId: number,
    newStatus: ApplicantStatus
) => void;

export type ApplicantRejectHandler = (id: number, reason: string) => void;

export interface ApplicantRecord {
    id: number;
    name: string;
    position: string;
    education?: string | null;
    experience?: string | null;
    profile_name?: string | null;
    profile_email?: string | null;
    profile_phone?: string | null;
    profile_address?: string | null;
    profile_city?: string | null;
    profile_province?: string | null;
    profile_gender?: string | null;
    profile_religion?: string | null;
    profile_date_of_birth?: string | null;
    educations?: ApplicantEducation[];
    experiences?: ApplicantExperience[];
    certifications?: ApplicantCertification[];
    interview_date?: string | null;
    interview_time?: string | null;
    interview_mode?: 'Online' | 'Offline' | null;
    interviewer_name?: string | null;
    meeting_link?: string | null;
    interview_notes?: string | null;
    interview_end_time?: string | null;
    has_interview_schedule?: boolean;
    status: ApplicantStatus;
    date?: string | null;
    submitted_date?: string | null;
    email: string;
    phone?: string | null;
    skills?: string | null;
    cv_file?: string | null;
    cv_url?: string | null;
    profile_photo_url?: string | null;
    rejection_reason?: string | null;
    recruitment_score?: RecruitmentScore | null;
}

export interface RecruitmentScoreBreakdown {
    key: string;
    label: string;
    weight: number;
    score: number;
    contribution: number;
    detail: string;
}

export interface RecruitmentScore {
    method: string;
    total: number;
    rank: number;
    total_candidates: number;
    eligible: boolean;
    recommendation: string;
    breakdown: RecruitmentScoreBreakdown[];
    highlights: string[];
    risks: string[];
}

export interface RecruitmentScoringAudit {
    id: number;
    action: string;
    action_label: string;
    actor_user_id?: number | null;
    actor_name?: string | null;
    division_name?: string | null;
    position_title?: string | null;
    details?: Record<string, unknown> | null;
    created_at?: string | null;
    created_at_diff?: string | null;
}

export interface ApplicantEducation {
    institution?: string | null;
    degree?: string | null;
    field_of_study?: string | null;
    start_year?: string | null;
    end_year?: string | null;
    gpa?: string | null;
}

export interface ApplicantExperience {
    company?: string | null;
    position?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    is_current?: boolean;
}

export interface ApplicantCertification {
    id?: string;
    name?: string | null;
    issuing_organization?: string | null;
    issue_date?: string | null;
    expiry_date?: string | null;
    credential_id?: string | null;
    file_path?: string | null;
    file_url?: string | null;
    file_name?: string | null;
}

export interface InterviewSchedule {
    application_id?: number;
    candidate: string;
    position: string;
    date: string;
    date_value?: string | null;
    time: string;
    end_time?: string | null;
    mode: 'Online' | 'Offline';
    interviewer: string;
    meeting_link?: string | null;
    interview_notes?: string | null;
}

export interface OnboardingItem {
    application_id: number;
    name: string;
    position: string;
    startedAt: string;
    status: 'Selesai' | 'In Progress';
    is_staff: boolean;
    steps: Array<{
        label: string;
        complete: boolean;
        pending?: boolean;
    }>;
}

export type RecruitmentPageProps = PageProps<{
    applications: ApplicantRecord[];
    statusOptions: string[];
    interviews: InterviewSchedule[];
    onboarding: OnboardingItem[];
    scoringAudits?: RecruitmentScoringAudit[];
}>;

export type StatusSummary = Partial<Record<ApplicantStatus, number>>;

export const formatApplicationId = (id: number) =>
    `APL${String(id).padStart(3, '0')}`;


