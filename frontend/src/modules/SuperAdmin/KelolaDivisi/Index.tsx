import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { api, apiUrl, buildCsrfHeaders, ensureCsrfToken, isAxiosError } from '@/shared/lib/api';
import { Head, useForm } from '@/shared/lib/inertia';

import { DivisionTabs } from './components/DivisionTabs';
import { SummaryCards } from './components/SummaryCards';
import CreateDivisionDialog, { CreateDivisionFormFields } from './Create';
import EditDivisionDialog, { EditFormFields } from './Edit';
import JobDialog, { JobFormFields } from './JobDialog';
import { DivisionJob, DivisionRecord, KelolaDivisiPageProps, StatsSummary } from './types';

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
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [deletingDivisionId, setDeletingDivisionId] = useState<number | null>(null);
    const [editDivision, setEditDivision] = useState<DivisionRecord | null>(null);
    const [jobDivision, setJobDivision] = useState<DivisionRecord | null>(null);

    const createForm = useForm<CreateDivisionFormFields>({
        name: '',
        description: '',
        manager_name: '',
        capacity: 0,
    });

    const editForm = useForm<EditFormFields>({
        description: '',
        manager_name: '',
        capacity: 0,
    });

    const jobForm = useForm<JobFormFields>({
        job_id: null,
        job_title: '',
        job_description: '',
        job_requirements: [''],
        job_eligibility_criteria: {},
    });

    useEffect(() => {
        setDivisions(initialDivisions);
        setStats(initialStats);
        setActiveDivisionId((previous) => {
            if (previous && initialDivisions.some((division) => division.id.toString() === previous)) {
                return previous;
            }
            return initialDivisions.length ? initialDivisions[0].id.toString() : '';
        });
    }, [initialDivisions, initialStats]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const refreshData = useCallback(async (
        preferredActiveDivisionId?: string,
        staleDataMessage = 'Data terbaru divisi gagal dimuat ulang.',
    ) => {
        try {
            const response = await api.get(apiUrl('/super-admin/kelola-divisi'));
            if (response.data) {
                const nextDivisions = Array.isArray(response.data.divisions)
                    ? (response.data.divisions as DivisionRecord[])
                    : [];
                setDivisions(nextDivisions);
                setStats(response.data.stats as StatsSummary);
                setActiveDivisionId((previous) => {
                    if (
                        preferredActiveDivisionId &&
                        nextDivisions.some((division) => division.id.toString() === preferredActiveDivisionId)
                    ) {
                        return preferredActiveDivisionId;
                    }
                    if (previous && nextDivisions.some((division) => division.id.toString() === previous)) {
                        return previous;
                    }
                    return nextDivisions.length ? nextDivisions[0].id.toString() : '';
                });
                return true;
            }
            toast.error(staleDataMessage);
            return false;
        } catch {
            toast.error(staleDataMessage);
            return false;
        }
    }, []);

    const openCreateDialog = () => {
        setIsCreateDialogOpen(true);
        createForm.reset();
        createForm.clearErrors();
        createForm.setData({
            name: '',
            description: '',
            manager_name: '',
            capacity: 0,
        });
    };

    const handleCloseCreateDialog = () => {
        setIsCreateDialogOpen(false);
        createForm.reset();
        createForm.clearErrors();
    };

    const submitCreateForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        createForm.transform((data) => ({
            ...data,
            name: data.name.trim(),
            description: data.description.trim(),
            manager_name: data.manager_name.trim(),
        }));

        createForm.post('/super-admin/kelola-divisi', {
            preserveScroll: true,
            onSuccess: async (responseData: any) => {
                const newDivisionId = responseData?.division?.id ? String(responseData.division.id) : undefined;
                setIsCreateDialogOpen(false);
                createForm.reset();
                createForm.clearErrors();
                toast.success(responseData?.flash?.success || 'Divisi berhasil ditambahkan.');
                await refreshData(
                    newDivisionId,
                    'Divisi berhasil ditambahkan, tetapi daftar terbaru gagal dimuat ulang.',
                );
            },
            onError: (errors: Record<string, string>) => {
                toast.error(
                    errors?.name ||
                        errors?.capacity ||
                        errors?._form ||
                        'Gagal menambahkan divisi.',
                );
            },
        });
    };

    const openEditDialog = (division: DivisionRecord) => {
        setEditDivision(division);

        editForm.reset();
        editForm.clearErrors();

        editForm.setData({
            description: division.description ?? '',
            manager_name: division.manager_name ?? '',
            capacity: division.capacity,
        });
    };

    const openJobDialog = (division: DivisionRecord, job?: DivisionJob) => {
        setJobDivision(division);

        jobForm.reset();
        jobForm.clearErrors();

        const cleanRequirements =
            job?.job_requirements && job.job_requirements.length > 0
                ? job.job_requirements.filter((req) => req != null && req.trim() !== '')
                : [];

        jobForm.setData({
            job_id: job?.id ?? null,
            job_title: job?.job_title ?? '',
            job_description: job?.job_description ?? '',
            job_requirements: cleanRequirements.length > 0 ? cleanRequirements : [''],
            job_eligibility_criteria: job?.job_eligibility_criteria ?? {},
        });
    };

    const reopenJob = async (division: DivisionRecord, job: DivisionJob) => {
        if (!job.id) {
            openJobDialog(division, job);
            return;
        }

        try {
            const csrfToken = await ensureCsrfToken();
            const response = await api.post(
                apiUrl(`/super-admin/kelola-divisi/${division.id}/open-job`),
                { job_id: job.id },
                {
                    withCredentials: true,
                    headers: buildCsrfHeaders(csrfToken),
                },
            );
            toast.success(
                response.data?.flash?.success || 'Lowongan pekerjaan berhasil dibuka kembali.',
            );
            await refreshData(
                division.id.toString(),
                'Status lowongan berubah, tetapi data divisi terbaru gagal dimuat ulang.',
            );
        } catch (error) {
            if (isAxiosError(error)) {
                const payload = error.response?.data as any;
                const message =
                    payload?.errors?.capacity ||
                    payload?.errors?.job_id ||
                    payload?.errors?._form ||
                    payload?.message;
                toast.error(message || 'Gagal membuka kembali lowongan.');
            } else {
                toast.error('Gagal membuka kembali lowongan.');
            }
        }
    };

    const submitEditForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editDivision) return;

        editForm.patch(route('super-admin.divisions.update', editDivision.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: async (responseData: any) => {
                setEditDivision(null);
                editForm.reset();
                editForm.clearErrors();
                toast.success(responseData?.flash?.success || 'Divisi berhasil diperbarui.');
                await refreshData(
                    undefined,
                    'Perubahan divisi tersimpan, tetapi data terbaru gagal dimuat ulang.',
                );
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

        jobForm.transform((data) => ({
            ...data,
            job_requirements: data.job_requirements
                .filter((req) => req && req.trim() !== '')
                .map((req) => req.trim()),
            job_eligibility_criteria: {
                ...(data.job_eligibility_criteria ?? {}),
                program_studies: (data.job_eligibility_criteria?.program_studies ?? [])
                    .filter((item) => item && item.trim() !== '')
                    .map((item) => item.trim()),
            },
        }));

        jobForm.post(route('super-admin.divisions.open-job', jobDivision.id), {
            preserveScroll: true,
            onSuccess: async (responseData: any) => {
                setJobDivision(null);
                jobForm.reset();
                jobForm.clearErrors();
                toast.success(responseData?.flash?.success || 'Lowongan pekerjaan berhasil dipublikasikan.');
                await refreshData(
                    undefined,
                    'Lowongan tersimpan, tetapi data divisi terbaru gagal dimuat ulang.',
                );
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

    const closeJob = (division: DivisionRecord, jobId?: number | null) => {
        const baseRoute = route('super-admin.divisions.close-job', division.id);
        const targetRoute = jobId ? `${baseRoute}?job_id=${jobId}` : baseRoute;
        jobForm.delete(targetRoute, {
            preserveScroll: true,
            onSuccess: async (responseData: any) => {
                toast.success(responseData?.flash?.success || 'Lowongan pekerjaan telah ditutup.');
                await refreshData(
                    undefined,
                    'Lowongan ditutup, tetapi data divisi terbaru gagal dimuat ulang.',
                );
            },
            onError: (errors: Record<string, string>) => {
                toast.error(
                    errors?.job_id ||
                        errors?._form ||
                        'Gagal menutup lowongan.',
                );
            },
        });
    };

    const deleteDivision = async (division: DivisionRecord) => {
        if (deletingDivisionId !== null) return;

        setDeletingDivisionId(division.id);
        try {
            const csrfToken = await ensureCsrfToken();
            const response = await api.delete(apiUrl(`/super-admin/kelola-divisi/${division.id}`), {
                withCredentials: true,
                headers: buildCsrfHeaders(csrfToken),
            });
            toast.success(response.data?.flash?.success || 'Divisi berhasil dihapus.');
            await refreshData(
                undefined,
                'Divisi berhasil dihapus, tetapi daftar terbaru gagal dimuat ulang.',
            );
        } catch (error) {
            if (isAxiosError(error)) {
                const payload = error.response?.data as any;
                const message =
                    payload?.errors?.division ||
                    payload?.errors?.name ||
                    payload?.message;
                toast.error(message || 'Gagal menghapus divisi.');
            } else {
                toast.error('Gagal menghapus divisi.');
            }
        } finally {
            setDeletingDivisionId(null);
        }
    };

    const handleCloseJobDialog = () => {
        setJobDivision(null);
        jobForm.reset();
        jobForm.clearErrors();
    };

    const handleCloseEditDialog = () => {
        setEditDivision(null);
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
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <CardTitle className="text-sm md:text-xl">Divisi & Staff</CardTitle>
                            <CardDescription className="text-[10px] md:text-sm">
                                Lihat kapasitas tim, detail staff, dan kelola lowongan pekerjaan.
                            </CardDescription>
                        </div>
                        <button
                            type="button"
                            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 md:text-sm"
                            onClick={openCreateDialog}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Divisi
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
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
                            onReopenJob={reopenJob}
                            onCloseJob={closeJob}
                            onDeleteDivision={deleteDivision}
                            deletingDivisionId={deletingDivisionId}
                        />
                    )}
                </CardContent>
            </Card>
            <CreateDivisionDialog
                open={isCreateDialogOpen}
                form={createForm}
                onClose={handleCloseCreateDialog}
                onSubmit={submitCreateForm}
            />
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
