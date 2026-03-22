import type { DivisionJob, DivisionRecord } from '@/modules/SuperAdmin/KelolaDivisi/types';

export function getActiveDivisionJobs(division: DivisionRecord): DivisionJob[] {
    const jobs = Array.isArray(division.jobs)
        ? division.jobs.filter((job) => job && job.is_active !== false)
        : [];

    if (jobs.length > 0) {
        return jobs;
    }

    if (division.is_hiring && division.job_title) {
        return [
            {
                id: null,
                job_title: division.job_title,
                job_description: division.job_description,
                job_requirements: Array.isArray(division.job_requirements)
                    ? division.job_requirements
                    : [],
                job_eligibility_criteria: division.job_eligibility_criteria,
                is_active: true,
            },
        ];
    }

    return [];
}

export function getInactiveDivisionJobs(division: DivisionRecord): DivisionJob[] {
    if (!Array.isArray(division.jobs)) {
        return [];
    }

    return division.jobs.filter((job) => job && job.is_active === false);
}
