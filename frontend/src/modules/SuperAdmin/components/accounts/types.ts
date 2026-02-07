export interface AccountRecord {
    id: number;
    employee_code?: string | null;
    name: string;
    email: string;
    role: string;
    division?: string | null;
    status: string;
    registered_at?: string | null;
    inactive_at?: string | null;
    last_login_at?: string | null;
    created_at?: string | null;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedAccounts {
    data: AccountRecord[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

