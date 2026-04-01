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
        label: 'Kelola Rekrutmen',
        icon: UserPlus,
        routeName: 'super-admin.recruitment',
        pattern: 'super-admin.recruitment',
        badgeKey: 'super-admin.recruitment',
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
        pattern: ['super-admin.letters.*', 'super-admin.letters.templates.*'],
        badgeKey: 'super-admin.letters.index',
        children: [
            {
                label: 'Disposisi Surat',
                routeName: 'super-admin.letters.index',
                pattern: 'super-admin.letters.index',
                badgeKey: 'super-admin.letters.index',
            },
            {
                label: 'Template Surat',
                routeName: 'super-admin.letters.templates.index',
                pattern: 'super-admin.letters.templates.*',
            },
        ],
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
