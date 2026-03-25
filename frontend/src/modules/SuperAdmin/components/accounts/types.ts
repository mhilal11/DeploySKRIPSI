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

export interface AccountProfile {
    type: 'staff' | 'pelamar';
    profile_photo_url?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
    religion?: string | null;
    gender?: string | null;
    address?: string | null;
    domicile_address?: string | null;
    city?: string | null;
    province?: string | null;
    education_level?: string | null;
    educations?: Array<Record<string, any>>;
    experiences?: Array<Record<string, any>>;
    certifications?: Array<Record<string, any>>;
}

export interface AccountDetailUser extends AccountRecord {
    profile?: AccountProfile | null;
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
