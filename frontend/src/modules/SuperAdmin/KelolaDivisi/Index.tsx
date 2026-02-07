import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Head, useForm } from '@/shared/lib/inertia';

import { DivisionTabs } from './components/DivisionTabs';
import { SummaryCards } from './components/SummaryCards';
import EditDivisionDialog, { EditFormFields } from './Edit';
import JobDialog, { JobFormFields } from './JobDialog';
import { DivisionRecord, KelolaDivisiPageProps } from './types';

export default function KelolaDivisiIndex({ divisions, stats, flash }: KelolaDivisiPageProps) {
    const [activeDivisionId, setActiveDivisionId] = useState(
        divisions.length ? divisions[0].id.toString() : '',
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

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const openEditDialog = (division: DivisionRecord) => {
        setEditDivision(division);
        editForm.setData({
            description: division.description ?? '',
            manager_name: division.manager_name ?? '',
            capacity: division.capacity,
        });
        editForm.clearErrors();
    };

    const openJobDialog = (division: DivisionRecord) => {
        setJobDivision(division);
        jobForm.setData({
            job_title: division.job_title ?? '',
            job_description: division.job_description ?? '',
            job_requirements:
                division.job_requirements && division.job_requirements.length > 0
                    ? division.job_requirements
                    : [''],
            job_eligibility_criteria: division.job_eligibility_criteria ?? {},
        });
        jobForm.clearErrors();
    };

    const submitEditForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editDivision) return;

        editForm.patch(route('super-admin.divisions.update', editDivision.id), {
            preserveScroll: true,
            onSuccess: () => setEditDivision(null),
        });
    };

    const submitJobForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!jobDivision) return;

        jobForm.post(route('super-admin.divisions.open-job', jobDivision.id), {
            preserveScroll: true,
            onSuccess: () => setJobDivision(null),
        });
    };

    const closeJob = (division: DivisionRecord) => {
        jobForm.delete(route('super-admin.divisions.close-job', division.id), {
            preserveScroll: true,
        });
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
                onClose={() => setEditDivision(null)}
                onSubmit={submitEditForm}
            />
            <JobDialog
                division={jobDivision}
                form={jobForm}
                onClose={() => setJobDivision(null)}
                onSubmit={submitJobForm}
            />
        </SuperAdminLayout>
    );
}




