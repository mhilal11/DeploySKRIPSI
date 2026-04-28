import {
    Building2,
    Briefcase,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState, FormEvent, useMemo } from 'react';
import { toast } from 'sonner';

import ApplicationForm, {
    ApplicationFormData,
} from '@/modules/Pelamar/components/applications/ApplicationForm';
import ApplicationHistory, {
    ApplicationHistoryItem,
} from '@/modules/Pelamar/components/applications/ApplicationHistory';
import ApplicationsDivisionCard from '@/modules/Pelamar/components/applications/ApplicationsDivisionCard';
import ApplicationsStatCard from '@/modules/Pelamar/components/applications/ApplicationsStatCard';
import EligibilityRejectDialog, {
    EligibilityCriteriaResult,
} from '@/modules/Pelamar/components/applications/EligibilityRejectDialog';
import type { DivisionSummary } from '@/modules/Pelamar/components/applications/types';
import PelamarLayout from '@/modules/Pelamar/Layout';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/components/ui/dialog';
import { api, apiUrl, buildCsrfHeaders, ensureCsrfToken } from '@/shared/lib/api';
import { Head, useForm } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

type ApplicationsPageProps = PageProps<{
    applications?: ApplicationHistoryItem[] | null;
    defaultForm?: {
        full_name: string;
        email: string;
        phone: string;
    } | null;
    divisions?: DivisionSummary[] | null;
    flash?: {
        success?: string;
        error?: string;
    };
}>;

export default function Applications({
    applications,
    defaultForm,
    divisions,
    flash,
}: ApplicationsPageProps) {
    const safeDivisions = useMemo(() => divisions ?? [], [divisions]);
    const safeApplications = useMemo(() => applications ?? [], [applications]);
    const [applicationRows, setApplicationRows] = useState<ApplicationHistoryItem[]>(
        safeApplications,
    );

    const firstOpenDivision =
        safeDivisions.find(
            (division) => division.is_hiring && division.available_slots > 0,
        ) ?? null;

    const [formDivision, setFormDivision] = useState<DivisionSummary | null>(
        firstOpenDivision,
    );
    const [formOpen, setFormOpen] = useState(false);
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [eligibilityDialogOpen, setEligibilityDialogOpen] = useState(false);
    const [eligibilityFailures, setEligibilityFailures] = useState<EligibilityCriteriaResult[]>([]);
    const [eligibilityPassed, setEligibilityPassed] = useState<EligibilityCriteriaResult[]>([]);
    const [rejectedJobTitle, setRejectedJobTitle] = useState<string | null>(null);

    const buildFormData = (
        division: DivisionSummary | null,
    ): ApplicationFormData => ({
        division_id: division?.id ?? null,
        full_name: defaultForm?.full_name ?? '',
        email: defaultForm?.email ?? '',
        phone: defaultForm?.phone ?? '',
        position: division?.job_title ?? '',
        cv: null,
    });

    const form = useForm<ApplicationFormData>({
        division_id: formDivision?.id ?? null,
        full_name: defaultForm?.full_name ?? '',
        email: defaultForm?.email ?? '',
        phone: defaultForm?.phone ?? '',
        position: formDivision?.job_title ?? '',
        cv: null,
    });

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        setApplicationRows(safeApplications);
    }, [safeApplications]);

    const handleSetData = <K extends keyof ApplicationFormData>(
        field: K,
        value: ApplicationFormData[K],
    ) => {
        form.setData((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(route('pelamar.applications.store'), {
            forceFormData: true,
            onSuccess: () => {
                const currentDivision = formDivision;
                const currentJobTitle = currentDivision?.job_title?.trim() ?? '';

                if (currentDivision && currentJobTitle !== '') {
                    setApplicationRows((prev) => {
                        const alreadyExists = prev.some(
                            (app) =>
                                app.division === currentDivision.name &&
                                app.position === currentJobTitle,
                        );
                        if (alreadyExists) {
                            return prev;
                        }

                        const optimisticItem: ApplicationHistoryItem = {
                            id: Date.now(),
                            position: currentJobTitle,
                            division: currentDivision.name,
                            status: 'Applied',
                            submitted_at: new Date().toLocaleDateString('id-ID'),
                            notes: null,
                        };
                        return [optimisticItem, ...prev];
                    });
                }

                handleCloseForm();

                toast.success('Lamaran berhasil dikirim', {
                    description: 'Tim rekrutmen akan meninjau berkas Anda.',
                });
            },
            onError: (formErrors) => {
                const firstError = Object.values(formErrors).find(
                    (message) =>
                        typeof message === 'string' && message.trim() !== '',
                );

                toast.error('Gagal mengirim lamaran', {
                    description:
                        typeof firstError === 'string'
                            ? firstError
                            : 'Periksa kembali data lamaran Anda.',
                });
            },
        });
    };

    const handleOpenForm = async (division: DivisionSummary) => {
        if (!division.is_hiring || division.available_slots <= 0) {
            return;
        }

        // Check eligibility if criteria exists
        if (division.job_eligibility_criteria && Object.keys(division.job_eligibility_criteria).length > 0) {
            setCheckingEligibility(true);
            try {
                const csrfToken = await ensureCsrfToken();
                const payload = new URLSearchParams();
                payload.append('division_id', String(division.id));

                const response = await api.post(
                    apiUrl(route('pelamar.applications.check-eligibility')),
                    payload,
                    {
                        withCredentials: true,
                        headers: buildCsrfHeaders(csrfToken, {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        }),
                    },
                );

                if (!response.data.eligible) {
                    setEligibilityFailures(response.data.failures);
                    setEligibilityPassed(response.data.passed || []);
                    setRejectedJobTitle(division.job_title);
                    setEligibilityDialogOpen(true);
                    setCheckingEligibility(false);
                    return;
                }
            } catch (error) {
                console.error('Eligibility check failed:', error);
                toast.error('Gagal memeriksa kelayakan. Silakan coba lagi.');
                setCheckingEligibility(false);
                return;
            }
            setCheckingEligibility(false);
        }

        setFormDivision(division);
        form.clearErrors();
        form.setData(buildFormData(division));
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        form.clearErrors();
    };

    const openDivisions = safeDivisions.filter(
        (division) => division.is_hiring && division.available_slots > 0,
    );
    const availableSlots = openDivisions.reduce(
        (total, division) => total + division.available_slots,
        0,
    );

    return (
        <>
            <Head title="Lamaran Saya" />
            <PelamarLayout
                title="Lamaran Saya"
                description="Kelola lamaran dan pantau lowongan aktif"
                breadcrumbs={['Recruitment', 'Lamaran Saya']}
            >
                <div className="grid gap-4 md:grid-cols-3">
                    <ApplicationsStatCard
                        icon={Building2}
                        title="Total Divisi"
                        value={safeDivisions.length}
                        accent="bg-blue-100 text-blue-900"
                    />
                    <ApplicationsStatCard
                        icon={Briefcase}
                        title="Divisi Membuka Lowongan"
                        value={openDivisions.length}
                        accent="bg-green-100 text-green-900"
                    />
                    <ApplicationsStatCard
                        icon={Users}
                        title="Posisi Tersedia"
                        value={availableSlots}
                        accent="bg-orange-100 text-orange-900"
                    />
                </div>

                <Card className="mt-6">
                    <div className="border-b p-6">
                        <h3 className="text-lg font-semibold text-blue-900">
                            Daftar Divisi
                        </h3>
                        <p className="text-sm text-slate-600">
                            Klik Lamar Sekarang pada divisi yang membuka lowongan untuk mengisi
                            formulir.
                        </p>
                    </div>
                    <div className="grid gap-4 p-6 md:grid-cols-2">
                        {safeDivisions.map((division) => {
                            const isApplied = applicationRows.some(
                                (app) =>
                                    app.division === division.name &&
                                    app.position === division.job_title,
                            );

                            return (
                                <ApplicationsDivisionCard
                                    key={division.id}
                                    division={division}
                                    isApplied={isApplied}
                                    onApply={() => handleOpenForm(division)}
                                />
                            );
                        })}
                    </div>
                    {safeDivisions.length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-500">
                            Belum ada konfigurasi divisi.
                        </div>
                    )}
                </Card>

                {/* RESPONSIVE DIALOG */}
                <Dialog
                    open={formOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            handleCloseForm();
                        }
                    }}
                >
                    <DialogContent
                        className="
                            w-[95vw]
                            max-w-xl
                            sm:max-w-2xl
                            lg:max-w-3xl
                            max-h-[90vh]
                            overflow-y-auto
                            rounded-xl
                            p-0
                        "
                    >
                        <DialogHeader
                            className="
                                sticky top-0 z-10
                                flex flex-col gap-1
                                border-b border-slate-200
                                bg-white
                                px-6 py-4
                                relative
                            "
                        >
                            <DialogTitle className="text-lg font-semibold">
                                {formDivision
                                    ? `Lamaran untuk ${formDivision.job_title}`
                                    : 'Form Lamaran'}
                            </DialogTitle>
                            <DialogDescription>
                                Lengkapi formulir di bawah ini untuk melamar ke divisi terkait.
                            </DialogDescription>

                            {/* Tombol X di pojok kanan atas */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-4 top-4 h-8 w-8 text-slate-500 hover:text-slate-700"
                                onClick={handleCloseForm}
                            >
                                <span className="sr-only">Tutup</span>
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogHeader>

                        {/* Isi form dengan padding terpisah supaya scroll enak */}
                        <div className="px-6 pb-6 pt-4">
                            {formDivision && (
                                <ApplicationForm
                                    selectedDivision={{
                                        id: formDivision.id,
                                        name: formDivision.name,
                                        job_title: formDivision.job_title,
                                        job_description: formDivision.job_description,
                                        job_salary_min: formDivision.job_salary_min,
                                        job_work_mode: formDivision.job_work_mode,
                                        job_requirements: formDivision.job_requirements,
                                    }}
                                    data={form.data}
                                    errors={form.errors}
                                    processing={form.processing}
                                    setData={handleSetData}
                                    onSubmit={handleSubmit}
                                />
                            )}
                        </div>

                        <DialogFooter
                            className="
                                sticky bottom-0 z-10
                                flex flex-wrap justify-end gap-2
                                border-t border-slate-200
                                bg-white
                                px-6 py-4
                            "
                        >
                            <Button type="button" variant="outline" onClick={handleCloseForm}>
                                Batal
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <ApplicationHistory items={applicationRows} />

                {/* Eligibility Reject Dialog */}
                <EligibilityRejectDialog
                    open={eligibilityDialogOpen}
                    onClose={() => setEligibilityDialogOpen(false)}
                    failures={eligibilityFailures}
                    passed={eligibilityPassed}
                    jobTitle={rejectedJobTitle ?? undefined}
                />
            </PelamarLayout>
        </>
    );
}


