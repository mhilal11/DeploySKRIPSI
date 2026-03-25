import { MessageSquare } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

import StaffLayout from "@/modules/Staff/components/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Head, usePage } from "@/shared/lib/inertia";
import type { PageProps } from "@/shared/types";

import ComplaintComposerDialog from "./Complaints/components/ComplaintComposerDialog";
import ComplaintDetailDialog from "./Complaints/components/ComplaintDetailDialog";
import ComplaintFilters from "./Complaints/components/ComplaintFilters";
import ComplaintTable from "./Complaints/components/ComplaintTable";
import OverviewCards from "./Complaints/components/OverviewCards";

import type { ComplaintRecord, ComplaintStats, ComplaintsPageProps } from "./Complaints/types";

const EMPTY_COMPLAINTS: ComplaintRecord[] = [];
const EMPTY_FILTERS: ComplaintsPageProps["filters"] = {
    categories: [],
    statuses: [],
    priorities: [],
};
const EMPTY_STATS: ComplaintStats = {
    new: 0,
    inProgress: 0,
    resolved: 0,
    regulations: 0,
};

export default function StaffComplaints() {
    const { props } = usePage<PageProps<Partial<ComplaintsPageProps>>>();
    const complaints = props.complaints ?? EMPTY_COMPLAINTS;
    const filters = props.filters ?? EMPTY_FILTERS;
    const stats =
        props.stats && typeof props.stats === "object"
            ? {
                  new: Number((props.stats as ComplaintStats).new ?? 0),
                  inProgress: Number((props.stats as ComplaintStats).inProgress ?? 0),
                  resolved: Number((props.stats as ComplaintStats).resolved ?? 0),
                  regulations: Number((props.stats as ComplaintStats).regulations ?? 0),
              }
            : EMPTY_STATS;

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");

    const [composerOpen, setComposerOpen] = useState(false);
    const [detailComplaint, setDetailComplaint] =
        useState<ComplaintRecord | null>(null);

    // Reset filter saat membuka popup composer
    useEffect(() => {
        if (composerOpen) {
            setSearchTerm("");
            setStatusFilter("all");
            setCategoryFilter("all");
            setPriorityFilter("all");
        }
    }, [composerOpen]);

    // Filter daftar complaint
    const filteredComplaints = useMemo(() => {
        const s = searchTerm.toLowerCase().trim();

        return complaints.filter((item) => {
            const matchSearch =
                !s ||
                item.subject.toLowerCase().includes(s) ||
                (item.letterNumber ?? "").toLowerCase().includes(s);

            const matchStatus =
                statusFilter === "all" ||
                item.status.toLowerCase() === statusFilter.toLowerCase();

            const matchCategory =
                categoryFilter === "all" ||
                item.category.toLowerCase() === categoryFilter.toLowerCase();

            const matchPriority =
                priorityFilter === "all" ||
                item.priority.toLowerCase() === priorityFilter.toLowerCase();

            return matchSearch && matchStatus && matchCategory && matchPriority;
        });
    }, [complaints, searchTerm, statusFilter, categoryFilter, priorityFilter]);

    return (
        <>
            <Head title="Keluhan & Saran" />

            <StaffLayout
                title="Keluhan & Saran"
                description="Kirim pengaduan dan pantau tindak lanjut HR secara real-time."
                actions={
                    <Button
                        className="bg-blue-900 text-white hover:bg-blue-800"
                        onClick={() => setComposerOpen(true)}
                    >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Buat Pengaduan/Saran
                    </Button>
                }
            >
                <section className="mt-6">
                    <OverviewCards stats={stats} />
                </section>

                <Card className="mt-6 p-4 sm:p-5 md:p-6">
                    <ComplaintFilters
                        searchTerm={searchTerm}
                        statusFilter={statusFilter}
                        categoryFilter={categoryFilter}
                        priorityFilter={priorityFilter}
                        // Kosongkan categories agar fallback FE dipakai di FE
                        filters={{
                            ...filters,
                            categories: [],
                        }}
                        onSearchChange={setSearchTerm}
                        onStatusChange={setStatusFilter}
                        onCategoryChange={setCategoryFilter}
                        onPriorityChange={setPriorityFilter}
                    />

                    <div className="mt-4">
                        <ComplaintTable
                            complaints={filteredComplaints}
                            onSelect={setDetailComplaint}
                        />
                    </div>
                </Card>
            </StaffLayout>

            {/* Composer dialog pakai kategori FE default */}
            <ComplaintComposerDialog
                open={composerOpen}
                filters={{
                    ...filters,
                    categories: [],
                }}
                onOpenChange={setComposerOpen}
            />

            <ComplaintDetailDialog
                complaint={detailComplaint}
                onOpenChange={(open) => !open && setDetailComplaint(null)}
            />
        </>
    );
}




