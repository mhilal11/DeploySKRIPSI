import { PropsWithChildren, ReactNode, useEffect } from "react";
import { Toaster, toast } from "sonner";

import { usePage, router } from "@/shared/lib/inertia";
import type { PageProps } from "@/shared/types";

import Breadcrumbs, { type BreadcrumbItem } from "./Breadcrumbs";
import Navbar from "./Navbar";

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
    const page = usePage<PageProps>();
    const user = page.props.auth?.user;

    /* REALTIME ACCOUNT DEACTIVATION */
    useEffect(() => {
        if (!user || !window.Echo) return;

        const channelName = `user.${user.id}`;
        const channel = window.Echo.private(channelName);

        channel.listen(".AccountDeactivated", (event: any) => {
            toast.error(event.message || "Akun Anda telah dinonaktifkan.");
            setTimeout(() => router.post(route("logout")), 1200);
        });

        return () => {
            window.Echo.leave(channelName);
        };
    }, [user]);

    return (
        <div className="min-h-screen bg-slate-50" style={{ scrollbarGutter: 'stable' }}>
            {/* Top Navbar */}
            <Navbar />

            {/* Main Content */}
            <main className="pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                    {/* BREADCRUMBS */}
                    {breadcrumbs && (
                        <div className="mb-4">
                            <Breadcrumbs items={breadcrumbs} />
                        </div>
                    )}

                    {/* PAGE HEADER */}
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

                    {/* PAGE CONTENT */}
                    <div className="space-y-6">{children}</div>
                </div>
            </main>

            <Toaster richColors position="top-right" />
        </div>
    );
}



