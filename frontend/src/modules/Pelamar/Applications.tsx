import {
    Building2,
    Briefcase,
    Users,
    CheckCircle,
    CheckCircle2,
    XCircle,
    Send,
    X,
    Loader2,
} from 'lucide-react';
import { useEffect, useState, FormEvent, useMemo } from 'react';
import { toast } from 'sonner';

import ApplicationForm, {
    ApplicationFormData,
} from '@/modules/Pelamar/components/applications/ApplicationForm';
import ApplicationHistory, {
    ApplicationHistoryItem,
} from '@/modules/Pelamar/components/applications/ApplicationHistory';
import EligibilityRejectDialog, {
    EligibilityCriteriaResult,
} from '@/modules/Pelamar/components/applications/EligibilityRejectDialog';
import PelamarLayout from '@/modules/Pelamar/Layout';
import { Badge } from '@/shared/components/ui/badge';
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
import { api, apiUrl } from '@/shared/lib/api';
import { Head, router, useForm } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

type EligibilityCriteria = {
    min_age?: number | null;
    max_age?: number | null;
    gender?: string | null;
    min_education?: string | null;
    program_studies?: string[] | null;
    min_experience_years?: number | null;
};

type DivisionSummary = {
    id: number;
    name: string;
    description: string | null;
    manager_name: string | null;
    capacity: number;
    current_staff: number;
    available_slots: number;
    is_hiring: boolean;
    job_title: string | null;
    job_description: string | null;
    job_requirements: string[];
    job_eligibility_criteria?: EligibilityCriteria | null;
};

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

    const form = useForm<ApplicationFormData>({
        division_id: formDivision?.id ?? null,
        full_name: defaultForm?.full_name ?? '',
        email: defaultForm?.email ?? '',
        phone: defaultForm?.phone ?? '',
        position: formDivision?.job_title ?? '',
        skills: '',
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
                const fallbackDivision = safeDivisions.find(
                    (division) =>
                        division.is_hiring &&
                        division.available_slots > 0 &&
                        division.id !== currentDivision?.id,
                );

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
                if (currentDivision && currentDivision.available_slots > 1) {
                    setFormDivision(currentDivision);
                } else if (fallbackDivision) {
                    setFormDivision(fallbackDivision);
                }

                toast.success('Lamaran berhasil dikirim', {
                    description: 'Tim rekrutmen akan meninjau berkas Anda.',
                });

                void router.reload({
                    only: ['applications', 'divisions', 'defaultForm', 'flash'],
                    preserveScroll: true,
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
                const payload = new URLSearchParams();
                payload.append('division_id', String(division.id));

                const response = await api.post(
                    apiUrl(route('pelamar.applications.check-eligibility')),
                    payload,
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
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
        form.setData((previous) => ({
            ...previous,
            division_id: division.id,
            position: division.job_title ?? '',
        }));
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setFormDivision(null);
        form.setData((previous) => ({
            ...previous,
            division_id: null,
            position: '',
            skills: '',
            cv: null,
        }));
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
                    <StatCard
                        icon={Building2}
                        title="Total Divisi"
                        value={safeDivisions.length}
                        accent="bg-blue-100 text-blue-900"
                    />
                    <StatCard
                        icon={Briefcase}
                        title="Divisi Membuka Lowongan"
                        value={openDivisions.length}
                        accent="bg-green-100 text-green-900"
                    />
                    <StatCard
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
                                <DivisionCard
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
                    open={formOpen && Boolean(formDivision)}
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

function StatCard({
    icon: Icon,
    title,
    value,
    accent,
}: {
    icon: typeof Building2;
    title: string;
    value: number;
    accent: string;
}) {
    return (
        <Card className="p-4">
            <div className="flex items-center gap-3">
                <div className={`rounded-lg p-3 ${accent}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <p className="text-xl font-semibold text-slate-900">{value}</p>
                </div>
            </div>
        </Card>
    );
}

function DivisionCard({
    division,
    isApplied,
    onApply,
}: {
    division: DivisionSummary;
    isApplied: boolean;
    onApply: () => void;
}) {
    const ratio =
        division.capacity > 0
            ? Math.min((division.current_staff / division.capacity) * 100, 100)
            : 0;
    const canApply = division.is_hiring && division.available_slots > 0 && !isApplied;
    const disabled = !canApply;

    let statusLabel;
    if (isApplied) {
        statusLabel = (
            <Badge className="bg-blue-500 hover:bg-blue-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                Sudah Dilamar
            </Badge>
        );
    } else if (division.is_hiring) {
        statusLabel = (
            <Badge
                className={
                    canApply
                        ? 'bg-green-600 hover:bg-green-600'
                        : 'bg-orange-500 hover:bg-orange-500'
                }
            >
                {division.available_slots > 0 ? (
                    <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Lowongan Terbuka
                    </>
                ) : (
                    <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Slot Terpenuhi
                    </>
                )}
            </Badge>
        );
    } else {
        statusLabel = (
            <Badge variant="outline" className="border-slate-300 text-slate-500">
                <XCircle className="mr-1 h-3 w-3" />
                Tidak Ada Lowongan
            </Badge>
        );
    }

    return (
        <button
            type="button"
            onClick={onApply}
            disabled={disabled}
            className={`rounded-2xl border p-4 text-left transition ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-300'
                } border-slate-200`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-900 p-2 text-white">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-blue-900">{division.name}</p>
                        <p className="text-xs text-slate-500">
                            Manager: {division.manager_name ?? 'Belum ditentukan'}
                        </p>
                    </div>
                </div>
                {statusLabel}
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                {division.description ?? 'Belum ada deskripsi divisi.'}
            </p>
            <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Kapasitas</span>
                    <span>
                        {division.current_staff}/{division.capacity}
                    </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                    <div
                        className={`h-1.5 rounded-full ${division.available_slots === 0
                            ? 'bg-red-500'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                            }`}
                        style={{ width: `${ratio}%` }}
                    />
                </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                {division.is_hiring && division.job_title ? (
                    <>
                        <p className="font-semibold text-blue-900">{division.job_title}</p>
                        <p className="text-xs text-slate-500">
                            {division.available_slots} slot tersedia
                        </p>
                        {division.job_requirements.length > 0 && (
                            <ul className="mt-3 space-y-1 text-xs text-slate-600">
                                {division.job_requirements.map((requirement, index) => (
                                    <li
                                        key={`division-${division.id}-req-${index}`}
                                        className="flex items-start gap-2"
                                    >
                                        <CheckCircle2 className="mt-0.5 h-3 w-3 text-blue-600" />
                                        <span>{requirement}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                ) : (
                    <p className="text-slate-500">Belum membuka lowongan.</p>
                )}
            </div>

            {isApplied ? (
                <p className="mt-3 text-center text-xs text-blue-600 font-medium">
                    Anda sudah apply lowongan kerja ini
                </p>
            ) : canApply ? (
                <p className="mt-3 text-center text-xs text-blue-600">
                    <Send className="mr-1 inline h-3 w-3" />
                    Klik untuk melamar ke divisi ini
                </p>
            ) : null}
        </button>
    );
}





