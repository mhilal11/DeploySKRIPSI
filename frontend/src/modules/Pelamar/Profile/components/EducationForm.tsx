import { Plus, Save, Trash2 } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

import { Education, RequiredEducationField, GPA_REQUIRED_DEGREES } from '../profileTypes';

const DEGREE_OPTIONS = ['SD', 'SMP', 'SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3'];

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
    disabled = false,
}: EducationFormProps) {
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
                                <Label>Nama Institusi *</Label>
                                <Input
                                    value={education.institution ?? ''}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        // Only allow letters, numbers, and spaces
                                        const validPattern = /^[a-zA-Z0-9\s]*$/;
                                        if (validPattern.test(value) || value === '') {
                                            onChange(education.id, 'institution', value);
                                        }
                                    }}
                                    placeholder="Contoh: Universitas Indonesia"
                                    disabled={disabled}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Hanya huruf, angka, dan spasi. Tulis dengan lengkap, jangan disingkat (contoh: &quot;Universitas Indonesia&quot; bukan &quot;UI&quot;)
                                </p>
                                {getFieldError(index, 'institution') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'institution')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label>Jenjang *</Label>
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
                                <Label>Program Studi *</Label>
                                <Input
                                    value={education.field_of_study ?? ''}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        // Only allow letters, numbers, and spaces
                                        const validPattern = /^[a-zA-Z0-9\s]*$/;
                                        if (validPattern.test(value) || value === '') {
                                            onChange(education.id, 'field_of_study', value);
                                        }
                                    }}
                                    placeholder="Contoh: Teknik Informatika"
                                    disabled={disabled}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Hanya huruf, angka, dan spasi
                                </p>
                                {getFieldError(index, 'field_of_study') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'field_of_study')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label>Tahun Mulai *</Label>
                                <Input
                                    type="number"
                                    value={education.start_year ?? ''}
                                    onChange={(event) =>
                                        onChange(education.id, 'start_year', event.target.value)
                                    }
                                    placeholder="2019"
                                    disabled={disabled}
                                />
                                {getFieldError(index, 'start_year') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'start_year')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label>Tahun Selesai *</Label>
                                <Input
                                    type="number"
                                    value={education.end_year ?? ''}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        const currentYear = new Date().getFullYear();
                                        // Only allow if empty or <= current year
                                        if (value === '' || (parseInt(value, 10) <= currentYear)) {
                                            onChange(education.id, 'end_year', value);
                                        }
                                    }}
                                    max={new Date().getFullYear()}
                                    placeholder="2023"
                                    disabled={disabled}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Maksimal tahun {new Date().getFullYear()}
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
                                        <Label>IPK *</Label>
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
                        disabled={processing}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Pendidikan
                    </Button>
                </div>
            )}
        </Card>
    );
}


