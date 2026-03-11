import {
    Building2,
    ClipboardList,
    LayoutDashboard,
    Mail,
    MessageSquare,
    UserMinus,
    UserPlus,
    Users,
} from 'lucide-react';

import type { ComponentType, SVGProps } from 'react';

export interface NavItem {
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    routeName?: string;
    href?: string;
    pattern?: string | string[];
    exact?: boolean;
    children?: Array<{
        label: string;
        routeName?: string;
        href?: string;
        pattern: string | string[];
        exact?: boolean;
        badgeKey?: string;
    }>;
    superAdminOnly?: boolean;
    badgeKey?: string;
}

export const defaultNavItems: NavItem[] = [
    {
        label: 'Dashboard',
        icon: LayoutDashboard,
        routeName: 'super-admin.dashboard',
        pattern: 'super-admin.dashboard',
    },
    {
        label: 'Kelola Akun',
        icon: Users,
        routeName: 'super-admin.accounts.index',
        pattern: 'super-admin.accounts.*',
        superAdminOnly: true,
    },
    {
        label: 'Recruitment',
        icon: UserPlus,
        routeName: 'super-admin.recruitment',
        pattern: ['super-admin.recruitment', 'super-admin.recruitment.analytics'],
        badgeKey: 'super-admin.recruitment',
        children: [
            {
                label: 'Kelola Rekrutmen',
                routeName: 'super-admin.recruitment',
                pattern: 'super-admin.recruitment',
                exact: true,
                badgeKey: 'super-admin.recruitment',
            },
            {
                label: 'Analytics Rekrutmen',
                href: '/super-admin/recruitment/analytics',
                pattern: 'super-admin.recruitment.analytics',
            },
        ],
    },
    {
        label: 'Kelola Divisi',
        icon: Building2,
        routeName: 'super-admin.divisions.index',
        pattern: 'super-admin.divisions.*',
    },
    {
        label: 'Kelola Surat',
        icon: Mail,
        routeName: 'super-admin.letters.index',
        pattern: 'super-admin.letters.*',
        badgeKey: 'super-admin.letters.index',
    },
    {
        label: 'Kelola Staff',
        icon: UserMinus,
        routeName: 'super-admin.staff.index',
        pattern: 'super-admin.staff.*',
        badgeKey: 'super-admin.staff.index',
    },
    {
        label: 'Kelola Pengaduan',
        icon: MessageSquare,
        routeName: 'super-admin.complaints.index',
        pattern: 'super-admin.complaints.*',
        badgeKey: 'super-admin.complaints.index',
    },
    {
        label: 'Log Aktivitas',
        icon: ClipboardList,
        href: '/super-admin/audit-log',
        pattern: 'super-admin.audit-log',
        superAdminOnly: true,
        badgeKey: 'super-admin.audit-log',
    },
];

export const pendingStatuses = ['Menunggu HR', 'Diajukan', 'Diproses'];
export const lettersBadgeKey = 'super-admin.letters.index';
