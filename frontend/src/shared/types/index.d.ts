export interface User {
    id: number;
    employee_code?: string | null;
    name: string;
    email: string;
    email_verified_at?: string;
    role?: string;
    division?: string | null;
    status?: string;
    registered_at?: string | null;
    last_login_at?: string | null;
    has_completed_applicant_profile?: boolean;
    needs_applicant_profile?: boolean;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        profilePhotoUrl?: string | null;
    };
    sidebarNotifications?: Record<string, number>;
};

