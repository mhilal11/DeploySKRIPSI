import { PageProps } from '@/shared/types';

export interface TerminationRecord {
    id: number;
    reference: string;
    employeeName: string;
    employeeCode?: string | null;
    division?: string | null;
    position?: string | null;
    type: 'Resign' | 'PHK' | 'Pensiun';
    reason?: string | null;
    suggestion?: string | null;
    status: 'Diajukan' | 'Proses' | 'Selesai' | string;
    progress: number;
    requestDate?: string | null;
    effectiveDate?: string | null;
    notes?: string | null;
    checklist?: Record<string, boolean> | null;
}

export interface InactiveEmployeeRecord {
    id?: number;
    name: string;
    employeeCode?: string | null;
    division?: string | null;
    position?: string | null;
    joinDate?: string | null;
    exitDate?: string | null;
    exitReason?: string | null;
    type: 'Resign' | 'PHK' | 'Pensiun' | string;
}

export type KelolaStaffPageProps = PageProps<{
    stats: {
        newRequests: number;
        inProcess: number;
        completedThisMonth: number;
        archived: number;
    };
    terminations: {
        active: TerminationRecord[];
        archive: TerminationRecord[];
    };
    inactiveEmployees: InactiveEmployeeRecord[];
    checklistTemplate: string[];
}>;


