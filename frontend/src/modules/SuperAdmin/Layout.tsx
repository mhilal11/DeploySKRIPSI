import { PropsWithChildren, ReactNode } from 'react';

import Breadcrumbs, {
    BreadcrumbItem,
} from '@/modules/SuperAdmin/components/Breadcrumbs';

interface SuperAdminLayoutProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
}

/**
 * Lightweight per-page content wrapper.
 * The persistent shell (sidebar, navbar, toaster) lives in SuperAdminShell
 * which is mounted once at the router level.
 */
export default function SuperAdminLayout({
    title,
    description,
    breadcrumbs,
    actions,
    children,
}: PropsWithChildren<SuperAdminLayoutProps>) {
    return (
        <div className="flex-1 p-4 md:p-6 lg:p-10 max-w-full overflow-x-hidden">
            {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="mb-4">
                    <Breadcrumbs items={breadcrumbs} />
                </div>
            )}

            <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between w-full">
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl md:text-2xl font-semibold text-blue-900 break-words">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 text-sm text-slate-500">
                            {description}
                        </p>
                    )}
                </div>
                {actions}
            </div>

            <div className="space-y-4 md:space-y-6 w-full max-w-full">{children}</div>
        </div>
    );
}




