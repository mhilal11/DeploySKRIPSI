export type EligibilityCriteria = {
    min_age?: number | null;
    max_age?: number | null;
    gender?: string | null;
    min_education?: string | null;
    program_studies?: string[] | null;
    min_experience_years?: number | null;
};

export type DivisionSummary = {
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
    job_salary_min?: number | null;
    job_work_mode?: string | null;
    job_requirements: string[];
    job_eligibility_criteria?: EligibilityCriteria | null;
};
