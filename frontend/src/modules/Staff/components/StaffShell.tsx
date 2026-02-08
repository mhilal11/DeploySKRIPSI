import { PropsWithChildren, useEffect } from "react";
import { Toaster, toast } from "sonner";

import { router, usePage } from "@/shared/lib/inertia";
import { route } from "@/shared/lib/route";
import type { PageProps } from "@/shared/types";

import Navbar from "./Navbar";

export default function StaffShell({ children }: PropsWithChildren) {
    const page = usePage<PageProps>();
    const user = page.props.auth?.user;

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
        <div className="min-h-screen bg-slate-50" style={{ scrollbarGutter: "stable" }}>
            <Navbar />
            <main className="pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                    {children}
                </div>
            </main>
            <Toaster richColors position="top-right" />
        </div>
    );
}
