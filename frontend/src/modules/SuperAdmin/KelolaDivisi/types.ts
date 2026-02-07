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
    min_experience_years?: number | null;
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


