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
    division?: string | null;
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
    ai_screening?: RecruitmentAIScreening | null;
    sla?: RecruitmentSLAIndicator | null;
}

export interface RecruitmentSLAIndicator {
    stage: ApplicantStatus;
    target_days: number;
    days_in_stage: number;
    due_date?: string | null;
    remaining_days: number;
    overdue_days: number;
    state: 'on_track' | 'warning' | 'overdue' | string;
    is_overdue?: boolean;
}

export interface RecruitmentSLASettings {
    Applied: number;
    Screening: number;
    Interview: number;
    Offering: number;
}

export interface RecruitmentSLAOverview {
    active_applications: number;
    on_track_count: number;
    warning_count: number;
    overdue_count: number;
    compliance_rate: number;
}

export interface RecruitmentSLAReminder {
    application_id: number;
    name: string;
    division?: string | null;
    position: string;
    stage: ApplicantStatus;
    days_in_stage: number;
    target_days: number;
    due_date?: string | null;
    remaining_days: number;
    overdue_days: number;
    state: 'on_track' | 'warning' | 'overdue' | string;
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

export interface RecruitmentAIScreeningTokens {
    prompt?: number;
    completion?: number;
    total?: number;
}

export interface RecruitmentAIScreening {
    id: number;
    application_id: number;
    provider: string;
    model_used?: string | null;
    model_chain?: string[];
    prompt_version?: string | null;
    cv_file_path?: string | null;
    cv_text_chars?: number;
    match_score?: number | null;
    recommendation?: string | null;
    summary?: string | null;
    strengths: string[];
    gaps: string[];
    red_flags: string[];
    interview_questions: string[];
    tokens?: RecruitmentAIScreeningTokens;
    attempts?: Array<Record<string, unknown>>;
    status?: string;
    error_message?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
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

export interface RecruitmentScoringEvaluationConfig {
    top_k: number;
    eligible_only: boolean;
    min_score: number;
}

export interface RecruitmentScoringEvaluationSummary {
    total_candidates: number;
    groups: number;
    shortlisted_count: number;
    interview_positive_count: number;
    hired_positive_count: number;
    tp_interview: number;
    tp_hired: number;
    precision_at_k_interview: number;
    precision_at_k_hired: number;
    recall_shortlist_vs_interview: number;
    recall_shortlist_vs_hired: number;
}

export interface RecruitmentScoringEvaluationVacancy {
    group_key: string;
    division: string;
    position: string;
    total_candidates: number;
    shortlisted_count: number;
    interview_positive_count: number;
    hired_positive_count: number;
    tp_interview: number;
    tp_hired: number;
    precision_at_k_interview: number;
    precision_at_k_hired: number;
    recall_shortlist_vs_interview: number;
    recall_shortlist_vs_hired: number;
}

export interface RecruitmentScoringEvaluation {
    config: RecruitmentScoringEvaluationConfig;
    summary: RecruitmentScoringEvaluationSummary;
    by_vacancy: RecruitmentScoringEvaluationVacancy[];
}

export interface RecruitmentScoringAnalyticsSummary {
    total_candidates: number;
    global_avg_score: number;
    global_median_score: number;
    global_eligible_rate: number;
    global_interview_positive_rate: number;
    global_hired_rate: number;
}

export interface RecruitmentScoringAnalyticsDivision {
    division: string;
    applications_count: number;
    avg_score: number;
    median_score: number;
    eligible_rate: number;
    interview_positive_rate: number;
    hired_rate: number;
    score_gap_from_global: number;
    fairness_flag: 'Seimbang' | 'Monitor' | 'Waspada' | string;
}

export interface RecruitmentScoringAnalyticsPeriod {
    period: string;
    period_label: string;
    applications_count: number;
    avg_score: number;
    median_score: number;
    eligible_rate: number;
    interview_positive_rate: number;
    hired_rate: number;
    drift_score_delta: number;
    drift_level: 'Stabil' | 'Sedang' | 'Tinggi' | string;
}

export interface RecruitmentScoringAnalytics {
    window_months: number;
    summary: RecruitmentScoringAnalyticsSummary;
    by_division: RecruitmentScoringAnalyticsDivision[];
    by_period: RecruitmentScoringAnalyticsPeriod[];
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
    status?: string | null;
}

export interface OnboardingItem {
    application_id: number;
    name: string;
    position: string;
    startedAt: string;
    status: 'Selesai' | 'In Progress';
    is_staff: boolean;
    staff_assignment_selected?: boolean;
    joined_in_application_id?: number | null;
    joined_in_position?: string | null;
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
    slaSettings?: RecruitmentSLASettings;
    slaOverview?: RecruitmentSLAOverview;
    slaReminders?: RecruitmentSLAReminder[];
    scoringAudits?: RecruitmentScoringAudit[];
    scoringEvaluation?: RecruitmentScoringEvaluation | null;
    scoringAnalytics?: RecruitmentScoringAnalytics | null;
}>;

export type RecruitmentAnalyticsPageProps = PageProps<{
    scoringAudits?: RecruitmentScoringAudit[];
    scoringEvaluation?: RecruitmentScoringEvaluation | null;
    scoringAnalytics?: RecruitmentScoringAnalytics | null;
}>;

export type StatusSummary = Partial<Record<ApplicantStatus, number>>;

export const formatApplicationId = (id: number) =>
    `APL${String(id).padStart(3, '0')}`;
