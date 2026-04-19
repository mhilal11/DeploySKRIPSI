import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AutocompleteInput, AutocompleteOption } from '@/shared/components/ui/autocomplete-input';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { RequiredLabel } from '@/shared/components/ui/required-label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { YearPickerInput } from '@/shared/components/ui/year-picker-input';
import { api, apiUrl } from '@/shared/lib/api';

import { Education, RequiredEducationField, GPA_REQUIRED_DEGREES } from '../profileTypes';

const DEGREE_OPTIONS = ['SD', 'SMP', 'SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3'];
const MIN_EDUCATION_YEAR = 1900;
const EDUCATION_REFERENCE_LIMIT = 50;
const MIN_SEARCH_CHARACTERS = 2;

interface EducationFormProps {
    educations: Education[];
    errors: Record<string, string>;
    onChange: (id: string, key: keyof Education, value: string) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onSave: () => void;
    processing: boolean;
    getFieldError: (index: number, field: RequiredEducationField) => string | undefined;
    baseError?: string;
    hasChanges?: boolean;
    disabled?: boolean;
}

export default function EducationForm({
    educations,
    errors,
    onChange,
    onAdd,
    onRemove,
    onSave,
    processing,
    getFieldError,
    baseError,
    hasChanges = true,
    disabled = false,
}: EducationFormProps) {
    const currentYear = new Date().getFullYear();
    const [institutionOptions, setInstitutionOptions] = useState<AutocompleteOption[]>([]);
    const [programOptions, setProgramOptions] = useState<AutocompleteOption[]>([]);
    const [institutionQuery, setInstitutionQuery] = useState('');
    const [programQuery, setProgramQuery] = useState('');
    const [referenceError, setReferenceError] = useState<string | null>(null);

    useEffect(() => {
        const query = institutionQuery.trim();
        if (query.length < MIN_SEARCH_CHARACTERS) {
            setInstitutionOptions([]);
            return undefined;
        }

        let active = true;
        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const response = await api.get(apiUrl('/pelamar/references/education'), {
                        params: { q: query, limit: EDUCATION_REFERENCE_LIMIT },
                    });
                    if (!active) {
                        return;
                    }

                    const institutions = Array.isArray(response.data?.institutions)
                        ? response.data.institutions
                        : [];
                    setInstitutionOptions(
                        institutions.map((name: string) => ({
                            value: name,
                            label: name,
                        })),
                    );
                    setReferenceError(null);
                } catch {
                    if (!active) {
                        return;
                    }
                    setInstitutionOptions([]);
                    setReferenceError('Referensi kampus/prodi belum tersedia. Silakan isi manual.');
                }
            })();
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [institutionQuery]);

    useEffect(() => {
        const query = programQuery.trim();
        if (query.length < MIN_SEARCH_CHARACTERS) {
            setProgramOptions([]);
            return undefined;
        }

        let active = true;
        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const response = await api.get(apiUrl('/pelamar/references/education'), {
                        params: { q: query, limit: EDUCATION_REFERENCE_LIMIT },
                    });
                    if (!active) {
                        return;
                    }

                    const programs = Array.isArray(response.data?.programs)
                        ? response.data.programs
                        : [];
                    setProgramOptions(
                        programs.map((name: string) => ({
                            value: name,
                            label: name,
                        })),
                    );
                    setReferenceError(null);
                } catch {
                    if (!active) {
                        return;
                    }
                    setProgramOptions([]);
                    setReferenceError('Referensi kampus/prodi belum tersedia. Silakan isi manual.');
                }
            })();
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [programQuery]);

    const handleStartYearChange = (education: Education, nextStartYear: string) => {
        onChange(education.id, 'start_year', nextStartYear);

        const startYear = parseInt(nextStartYear, 10);
        const endYear = parseInt(education.end_year ?? '', 10);
        if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
            return;
        }

        const maxEndYear = startYear + 7;
        if (endYear < startYear) {
            onChange(education.id, 'end_year', nextStartYear);
            toast.info('Tahun selesai disesuaikan dengan tahun mulai.');
            return;
        }

        if (endYear > maxEndYear) {
            onChange(education.id, 'end_year', String(maxEndYear));
            toast.info('Tahun selesai disesuaikan maksimal 7 tahun dari tahun mulai.');
        }
    };

    const handleEndYearChange = (education: Education, nextEndYear: string) => {
        const endYear = parseInt(nextEndYear, 10);
        const startYear = parseInt(education.start_year ?? '', 10);

        if (!Number.isNaN(startYear)) {
            if (endYear < startYear) {
                onChange(education.id, 'end_year', String(startYear));
                toast.error('Tahun selesai tidak boleh di bawah tahun mulai.');
                return;
            }

            const maxEndYear = startYear + 7;
            if (endYear > maxEndYear) {
                onChange(education.id, 'end_year', String(maxEndYear));
                toast.error('Tahun selesai maksimal 7 tahun dari tahun mulai.');
                return;
            }
        }

        onChange(education.id, 'end_year', nextEndYear);
    };

    return (
        <Card className="p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-blue-900">Riwayat Pendidikan</h3>
                    <p className="text-sm text-slate-500">
                        Isi pendidikan formal Anda secara berurutan.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onAdd}
                    className="border-blue-200 text-blue-900 hover:bg-blue-50"
                    disabled={disabled}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Pendidikan
                </Button>
            </div>
            {baseError && <p className="mb-4 text-sm text-red-500">{baseError}</p>}

            <div className="space-y-4">
                {educations.map((education, index) => (
                    <div key={education.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <Badge variant="outline">Pendidikan #{index + 1}</Badge>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={educations.length === 1 || disabled}
                                onClick={() => onRemove(education.id)}
                                className="text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <Label><RequiredLabel text="Nama Institusi" /></Label>
                                <AutocompleteInput
                                    options={institutionOptions}
                                    value={education.institution ?? ''}
                                    onValueChange={(value) =>
                                        onChange(education.id, 'institution', value)
                                    }
                                    onInputChange={setInstitutionQuery}
                                    placeholder="Ketik nama perguruan tinggi..."
                                    emptyText="Institusi tidak ditemukan"
                                    allowCustomValue
                                    disabled={disabled}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Ketik minimal {MIN_SEARCH_CHARACTERS} karakter. Tetap bisa isi manual jika institusi belum tersedia.
                                </p>
                                {referenceError && (
                                    <p className="mt-1 text-xs text-amber-600">{referenceError}</p>
                                )}
                                {getFieldError(index, 'institution') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'institution')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label><RequiredLabel text="Jenjang" /></Label>
                                <Select
                                    value={education.degree ?? ''}
                                    onValueChange={(value) =>
                                        onChange(education.id, 'degree', value)
                                    }
                                    disabled={disabled}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Jenjang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DEGREE_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {getFieldError(index, 'degree') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'degree')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label><RequiredLabel text="Program Studi" /></Label>
                                <AutocompleteInput
                                    options={programOptions}
                                    value={education.field_of_study ?? ''}
                                    onValueChange={(value) =>
                                        onChange(education.id, 'field_of_study', value)
                                    }
                                    onInputChange={setProgramQuery}
                                    placeholder="Ketik program studi..."
                                    emptyText="Program studi tidak ditemukan"
                                    allowCustomValue
                                    disabled={disabled}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Ketik minimal {MIN_SEARCH_CHARACTERS} karakter. Tetap bisa isi manual bila belum tersedia.
                                </p>
                                {getFieldError(index, 'field_of_study') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'field_of_study')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label><RequiredLabel text="Tahun Mulai" /></Label>
                                <YearPickerInput
                                    value={education.start_year ?? ''}
                                    onChange={(value) => handleStartYearChange(education, value)}
                                    minYear={MIN_EDUCATION_YEAR}
                                    maxYear={currentYear}
                                    placeholder="Pilih tahun mulai"
                                    disabled={disabled}
                                />
                                {getFieldError(index, 'start_year') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'start_year')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label><RequiredLabel text="Tahun Selesai" /></Label>
                                <YearPickerInput
                                    value={education.end_year ?? ''}
                                    onChange={(value) => handleEndYearChange(education, value)}
                                    minYear={
                                        Number.isNaN(parseInt(education.start_year ?? '', 10))
                                            ? MIN_EDUCATION_YEAR
                                            : parseInt(education.start_year ?? '', 10)
                                    }
                                    maxYear={
                                        Number.isNaN(parseInt(education.start_year ?? '', 10))
                                            ? currentYear + 7
                                            : parseInt(education.start_year ?? '', 10) + 7
                                    }
                                    placeholder="Pilih tahun selesai"
                                    disabled={disabled}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Minimal mengikuti tahun mulai, maksimal 7 tahun dari tahun mulai
                                </p>
                                {getFieldError(index, 'end_year') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'end_year')}
                                    </p>
                                )}
                            </div>
                            {education.degree &&
                                GPA_REQUIRED_DEGREES.includes(education.degree) && (
                                    <div>
                                        <Label><RequiredLabel text="IPK" /></Label>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            maxLength={4}
                                            value={education.gpa ?? ''}
                                            onChange={(e) => {
                                                const event = e as React.ChangeEvent<HTMLInputElement> & {
                                                    nativeEvent: InputEvent;
                                                };
                                                let val = event.target.value;
                                                const inputType = event.nativeEvent.inputType;

                                                // Allow only numbers and dot
                                                if (!/^[0-9.]*$/.test(val)) return;

                                                // Auto-add dot if typing first digit
                                                if (
                                                    inputType === 'insertText' &&
                                                    val.length === 1 &&
                                                    /^[0-9]$/.test(val)
                                                ) {
                                                    val = val + '.';
                                                }

                                                // Prevent multiple dots
                                                if ((val.match(/\./g) || []).length > 1) return;

                                                // Enforce max 4.00
                                                if (val !== '' && val !== '.') {
                                                    const num = parseFloat(val);
                                                    if (!isNaN(num) && num > 4.0) return;
                                                }

                                                // Limit decimal places to 2
                                                if (val.includes('.')) {
                                                    const parts = val.split('.');
                                                    if (parts[1].length > 2) return;
                                                }

                                                onChange(
                                                    education.id,
                                                    'gpa',
                                                    val,
                                                );
                                            }}
                                            placeholder="3.50"
                                            disabled={disabled}
                                        />
                                        {getFieldError(index, 'gpa') && (
                                            <p className="mt-1 text-sm text-red-500">
                                                {getFieldError(index, 'gpa')}
                                            </p>
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                ))}
            </div>

            {!disabled && (
                <div className="mt-6">
                    <Button
                        onClick={onSave}
                        disabled={processing || !hasChanges}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Pendidikan
                    </Button>
                    {!processing && !hasChanges && (
                        <p className="mt-2 text-sm text-slate-500">
                            Ubah minimal 1 field pendidikan terlebih dahulu agar tombol simpan aktif.
                        </p>
                    )}
                </div>
            )}
        </Card>
    );
}
