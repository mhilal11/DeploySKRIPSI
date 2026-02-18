import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

import { Experience, RequiredExperienceField } from '../profileTypes';

interface ExperienceFormProps {
    experiences: Experience[];
    onChange: (id: string, key: keyof Experience, value: string | boolean) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onSave: () => void;
    processing: boolean;
    getFieldError: (index: number, field: RequiredExperienceField) => string | undefined;
    baseError?: string;
    disabled?: boolean;
}

export default function ExperienceForm({
    experiences,
    onChange,
    onAdd,
    onRemove,
    onSave,
    processing,
    getFieldError,
    baseError,
    disabled = false,
}: ExperienceFormProps) {
    const isValidYearMonth = (value: string) =>
        /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

    const handleStartDateChange = (experience: Experience, nextStartDate: string) => {
        onChange(experience.id, 'start_date', nextStartDate);

        const currentEndDate = experience.end_date ?? '';
        if (
            isValidYearMonth(nextStartDate) &&
            isValidYearMonth(currentEndDate) &&
            currentEndDate < nextStartDate
        ) {
            onChange(experience.id, 'end_date', nextStartDate);
            toast.info('Tanggal selesai disesuaikan dengan tanggal mulai.');
        }
    };

    const handleEndDateChange = (experience: Experience, nextEndDate: string) => {
        const startDate = experience.start_date ?? '';
        if (
            isValidYearMonth(startDate) &&
            isValidYearMonth(nextEndDate) &&
            nextEndDate < startDate
        ) {
            onChange(experience.id, 'end_date', startDate);
            toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
            return;
        }

        onChange(experience.id, 'end_date', nextEndDate);
    };

    const handleCurrentStatusChange = (experience: Experience, isCurrent: boolean) => {
        onChange(experience.id, 'is_current', isCurrent);
        if (isCurrent) {
            onChange(experience.id, 'end_date', '');
        }
    };

    return (
        <Card className="p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-blue-900">Pengalaman Kerja/Magang</h3>
                    <p className="text-sm text-slate-500">
                        Opsional, namun dapat membantu tim HR menilai pengalaman kerja atau magang Anda.
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
                    Tambah Pengalaman Kerja/Magang
                </Button>
            </div>
            {baseError && <p className="mb-4 text-sm text-red-500">{baseError}</p>}

            {experiences.length === 0 ? (
                <p className="text-sm text-slate-500">
                    Belum ada pengalaman kerja/magang ditambahkan. Anda dapat menambahkan kapan saja.
                </p>
            ) : (
                <div className="space-y-4">
                    {experiences.map((experience, index) => (
                        <div key={experience.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <Badge variant="outline">Pengalaman Kerja/Magang #{index + 1}</Badge>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemove(experience.id)}
                                    className="text-red-500 hover:text-red-600"
                                    disabled={disabled}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label>Nama Perusahaan *</Label>
                                    <Input
                                        value={experience.company ?? ''}
                                        onChange={(event) =>
                                            onChange(experience.id, 'company', event.target.value)
                                        }
                                        placeholder="Contoh: PT. Lintas Data Prima"
                                        disabled={disabled}
                                    />
                                    {getFieldError(index, 'company') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'company')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>Posisi *</Label>
                                    <Input
                                        value={experience.position ?? ''}
                                        onChange={(event) =>
                                            onChange(experience.id, 'position', event.target.value)
                                        }
                                        placeholder="Software Engineer"
                                        disabled={disabled}
                                    />
                                    {getFieldError(index, 'position') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'position')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>Tanggal Mulai *</Label>
                                    <Input
                                        type="month"
                                        value={experience.start_date ?? ''}
                                        onChange={(event) =>
                                            handleStartDateChange(experience, event.target.value)
                                        }
                                        disabled={disabled}
                                    />
                                    {getFieldError(index, 'start_date') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'start_date')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>Tanggal Selesai {!experience.is_current ? '*' : ''}</Label>
                                    <Input
                                        type="month"
                                        value={experience.end_date ?? ''}
                                        onChange={(event) =>
                                            handleEndDateChange(experience, event.target.value)
                                        }
                                        disabled={experience.is_current || disabled}
                                        min={experience.start_date || undefined}
                                    />
                                    {!experience.is_current && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Wajib diisi jika belum centang &quot;Saat ini masih aktif di sini&quot;.
                                        </p>
                                    )}
                                    {getFieldError(index, 'end_date') && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {getFieldError(index, 'end_date')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-sm">
                                <input
                                    id={`current-${experience.id}`}
                                    type="checkbox"
                                    checked={Boolean(experience.is_current)}
                                    onChange={(event) =>
                                        handleCurrentStatusChange(experience, event.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300"
                                    disabled={disabled}
                                />
                                <Label
                                    htmlFor={`current-${experience.id}`}
                                    className="cursor-pointer text-slate-600"
                                >
                                    Saat ini masih aktif di sini
                                </Label>
                            </div>

                            <div className="mt-4">
                                <Label>Deskripsi Tugas *</Label>
                                <Textarea
                                    value={experience.description ?? ''}
                                    onChange={(event) =>
                                        onChange(experience.id, 'description', event.target.value)
                                    }
                                    placeholder="Jelaskan tugas atau tanggung jawab utama Anda..."
                                    rows={4}
                                    disabled={disabled}
                                />
                                {getFieldError(index, 'description') && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {getFieldError(index, 'description')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!disabled && (
                <div className="mt-6">
                    <Button
                        onClick={onSave}
                        disabled={processing}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Pengalaman Kerja/Magang
                    </Button>
                </div>
            )}
        </Card>
    );
}
