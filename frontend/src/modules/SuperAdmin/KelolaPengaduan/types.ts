export interface ComplaintRecord {
    id: number;
    code: string;
    reporter: string;
    reporterEmail?: string | null;
    category: string;
    subject: string;
    description?: string | null;
    submittedAt?: string | null;
    status: string;
    statusLabel: string;
    priority: string;
    priorityLabel: string;
    isAnonymous: boolean;
    handler?: string | null;
    resolutionNotes?: string | null;
    resolvedAt?: string | null;
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

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface PaginatedComplaints {
    data: ComplaintRecord[];
    links: PaginationLink[];
    meta: PaginationMeta;
}

export interface Option {
    value: string;
    label: string;
}

export interface ComplaintTrendPoint {
    key: string;
    label: string;
    total: number;
    new: number;
    in_progress: number;
    resolved: number;
    archived: number;
}

export interface ComplaintTrendSeries {
    weekly: ComplaintTrendPoint[];
    monthly: ComplaintTrendPoint[];
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


