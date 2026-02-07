import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { api, apiUrl } from '@/shared/lib/api';
import { Head, useForm } from '@/shared/lib/inertia';

import { DivisionTabs } from './components/DivisionTabs';
import { SummaryCards } from './components/SummaryCards';
import EditDivisionDialog, { EditFormFields } from './Edit';
import JobDialog, { JobFormFields } from './JobDialog';
import { DivisionRecord, KelolaDivisiPageProps, StatsSummary } from './types';

export default function KelolaDivisiIndex({
    divisions: initialDivisions,
    stats: initialStats,
    flash,
}: KelolaDivisiPageProps) {
    const [divisions, setDivisions] = useState<DivisionRecord[]>(initialDivisions);
    const [stats, setStats] = useState<StatsSummary>(initialStats);
    const [activeDivisionId, setActiveDivisionId] = useState(
        initialDivisions.length ? initialDivisions[0].id.toString() : '',
    );
    const [editDivision, setEditDivision] = useState<DivisionRecord | null>(null);
    const [jobDivision, setJobDivision] = useState<DivisionRecord | null>(null);

    const editForm = useForm<EditFormFields>({
        description: '',
        manager_name: '',
        capacity: 0,
    });

    const jobForm = useForm<JobFormFields>({
        job_title: '',
        job_description: '',
        job_requirements: [''],
        job_eligibility_criteria: {},
    });

    // Sync with props when they change (e.g. initial navigation)
    useEffect(() => {
        setDivisions(initialDivisions);
        setStats(initialStats);
    }, [initialDivisions, initialStats]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const refreshData = useCallback(async () => {
        try {
            const response = await api.get(apiUrl('/super-admin/kelola-divisi'));
            if (response.data) {
                setDivisions(response.data.divisions);
                setStats(response.data.stats);
            }
        } catch {
            // silently ignore refresh errors
        }
    }, []);

    const openEditDialog = (division: DivisionRecord) => {
        setEditDivision(division);
        
        // Reset form completely first to clear any stale state
        editForm.reset();
        editForm.clearErrors();
        
        // Then set new data
        editForm.setData({
            description: division.description ?? '',
            manager_name: division.manager_name ?? '',
            capacity: division.capacity,
        });
    };

    const openJobDialog = (division: DivisionRecord) => {
        setJobDivision(division);
        
        // Reset form completely first to clear any stale state
        jobForm.reset();
        jobForm.clearErrors();
        
        // Clean requirements array - filter out null/undefined values
        const cleanRequirements = 
            division.job_requirements && division.job_requirements.length > 0
                ? division.job_requirements.filter(req => req != null && req.trim() !== '')
                : [];
        
        // Then set new data
        jobForm.setData({
            job_title: division.job_title ?? '',
            job_description: division.job_description ?? '',
            job_requirements: cleanRequirements.length > 0 ? cleanRequirements : [''],
            job_eligibility_criteria: division.job_eligibility_criteria ?? {},
        });
    };

    const submitEditForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editDivision) return;

        editForm.patch(route('super-admin.divisions.update', editDivision.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: (responseData: any) => {
                setEditDivision(null);
                // Reset form to clear stale state
                editForm.reset();
                editForm.clearErrors();
                toast.success(responseData?.flash?.success || 'Divisi berhasil diperbarui.');
                refreshData();
            },
            onError: (errors: Record<string, string>) => {
                toast.error(
                    errors?.capacity ||
                    errors?._form ||
                    errors?.description ||
                    errors?.manager_name ||
                    'Gagal menyimpan perubahan divisi.',
                );
            },
        });
    };

    const submitJobForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!jobDivision) return;

        // Set transform to clean requirements before sending
        jobForm.transform((data) => ({
            ...data,
            job_requirements: data.job_requirements
                .filter(req => req && req.trim() !== '')
                .map(req => req.trim()),
        }));

        jobForm.post(route('super-admin.divisions.open-job', jobDivision.id), {
            preserveScroll: true,
            onSuccess: (responseData: any) => {
                setJobDivision(null);
                // Reset form to clear stale state
                jobForm.reset();
                jobForm.clearErrors();
                toast.success(responseData?.flash?.success || 'Lowongan pekerjaan berhasil dipublikasikan.');
                refreshData();
            },
            onError: (errors: Record<string, string>) => {
                toast.error(
                    errors?.job_requirements ||
                    errors?._form ||
                    errors?.job_title ||
                    errors?.job_description ||
                    'Gagal menyimpan lowongan. Periksa kembali data yang diisi.',
                );
            },
        });
    };

    const closeJob = (division: DivisionRecord) => {
        jobForm.delete(route('super-admin.divisions.close-job', division.id), {
            preserveScroll: true,
            onSuccess: (responseData: any) => {
                toast.success(responseData?.flash?.success || 'Lowongan pekerjaan telah ditutup.');
                refreshData();
            },
        });
    };

    const handleCloseJobDialog = () => {
        setJobDivision(null);
        // Reset form when dialog is closed
        jobForm.reset();
        jobForm.clearErrors();
    };

    const handleCloseEditDialog = () => {
        setEditDivision(null);
        // Reset form when dialog is closed
        editForm.reset();
        editForm.clearErrors();
    };

    return (
        <SuperAdminLayout
            title="Kelola Divisi"
            description="Pantau kapasitas tim dan kelola lowongan tiap divisi"
            breadcrumbs={[
                { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Kelola Divisi' },
            ]}
        >
            <Head title="Kelola Divisi" />

            <SummaryCards stats={stats} />

            <Card className="mt-4 md:mt-6">
                <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-sm md:text-xl">Divisi & Staff</CardTitle>
                    <CardDescription className="text-[10px] md:text-sm">
                        Lihat kapasitas tim, detail staff, dan kelola lowongan pekerjaan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                    {divisions.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
                            Belum ada konfigurasi divisi.
                        </div>
                    ) : (
                        <DivisionTabs
                            divisions={divisions}
                            activeDivisionId={activeDivisionId}
                            onTabChange={(value) => setActiveDivisionId(value)}
                            onEditDivision={openEditDialog}
                            onOpenJobDialog={openJobDialog}
                            onCloseJob={closeJob}
                        />
                    )}
                </CardContent>
            </Card>
            <EditDivisionDialog
                division={editDivision}
                form={editForm}
                onClose={handleCloseEditDialog}
                onSubmit={submitEditForm}
            />
            <JobDialog
                division={jobDivision}
                form={jobForm}
                onClose={handleCloseJobDialog}
                onSubmit={submitJobForm}
            />
        </SuperAdminLayout>
    );
}

