import { CheckCircle2, Upload } from 'lucide-react';
import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { pdfUploadRule, validateFile } from '@/shared/lib/input-validation';


export interface ApplicationFormData {
    division_id: number | null;
    full_name: string;
    email: string;
    phone: string;
    position: string;
    skills: string;
    cv: File | null;
}

interface SelectedDivisionSummary {
    id: number;
    name: string;
    job_title: string | null;
    job_description: string | null;
    job_requirements: string[];
}

interface ApplicationFormProps {
    selectedDivision: SelectedDivisionSummary | null;
    data: ApplicationFormData;
    errors: Record<string, string>;
    processing: boolean;
    setData: <K extends keyof ApplicationFormData>(
        field: K,
        value: ApplicationFormData[K],
    ) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function ApplicationForm({
    selectedDivision,
    data,
    errors,
    processing,
    setData,
    onSubmit,
}: ApplicationFormProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    const normalizedPhone = data.phone.replace(/\D/g, '');
    const isPhoneValid =
        normalizedPhone.length >= 8 && normalizedPhone.length <= 13;

    const isFormComplete =
        Boolean(data.division_id) &&
        Boolean(data.full_name?.trim()) &&
        Boolean(data.email?.trim()) &&
        Boolean(data.phone?.trim()) &&
        isPhoneValid &&
        Boolean(data.skills?.trim()) &&
        Boolean(data.cv);

    const handlePhoneChange = (value: string) => {
        const numbersOnly = value.replace(/\D/g, '');
        if (numbersOnly.length <= 13) {
            setData('phone', numbersOnly);
        }
    };

    const applyCvFile = (file: File | null, resetInput?: () => void) => {
        if (!file) {
            setData('cv', null);
            return;
        }

        const validationMessage = validateFile(file, pdfUploadRule);
        if (validationMessage) {
            resetInput?.();
            setData('cv', null);
            toast.error('File tidak didukung', {
                description: validationMessage,
            });
            return;
        }

        setData('cv', file);
    };

    const handleCvChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        applyCvFile(file, () => {
            event.target.value = '';
        });
    };

    const handleCvDragOver = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
    };

    const handleCvDragEnter = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragActive(true);
    };

    const handleCvDragLeave = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragActive(false);
    };

    const handleCvDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragActive(false);
        if (processing) {
            return;
        }
        const file = event.dataTransfer.files?.[0] ?? null;
        applyCvFile(file, () => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        });
    };

    return (
        <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Form Lamaran
            </h3>
            {!selectedDivision ? (
                <div className="mb-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Pilih divisi yang membuka lowongan untuk mulai mengisi formulir.
                </div>
            ) : (
                <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                        {selectedDivision.job_title ?? 'Posisi belum ditentukan'}
                    </p>
                    <p className="text-xs text-slate-600">
                        Divisi {selectedDivision.name}
                    </p>
                    {selectedDivision.job_description && (
                        <p className="mt-2 text-sm text-slate-700">
                            {selectedDivision.job_description}
                        </p>
                    )}
                    {selectedDivision.job_requirements.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-slate-600">
                            {selectedDivision.job_requirements.map((req, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-3 w-3 text-blue-700" />
                                    <span>{req}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input type="hidden" value={data.division_id ?? ''} />
                <div>
                    <Label htmlFor="fullname">Nama Lengkap</Label>
                    <Input
                        id="fullname"
                        required
                        value={data.full_name}
                        onChange={(event) => setData('full_name', event.target.value)}
                        placeholder="Masukkan nama lengkap"
                    />
                    {errors.full_name && (
                        <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        value={data.email}
                        onChange={(event) => setData('email', event.target.value)}
                        placeholder="email@example.com"
                    />
                    {errors.email && (
                        <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="phone">No. Telepon</Label>
                    <Input
                        id="phone"
                        required
                        value={data.phone}
                        onChange={(event) => handlePhoneChange(event.target.value)}
                        placeholder="081234567890"
                        maxLength={13}
                    />
                    <p className="mt-1 text-xs text-slate-500">8-13 digit angka</p>
                    {data.phone && !isPhoneValid && (
                        <p className="mt-1 text-xs text-amber-600">
                            Nomor telepon harus 8-13 digit
                        </p>
                    )}
                    {errors.phone && (
                        <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                    )}
                </div>
                <div>
                    <Label>Posisi yang Dilamar</Label>
                    <Input
                        readOnly
                        value={selectedDivision?.job_title ?? ''}
                        placeholder="Pilih divisi terlebih dahulu"
                        className="bg-slate-50"
                    />
                </div>
                
                <div className="md:col-span-2">
                    <Label htmlFor="skills">Keahlian</Label>
                    <Textarea
                        id="skills"
                        required
                        value={data.skills}
                        onChange={(event) => setData('skills', event.target.value)}
                        placeholder="Sebutkan keahlian Anda (pisahkan dengan koma)"
                    />
                    {errors.skills && (
                        <p className="mt-1 text-xs text-red-500">{errors.skills}</p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <Label htmlFor="cv-upload">Upload CV (PDF)</Label>
                    <label
                        htmlFor="cv-upload"
                        className={`block cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition focus-within:border-blue-500 ${
                            isDragActive
                                ? 'border-blue-500 bg-blue-50/60'
                                : 'border-slate-300 hover:border-blue-500'
                        }`}
                        onDragOver={handleCvDragOver}
                        onDragEnter={handleCvDragEnter}
                        onDragLeave={handleCvDragLeave}
                        onDrop={handleCvDrop}
                    >
                        <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" aria-hidden />
                        <p className="text-sm text-slate-600">
                            Klik untuk upload atau drag & drop
                        </p>
                        <p className="text-xs text-slate-400">
                            PDF, maks 5MB
                        </p>
                        {data.cv && (
                            <p className="mt-3 text-xs font-medium text-blue-900">
                                {data.cv.name}
                            </p>
                        )}
                        <Input
                            id="cv-upload"
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            className="sr-only"
                            onChange={handleCvChange}
                            disabled={processing}
                        />
                    </label>
                    {errors.cv && (
                        <p className="mt-1 text-xs text-red-500">{errors.cv}</p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <Button
                        type="submit"
                        className="bg-blue-900 hover:bg-blue-800 text-white"
                        disabled={processing || !isFormComplete}
                    >
                        Submit Lamaran
                    </Button>
                    {!isFormComplete && (
                        <p className="mt-2 text-xs text-slate-500">
                            Pilih divisi yang membuka lowongan dan lengkapi seluruh data sebelum
                            mengirim lamaran.
                        </p>
                    )}
                </div>
            </form>
        </Card>
    );
}


