export interface ProfileInfo {
    name: string;
    employeeCode?: string | null;
    division?: string | null;
    position?: string | null;
    joinedAt?: string | null;
}

export interface TerminationRecord {
    reference: string;
    status: string;
    requestDate: string;
    effectiveDate: string;
    progress: number | null;
    notes?: string | null;
}

export interface ResignationPageProps extends Record<string, unknown> {
    profile: ProfileInfo;
    activeRequest: TerminationRecord | null;
    history: TerminationRecord[];
}

