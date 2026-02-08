import { CheckCircle, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import StaffLayout from "@/modules/Staff/components/Layout";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Progress } from "@/shared/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { Head, router, useForm, usePage } from "@/shared/lib/inertia";
import type { PageProps } from "@/shared/types";

import type {
    ProfileInfo,
    TerminationRecord,
    ResignationPageProps,
} from "../Staff/types";

export default function StaffResignation() {
    const { props } = usePage<PageProps<Partial<ResignationPageProps>>>();
    const profile: ProfileInfo = {
        name: props.profile?.name ?? "",
        employeeCode: props.profile?.employeeCode ?? null,
        division: props.profile?.division ?? null,
        position: props.profile?.position ?? null,
        joinedAt: props.profile?.joinedAt ?? null,
    };
    const activeRequest: TerminationRecord | null = props.activeRequest
        ? {
            reference: props.activeRequest.reference ?? "-",
            status: props.activeRequest.status ?? "Menunggu",
            requestDate: props.activeRequest.requestDate ?? "-",
            effectiveDate: props.activeRequest.effectiveDate ?? "-",
            progress: props.activeRequest.progress ?? 0,
            notes: props.activeRequest.notes ?? null,
        }
        : null;
    const history: TerminationRecord[] = Array.isArray(props.history)
        ? props.history.map((item) => ({
            reference: item.reference ?? "-",
            status: item.status ?? "Menunggu",
            requestDate: item.requestDate ?? "-",
            effectiveDate: item.effectiveDate ?? "-",
            progress: item.progress ?? 0,
            notes: item.notes ?? null,
        }))
        : [];

    const form = useForm({
        effective_date: "",
        reason: "",
        suggestion: "",
        confirmation: false,
    });

    const hasActiveRequest = Boolean(activeRequest);
    const [clientError, setClientError] = useState<string | null>(null);

    const getProgressValue = (req: TerminationRecord | null) => {
        if (!req) return 0;
        const raw = Number(req.progress ?? 0);
        const statusLower = (req.status ?? "").toLowerCase();
        const isInitial =
            statusLower.includes("diajukan") ||
            statusLower.includes("menunggu") ||
            statusLower.includes("pending") ||
            statusLower.includes("baru");
        return isInitial ? 0 : Math.max(0, raw);
    };

    const submit = () => {
        if (hasActiveRequest || !form.data.confirmation) return;

        const trimmedReason = form.data.reason.trim();
        const trimmedSuggestion = form.data.suggestion.trim();

        if (!form.data.effective_date || !trimmedReason || !trimmedSuggestion) {
            setClientError("Semua field wajib diisi.");
            return;
        }

        setClientError(null);

        form.post(route("staff.resignation.store"), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Pengajuan resign berhasil dikirim.");
                form.reset();
                void router.reload({
                    only: ["profile", "activeRequest", "history"],
                    preserveScroll: true,
                    replace: true,
                });
            },
            onError: () => {
                toast.error("Pengajuan gagal dikirim. Periksa data Anda lalu coba lagi.");
            },
        });
    };

    return (
        <>
            <Head title="Pengajuan Resign" />

            <StaffLayout
                title="Pengajuan Resign"
                description="Ajukan permohonan resign dan pantau proses offboarding Anda."
            >
                {/* FORM + INFO PANEL */}
                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    {/* LEFT COLUMN: FORM OR ACTIVE STATUS */}
                    <div className="space-y-6">
                        {activeRequest ? (
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold text-blue-900 border-b pb-4 mb-4">
                                    Status Pengajuan Aktif
                                </h2>

                                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <CheckCircle className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-indigo-900 text-sm">
                                                Pengajuan Sedang Diproses
                                            </p>
                                            <p className="text-sm text-indigo-700 mt-1">
                                                Anda sudah memiliki pengajuan resign yang sedang berjalan.
                                                Silakan pantau progress di bawah ini. Form pengajuan baru dinonaktifkan sementara.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    <StatusItem
                                        label="Nomor Referensi"
                                        value={activeRequest.reference}
                                    />
                                    <StatusItem
                                        label="Status Terkini"
                                        value={activeRequest.status}
                                        highlight
                                    />
                                    <StatusItem
                                        label="Tanggal Diajukan"
                                        value={activeRequest.requestDate}
                                    />
                                    <StatusItem
                                        label="Tanggal Efektif"
                                        value={activeRequest.effectiveDate}
                                    />
                                </div>

                                {/* PROGRESS */}
                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                                            Progress Approval
                                        </p>
                                        <span className="text-xs font-semibold text-slate-700">
                                            {getProgressValue(activeRequest)}%
                                        </span>
                                    </div>

                                    <Progress
                                        value={getProgressValue(activeRequest)}
                                        className="h-3 rounded-full bg-slate-100"
                                    />
                                </div>

                                <div className="mt-6 pt-6 border-t">
                                    <p className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-2">
                                        Catatan HR / Management
                                    </p>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                                        {activeRequest.notes?.trim()?.length
                                            ? activeRequest.notes
                                            : <span className="text-slate-500 italic">Belum ada catatan.</span>}
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="p-6 w-full">
                                <h2 className="text-lg font-semibold text-blue-900">
                                    Form Pengajuan Resign
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Data pribadi terisi otomatis.
                                </p>

                                <div className="mt-5 space-y-4">
                                    {/* GRID FORM */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                        <FormField
                                            label="Nama Lengkap"
                                            value={profile.name}
                                            disabled
                                        />
                                        <FormField
                                            label="ID Karyawan"
                                            value={profile.employeeCode ?? "-"}
                                            disabled
                                        />
                                        <FormField
                                            label="Divisi"
                                            value={profile.division ?? "-"}
                                            disabled
                                        />
                                        <FormField
                                            label="Posisi"
                                            value={profile.position ?? "-"}
                                            disabled
                                        />
                                        <FormField
                                            type="date"
                                            label="Tanggal Bergabung"
                                            value={profile.joinedAt ?? ""}
                                            disabled
                                        />

                                        <div className="flex flex-col">
                                            <Label>Tanggal Efektif Resign</Label>
                                            <Input
                                                type="date"
                                                value={form.data.effective_date}
                                                required
                                                onChange={(e) =>
                                                    form.setData(
                                                        "effective_date",
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Alasan */}
                                    <div className="w-full">
                                        <Label>Alasan Resign</Label>
                                        <Textarea
                                            rows={4}
                                            value={form.data.reason}
                                            required
                                            onChange={(e) =>
                                                form.setData("reason", e.target.value)
                                            }
                                            placeholder="Jelaskan alasan pengunduran diri Anda..."
                                        />
                                    </div>

                                    {/* Saran */}
                                    <div className="w-full">
                                        <Label>Saran (Opsional)</Label>
                                        <Textarea
                                            rows={3}
                                            value={form.data.suggestion}
                                            required
                                            onChange={(e) =>
                                                form.setData(
                                                    "suggestion",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Saran untuk perusahaan..."
                                        />
                                    </div>

                                    {/* Checkbox */}
                                    <div className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50 w-full">
                                        <Checkbox
                                            checked={form.data.confirmation}
                                            onCheckedChange={(v) =>
                                                form.setData("confirmation", Boolean(v))
                                            }
                                        />
                                        <Label className="text-sm leading-tight text-slate-700">
                                            Saya menyatakan bahwa keputusan ini dibuat dengan sadar dan
                                            memahami prosedur pengunduran diri yang berlaku di perusahaan.
                                        </Label>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <Button
                                            onClick={submit}
                                            disabled={
                                                form.processing ||
                                                !form.data.confirmation ||
                                                !form.data.effective_date ||
                                                !form.data.reason.trim() ||
                                                !form.data.suggestion.trim()
                                            }
                                            className="bg-blue-900 text-white hover:bg-blue-800"
                                        >
                                            {form.processing
                                                ? "Mengirim..."
                                                : "Submit Pengajuan"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => form.reset()}
                                            disabled={form.processing}
                                        >
                                            Reset
                                        </Button>
                                        {clientError && (
                                            <p className="text-sm text-red-500 mt-2 w-full">{clientError}</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT COLUMN: INFO PANEL */}
                    <div className="space-y-4 w-full">
                        <InfoCard
                            icon={
                                <FileText className="h-5 w-5 text-blue-900" />
                            }
                            title="Masa Pemberitahuan"
                            description="Minimal 30 hari sebelum tanggal efektif."
                            color="bg-blue-50 border-blue-200"
                        />
                        <InfoCard
                            icon={<Clock className="h-5 w-5 text-amber-900" />}
                            title="Serah Terima"
                            description="Lengkapi dokumentasi sebelum hari terakhir."
                            color="bg-amber-50 border-amber-200"
                        />
                        <InfoCard
                            icon={
                                <CheckCircle className="h-5 w-5 text-green-900" />
                            }
                            title="Exit Interview"
                            description="HR akan menjadwalkan sesi interview."
                            color="bg-green-50 border-green-200"
                        />
                    </div>
                </div>

                {/* BOTTOM SECTION: HISTORY */}
                <Card className="p-6 mt-6">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-blue-900">
                                Riwayat Pengajuan
                            </h2>
                            <p className="text-sm text-slate-500">
                                Catatan pengajuan resign yang pernah Anda buat.
                            </p>
                        </div>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="mt-3 space-y-3 sm:hidden">
                        {history.length === 0 && (
                            <p className="text-sm text-slate-500 py-4 text-center border rounded-lg bg-slate-50">
                                Belum ada riwayat pengajuan.
                            </p>
                        )}

                        {history.map((item: TerminationRecord) => (
                            <div
                                key={item.reference}
                                className="border rounded-lg p-4 bg-white shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-slate-900">
                                        {item.reference}
                                    </p>
                                    <StatusBadge status={item.status} />
                                </div>

                                <div className="text-xs text-slate-600 space-y-1.5 border-t pt-3">
                                    <div className="flex justify-between">
                                        <span>Diajukan:</span>
                                        <span className="font-medium">{item.requestDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Efektif:</span>
                                        <span className="font-medium">{item.effectiveDate}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="mt-3 overflow-x-auto hidden sm:block border rounded-lg">
                        <Table className="w-full min-w-[600px]">
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="font-semibold text-slate-900">Referensi</TableHead>
                                    <TableHead className="font-semibold text-slate-900">Tanggal Diajukan</TableHead>
                                    <TableHead className="font-semibold text-slate-900">Tanggal Efektif</TableHead>
                                    <TableHead className="font-semibold text-slate-900">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center text-sm text-slate-500 py-8"
                                        >
                                            Belum ada riwayat pengajuan.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {history.map((item: TerminationRecord) => (
                                    <TableRow key={item.reference} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium">
                                            {item.reference}
                                        </TableCell>
                                        <TableCell>
                                            {item.requestDate}
                                        </TableCell>
                                        <TableCell>
                                            {item.effectiveDate}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={item.status}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </StaffLayout>
        </>
    );
}

/* ---------------- COMPONENTS ---------------- */

interface FormFieldProps {
    label: string;
    value: string;
    disabled?: boolean;
    type?: string;
}

function FormField({ label, value, disabled, type = "text" }: FormFieldProps) {
    return (
        <div className="w-full">
            <Label>{label}</Label>
            <Input
                type={type}
                value={value}
                disabled={disabled}
                readOnly={disabled}
            />
        </div>
    );
}

interface InfoCardProps {
    icon: JSX.Element;
    title: string;
    description: string;
    color: string;
}

function InfoCard({ icon, title, description, color }: InfoCardProps) {
    return (
        <div className={`rounded-lg border p-4 w-full ${color}`}>
            <div className="flex gap-3">
                {icon}
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-slate-600">{description}</p>
                </div>
            </div>
        </div>
    );
}

interface StatusItemProps {
    label: string;
    value: string;
    highlight?: boolean;
}

function StatusItem({ label, value, highlight = false }: StatusItemProps) {
    return (
        <div className="flex flex-col">
            <p className="text-xs uppercase text-slate-500 font-medium mb-1">
                {label}
            </p>

            {highlight ? (
                <Badge
                    variant="outline"
                    className="border-blue-500 text-blue-700 w-fit px-2 py-1"
                >
                    {value}
                </Badge>
            ) : (
                <p className="text-sm font-semibold text-slate-900">{value}</p>
            )}
        </div>
    );
}

interface StatusBadgeProps {
    status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
    const s = status.toLowerCase();

    if (s.includes("selesai"))
        return (
            <Badge
                variant="outline"
                className="border-green-500 text-green-600"
            >
                {status}
            </Badge>
        );

    if (s.includes("proses") || s.includes("menunggu"))
        return (
            <Badge
                variant="outline"
                className="border-amber-500 text-amber-600"
            >
                {status}
            </Badge>
        );

    return <Badge variant="outline">{status}</Badge>;
}




