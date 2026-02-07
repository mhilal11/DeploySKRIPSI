// === [ AdminStaffLayout.tsx ] ===

import { Toaster } from 'sonner';

import Breadcrumbs, { BreadcrumbItem } from '@/modules/AdminStaff/components/Breadcrumbs';
import Navbar from '@/modules/AdminStaff/components/Navbar';

import type { PropsWithChildren, ReactNode } from 'react';


interface AdminStaffLayoutProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
}
export default function AdminStaffLayout({
    title,
    description,
    breadcrumbs,
    actions,
    children,
}: PropsWithChildren<AdminStaffLayoutProps>) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* 1. NAVBAR (Pengganti Sidebar) */}
            <Navbar />

            {/* MAIN CONTAINER */}
            <div className="mx-auto max-w-7xl pt-20 p-4 md:p-6 lg:p-8">
                {breadcrumbs && (
                    <div className="mb-4 overflow-x-auto">
                        <Breadcrumbs items={breadcrumbs} />
                    </div>
                )}

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-blue-900 md:text-2xl">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-1 text-sm text-slate-500">{description}</p>
                        )}
                    </div>
                    {actions && <div className="shrink-0">{actions}</div>}
                </div>

                <div className="space-y-6">{children}</div>
            </div>

            <Toaster richColors position="top-right" />
        </div>
    );
}


