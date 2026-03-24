import { Upload, X } from 'lucide-react';
import { ChangeEvent, useMemo } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';


const ALL_DIVISIONS_VALUE = '__all_divisions__';

interface ComposeLetterDialogProps {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    triggerLabel?: string;
    data: {
        perihal: string;
        isi_surat: string;
        jenis_surat: string;
        kategori: string;
        prioritas: string;
        target_divisions: string[];
        lampiran: File | null;
    };
    setData: (field: string, value: unknown) => void;
    errors: Record<string, string | undefined>;
    processing: boolean;
    onSubmit: () => void;
    userInfo: {
        name: string;
        division?: string | null;
        role?: string | null;
    };
    options: {
        letterTypes: string[];
        categories: string[];
        priorities: Record<string, string>;
        divisions: string[];
    };
    letterNumberPreview: string;
}

export default function ComposeLetterDialog({
    open,
    onOpenChange,
    triggerLabel = 'Buat Surat Baru',
    data,
    setData,
    errors,
    processing,
    onSubmit,
    userInfo,
    options,
    letterNumberPreview,
}: ComposeLetterDialogProps) {
    const priorityEntries = useMemo(
        () => Object.entries(options.priorities),
        [options.priorities]
    );
    // Super Admin has no division, so show all divisions
    const divisionOptions = useMemo(
        () => options.divisions,
        [options.divisions],
    );

    const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (file && !isAllowedAttachment(file)) {
            event.target.value = '';
            setData('lampiran', null);
            toast.error('File ini tidak bisa, hanya PDF atau Word yang diperbolehkan');
            return;
        }

        setData('lampiran', file);
    };

    const isAllowedAttachment = (file: File) => {
        const allowedMimeTypes = new Set([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
        const allowedExtensions = new Set(['pdf', 'doc', 'docx']);

        if (allowedMimeTypes.has(file.type.toLowerCase())) {
            return true;
        }

        const extension = file.name.split('.').pop()?.toLowerCase();
        return extension ? allowedExtensions.has(extension) : false;
    };

    const toggleDivision = (division: string, checked: boolean) => {
        if (checked) {
            setData('target_divisions', [...data.target_divisions, division]);
        } else {
            setData(
                'target_divisions',
                data.target_divisions.filter((item) => item !== division),
            );
        }
    };

    const allDivisionsSelected =
        divisionOptions.length > 0 &&
        divisionOptions.every((division) => data.target_divisions.includes(division));

    const toggleAllDivisions = (checked: boolean) => {
        if (checked) {
            setData('target_divisions', divisionOptions);
        } else {
            setData('target_divisions', []);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button className="w-full bg-blue-900 text-white hover:bg-blue-800 sm:w-auto">
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-[96vw] overflow-hidden border-0 bg-white p-0 sm:w-full sm:max-w-3xl">
                <DialogHeader className="space-y-1 border-b border-slate-100 px-4 py-4 sm:px-6">
                    <DialogTitle>Buat Surat Baru</DialogTitle>
                    <DialogDescription>
                        Atur detail surat dinas dan kirimkan ke divisi tujuan secara terstruktur.
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="max-h-[calc(90vh-5rem)] space-y-5 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">
                            Informasi Pengirim
                        </p>
                        <div className="mt-3 grid gap-4 md:grid-cols-3">
                            <InfoItem label="Nama Pengirim" value={userInfo.name} />
                            <InfoItem
                                label="Jabatan"
                                value={userInfo.role ?? 'Super Admin'}
                            />
                            <InfoItem
                                label="Nomor Surat (Preview)"
                                value={letterNumberPreview}
                            />
                        </div>
                    </section>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>
                                Jenis Surat <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data.jenis_surat}
                                onValueChange={(value) => setData('jenis_surat', value)}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Pilih jenis surat" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {options.letterTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.jenis_surat && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.jenis_surat}
                                </p>
                            )}
                        </div>
                        <div>
                            <Label>Tanggal Surat</Label>
                            <Input
                                value={new Date().toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                                disabled
                                className="bg-slate-100"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>
                            Divisi Tujuan <span className="text-red-500">*</span>
                        </Label>
                        <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 max-h-48 overflow-y-auto">
                            <label className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm hover:border-blue-200">
                                <span className="font-semibold text-slate-800">Pilih Semua Divisi</span>
                                <Checkbox
                                    checked={allDivisionsSelected}
                                    onCheckedChange={(value) => toggleAllDivisions(Boolean(value))}
                                />
                            </label>
                            {divisionOptions.length === 0 && (
                                <p className="text-sm text-slate-500">
                                    Tidak ada divisi yang tersedia.
                                </p>
                            )}
                            {divisionOptions.map((division) => {
                                const checked = data.target_divisions.includes(division);
                                return (
                                    <label
                                        key={division}
                                        className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm hover:border-blue-200"
                                    >
                                        <span className="text-slate-800">{division}</span>
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(value) =>
                                                toggleDivision(division, Boolean(value))
                                            }
                                        />
                                    </label>
                                );
                            })}
                        </div>
                        {errors.target_divisions && (
                            <p className="mt-1 text-sm text-red-500">
                                {errors.target_divisions as string}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                            Surat akan langsung dikirim ke divisi yang dipilih tanpa disposisi.
                        </p>
                    </div>

                    <div>
                        <Label>
                            Subjek Surat <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={data.perihal}
                            onChange={(event) => setData('perihal', event.target.value)}
                            placeholder="Subjek surat"
                        />
                        {errors.perihal && (
                            <p className="mt-1 text-sm text-red-500">{errors.perihal}</p>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>
                                Kategori <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data.kategori}
                                onValueChange={(value) => setData('kategori', value)}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {options.categories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.kategori && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.kategori}
                                </p>
                            )}
                        </div>
                        <div>
                            <Label>
                                Prioritas <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={data.prioritas}
                                onValueChange={(value) => setData('prioritas', value)}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Pilih prioritas" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {priorityEntries.map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.prioritas && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.prioritas}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label>
                            Isi Surat <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            rows={8}
                            placeholder="Tulis isi surat di sini..."
                            value={data.isi_surat}
                            onChange={(event) => setData('isi_surat', event.target.value)}
                        />
                        {errors.isi_surat && (
                            <p className="mt-1 text-sm text-red-500">
                                {errors.isi_surat}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label>Lampiran (Opsional - PDF atau Word, max 5MB)</Label>
                        <label
                            htmlFor="lampiran"
                            className="mt-2 block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 transition hover:border-blue-500 hover:text-blue-600"
                        >
                            <Upload className="mx-auto mb-2 h-6 w-6" />
                            Klik untuk mengunggah lampiran
                        </label>
                        <input
                            id="lampiran"
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={handleAttachmentChange}
                        />
                        {data.lampiran && (
                            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-900">
                                        {data.lampiran.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {(data.lampiran.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="self-end text-red-500 sm:self-auto"
                                    onClick={() => setData('lampiran', null)}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {errors.lampiran && (
                            <p className="mt-1 text-sm text-red-500">{errors.lampiran}</p>
                        )}
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center">
                        <Button
                            type="submit"
                            className="w-full bg-blue-900 text-white hover:bg-blue-800 sm:w-auto"
                            disabled={processing}
                        >
                            {processing ? 'Mengirim...' : 'Kirim Surat'}
                        </Button>
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                            Batal
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs text-blue-900/70">{label}</p>
            <p className="text-sm font-medium text-blue-900">{value ?? '-'}</p>
        </div>
    );
}


