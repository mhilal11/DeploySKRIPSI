import { Plus, Save, Trash2 } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

import { Experience } from '../profileTypes';

interface ExperienceFormProps {
    experiences: Experience[];
    onChange: (id: string, key: keyof Experience, value: string | boolean) => void;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onSave: () => void;
    processing: boolean;
    disabled?: boolean;
}

export default function ExperienceForm({
    experiences,
    onChange,
    onAdd,
    onRemove,
    onSave,
    processing,
    disabled = false,
}: ExperienceFormProps) {
    return (
        <Card className="p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-blue-900">Pengalaman Kerja</h3>
                    <p className="text-sm text-slate-500">
                        Opsional, namun dapat membantu tim HR menilai pengalaman Anda.
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
                    Tambah Pengalaman
                </Button>
            </div>

            {experiences.length === 0 ? (
                <p className="text-sm text-slate-500">
                    Belum ada pengalaman ditambahkan. Anda dapat menambahkan kapan saja.
                </p>
            ) : (
                <div className="space-y-4">
                    {experiences.map((experience, index) => (
                        <div key={experience.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <Badge variant="outline">Pengalaman #{index + 1}</Badge>
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
                                    <Label>Nama Perusahaan</Label>
                                    <Input
                                        value={experience.company ?? ''}
                                        onChange={(event) =>
                                            onChange(experience.id, 'company', event.target.value)
                                        }
                                        placeholder="Contoh: PT. Lintas Data Prima"
                                        disabled={disabled}
                                    />
                                </div>
                                <div>
                                    <Label>Posisi</Label>
                                    <Input
                                        value={experience.position ?? ''}
                                        onChange={(event) =>
                                            onChange(experience.id, 'position', event.target.value)
                                        }
                                        placeholder="Software Engineer"
                                        disabled={disabled}
                                    />
                                </div>
                                <div>
                                    <Label>Tanggal Mulai</Label>
                                    <Input
                                        type="month"
                                        value={experience.start_date ?? ''}
                                        onChange={(event) =>
                                            onChange(experience.id, 'start_date', event.target.value)
                                        }
                                        disabled={disabled}
                                    />
                                </div>
                                <div>
                                    <Label>Tanggal Selesai</Label>
                                    <Input
                                        type="month"
                                        value={experience.end_date ?? ''}
                                        onChange={(event) =>
                                            onChange(experience.id, 'end_date', event.target.value)
                                        }
                                        disabled={experience.is_current || disabled}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-sm">
                                <input
                                    id={`current-${experience.id}`}
                                    type="checkbox"
                                    checked={Boolean(experience.is_current)}
                                    onChange={(event) =>
                                        onChange(experience.id, 'is_current', event.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300"
                                    disabled={disabled}
                                />
                                <Label
                                    htmlFor={`current-${experience.id}`}
                                    className="cursor-pointer text-slate-600"
                                >
                                    Saat ini masih bekerja di sini
                                </Label>
                            </div>

                            <div className="mt-4">
                                <Label>Deskripsi Pekerjaan</Label>
                                <Textarea
                                    value={experience.description ?? ''}
                                    onChange={(event) =>
                                        onChange(experience.id, 'description', event.target.value)
                                    }
                                    placeholder="Jelaskan tanggung jawab utama Anda..."
                                    rows={4}
                                    disabled={disabled}
                                />
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
                        Simpan Pengalaman
                    </Button>
                </div>
            )}
        </Card>
    );
}


