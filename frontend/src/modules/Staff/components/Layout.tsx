import { PropsWithChildren, ReactNode } from "react";

import Breadcrumbs, { type BreadcrumbItem } from "./Breadcrumbs";

interface StaffLayoutProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
}

export default function StaffLayout({
    title,
    description,
    breadcrumbs,
    actions,
    children,
}: PropsWithChildren<StaffLayoutProps>) {
    return (
        <>
            {breadcrumbs && (
                <div className="mb-4">
                    <Breadcrumbs items={breadcrumbs} />
                </div>
            )}

            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 text-sm text-slate-600">
                            {description}
                        </p>
                    )}
                </div>
                {actions && <div className="flex-shrink-0">{actions}</div>}
            </div>

            <div className="space-y-6">{children}</div>
        </>
    );
}
