import { PageProps } from '@/shared/types';

export type StaffMember = {
    id: number;
    name: string;
    email: string;
    position: string;
    join_date: string | null;
};

export type EligibilityCriteria = {
    min_age?: number | null;
    max_age?: number | null;
    gender?: string | null;
    min_education?: string | null;
    program_studies?: string[] | null;
    min_experience_years?: number | null;
    scoring_weights?: {
        education?: number | null;
        experience?: number | null;
        skills?: number | null;
        certification?: number | null;
        profile?: number | null;
        ai_screening?: number | null;
    } | null;
    scoring_thresholds?: {
        priority?: number | null;
        recommended?: number | null;
        consider?: number | null;
    } | null;
    ineligible_penalty_per_failure?: number | null;
    extra_penalty_after_failed_criteria?: number | null;
    extra_penalty_score?: number | null;
};

export type DivisionJob = {
    id: number | null;
    job_title: string | null;
    job_description: string | null;
    job_requirements: string[];
    job_eligibility_criteria: EligibilityCriteria | null;
    is_active: boolean;
    opened_at?: string | null;
    closed_at?: string | null;
};

export type DivisionRecord = {
    id: number;
    name: string;
    description: string | null;
    manager_name: string | null;
    capacity: number;
    current_staff: number;
    available_slots: number;
    is_hiring: boolean;
    job_title: string | null;
    job_description: string | null;
    job_requirements: string[];
    job_eligibility_criteria: EligibilityCriteria | null;
    jobs?: DivisionJob[];
    staff: StaffMember[];
};

export type StatsSummary = {
    total_divisions: number;
    total_staff: number;
    active_vacancies: number;
    available_slots: number;
};

export type KelolaDivisiPageProps = PageProps<{
    divisions: DivisionRecord[];
    stats: StatsSummary;
    flash?: {
        success?: string;
        error?: string;
    };
}>;


