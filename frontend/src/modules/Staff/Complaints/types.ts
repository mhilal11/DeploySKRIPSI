export interface ComplaintRecord {
    id: number;
    letterNumber?: string | null;
    from: string;
    category: string;
    subject: string;
    date: string;
    status: string;
    priority: string;
    description?: string | null;
    handler?: string | null;
    resolutionNotes?: string | null;
    attachment?: {
        name?: string | null;
        url?: string | null;
    };
    attachments?: Array<{
        name?: string | null;
        url?: string | null;
        mime?: string | null;
        size?: number | null;
    }>;
}

export interface RegulationRecord {
    id: number;
    title: string;
    category: string;
    uploadDate: string;
    fileName?: string | null;
    fileUrl?: string | null;
}

export interface AnnouncementRecord {
    id: number;
    title: string;
    date: string;
    content: string;
}

export interface ComplaintStats {
    new: number;
    inProgress: number;
    resolved: number;
    regulations: number;
}

export interface ComplaintFiltersOptions {
    categories: string[];
    statuses: string[];
    priorities: string[];
}

export interface ComplaintsPageProps extends Record<string, unknown> {
    stats: ComplaintStats;
    complaints: ComplaintRecord[];
    filters: ComplaintFiltersOptions;
    regulations: RegulationRecord[];
    announcements: AnnouncementRecord[];
}

