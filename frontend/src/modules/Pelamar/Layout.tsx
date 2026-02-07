import { Toaster } from 'sonner';

import Breadcrumbs from '@/modules/AdminStaff/components/Breadcrumbs';
import Navbar from '@/modules/Pelamar/components/Navbar';

import type { PropsWithChildren, ReactNode } from 'react';


interface PelamarLayoutProps {
    title: string;
    description?: string;
    breadcrumbs?: string[];
    actions?: ReactNode;
}

export default function PelamarLayout({
    title,
    description,
    breadcrumbs,
    actions,
    children,
}: PropsWithChildren<PelamarLayoutProps>) {
    return (
        <div className="min-h-screen bg-slate-50" style={{ scrollbarGutter: 'stable' }}>
            {/* Top Navbar */}
            <Navbar />

            {/* Main Content */}
            <main className="pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                    {breadcrumbs && (
                        <div className="mb-4">
                            <Breadcrumbs
                                items={breadcrumbs.map((b) => ({ label: b, href: '' }))}
                            />
                        </div>
                    )}

                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-1 text-sm text-slate-600">{description}</p>
                            )}
                        </div>

                        {actions && <div className="shrink-0">{actions}</div>}
                    </div>

                    <div className="space-y-6">{children}</div>
                </div>
            </main>

            <Toaster richColors position="top-right" />
        </div>
    );
}



