import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Head, router, usePage } from '@/shared/lib/inertia';
import type { PageProps } from '@/shared/types';

import ComplaintDetailDialog from './components/ComplaintDetailDialog';
import ComplaintFilters from './components/ComplaintFilters';
import ComplaintStats from './components/ComplaintStats';
import ComplaintTable from './components/ComplaintTable';
import ComplaintTrendChart from './components/ComplaintTrendChart';
import {
    ComplaintTrendSeries,
    ComplaintRecord,
    Option,
    PaginatedComplaints,
} from './types';


type ComplaintsPageProps = PageProps<{
    filters: {
        search: string;
        status: string;
        priority: string;
        category: string;
    };
    stats: {
        total: number;
        new: number;
        in_progress: number;
        resolved: number;
    };
    complaintTrend: ComplaintTrendSeries;
    complaints: PaginatedComplaints;
    statusOptions: Option[];
    priorityOptions: Option[];
    categoryOptions: string[];
    flash?: {
        success?: string;
    };
}>;

export default function KelolaPengaduanIndex(initialProps: ComplaintsPageProps) {
    const { props } = usePage<Partial<ComplaintsPageProps>>();

    const filters = props.filters ?? initialProps.filters;
    const stats = props.stats ?? initialProps.stats;
    const complaintTrend = props.complaintTrend ?? initialProps.complaintTrend;
    const complaints = props.complaints ?? initialProps.complaints;
    const statusOptions = props.statusOptions ?? initialProps.statusOptions;
    const priorityOptions = props.priorityOptions ?? initialProps.priorityOptions;
    const categoryOptions = props.categoryOptions ?? initialProps.categoryOptions;
    const flash = props.flash ?? initialProps.flash;

    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [priority, setPriority] = useState(filters.priority ?? 'all');
    const [category, setCategory] = useState(filters.category ?? 'all');
    const [selectedComplaint, setSelectedComplaint] =
        useState<ComplaintRecord | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialRender = useRef(true);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            router.visit(route('super-admin.complaints.index'), {
                method: 'get',
                data: {
                    search: search || undefined,
                    status: status !== 'all' ? status : undefined,
                    priority: priority !== 'all' ? priority : undefined,
                    category: category !== 'all' ? category : undefined,
                },
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['complaints', 'filters', 'stats', 'complaintTrend'],
            });
        }, 250);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [search, status, priority, category]);

    useEffect(() => {
        setSearch(filters.search ?? '');
        setStatus(filters.status?.length ? filters.status : 'all');
        setPriority(filters.priority?.length ? filters.priority : 'all');
        setCategory(filters.category?.length ? filters.category : 'all');
    }, [filters.search, filters.status, filters.priority, filters.category]);

    useEffect(() => {
        if (!selectedComplaint) {
            return;
        }

        const updated = complaints.data.find(
            (item) => item.id === selectedComplaint.id,
        );

        if (updated && updated !== selectedComplaint) {
            setSelectedComplaint(updated);
        }
    }, [complaints.data, selectedComplaint]);

    const handleSelectComplaint = (complaint: ComplaintRecord) => {
        setSelectedComplaint(complaint);
        setDetailOpen(true);
    };

    return (
        <SuperAdminLayout
            title="Kelola Pengaduan"
            description="Pantau dan tindaklanjuti pengaduan karyawan secara terpusat"
            breadcrumbs={[
                { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Kelola Pengaduan' },
            ]}
            // actions={
            //     <Button
            //         type="button"
            //         className="hidden items-center gap-2 bg-blue-900 hover:bg-blue-800 md:flex text-white"
            //         onClick={() => setActiveTab('complaints')}
            //     >
            //         <MessageSquarePlus className="h-4 w-4" />
            //         Lihat Pengaduan
            //     </Button>
            // }
        >
            <Head title="Kelola Pengaduan" />

            <ComplaintStats stats={stats} />

            <div className="mt-8">
                <div className="mt-6 space-y-6">
                    <ComplaintFilters
                        search={search}
                        status={status}
                        priority={priority}
                        category={category}
                        statusOptions={statusOptions}
                        priorityOptions={priorityOptions}
                        categoryOptions={categoryOptions}
                        onSearchChange={setSearch}
                        onStatusChange={setStatus}
                        onPriorityChange={setPriority}
                        onCategoryChange={setCategory}
                    />

                    <ComplaintTrendChart trend={complaintTrend} />

                    <ComplaintTable
                        complaints={complaints.data}
                        links={complaints.links}
                        onSelect={handleSelectComplaint}
                    />
                </div>
            </div>

            <ComplaintDetailDialog
                complaint={selectedComplaint}
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) {
                        setSelectedComplaint(null);
                    }
                }}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
            />
        </SuperAdminLayout>
    );
}




