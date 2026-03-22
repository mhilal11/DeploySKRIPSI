import {
    Filter,
    X,
} from 'lucide-react';

import type { EligibilityCriteria } from '@/modules/SuperAdmin/KelolaDivisi/types';
import {
    AutocompleteInput,
    type AutocompleteOption,
} from '@/shared/components/ui/autocomplete-input';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';


const EDUCATION_LEVELS = [
    { value: 'SMA', label: 'SMA/SMK' },
    { value: 'D3', label: 'Diploma (D3)' },
    { value: 'S1', label: 'Sarjana (S1)' },
    { value: 'S2', label: 'Magister (S2)' },
    { value: 'S3', label: 'Doktor (S3)' },
];

const GENDER_OPTIONS = [
    { value: 'none', label: 'Semua (Tidak Dibatasi)' },
    { value: 'Laki-laki', label: 'Laki-laki' },
    { value: 'Perempuan', label: 'Perempuan' },
];

type EligibilityCriteriaSectionProps = {
    criteria: EligibilityCriteria | undefined;
    normalizedProgramStudies: string[];
    programStudyInput: string;
    programOptions: AutocompleteOption[];
    programReferenceError: string | null;
    minSearchCharacters: number;
    maxProgramStudies: number;
    maxAgeError?: string;
    onProgramStudyInputChange: (value: string) => void;
    onProgramStudyQueryChange: (value: string) => void;
    onAddProgramStudy: () => void;
    onRemoveProgramStudy: (program: string) => void;
    onUpdateCriteria: <K extends keyof EligibilityCriteria>(
        key: K,
        value: EligibilityCriteria[K],
    ) => void;
};

export function EligibilityCriteriaSection({
    criteria,
    normalizedProgramStudies,
    programStudyInput,
    programOptions,
    programReferenceError,
    minSearchCharacters,
    maxProgramStudies,
    maxAgeError,
    onProgramStudyInputChange,
    onProgramStudyQueryChange,
    onAddProgramStudy,
    onRemoveProgramStudy,
    onUpdateCriteria,
}: EligibilityCriteriaSectionProps) {
    return (
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-amber-600" />
                <Label className="font-semibold text-amber-900">Kriteria Kelayakan Otomatis</Label>
            </div>
            <p className="text-xs text-amber-700">
                Pelamar yang tidak memenuhi kriteria akan ditolak otomatis dengan notifikasi
                spesifik.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="min-age" className="text-sm">Umur Minimal</Label>
                    <Input
                        id="min-age"
                        type="number"
                        min={17}
                        max={65}
                        value={criteria?.min_age ?? ''}
                        onChange={(event) =>
                            onUpdateCriteria(
                                'min_age',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                        placeholder="Contoh: 21"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="max-age" className="text-sm">Umur Maksimal</Label>
                    <Input
                        id="max-age"
                        type="number"
                        min={criteria?.min_age ?? 17}
                        max={65}
                        value={criteria?.max_age ?? ''}
                        onChange={(event) =>
                            onUpdateCriteria(
                                'max_age',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                        placeholder="Contoh: 35"
                        className={maxAgeError ? 'border-red-500' : ''}
                    />
                    {maxAgeError && (
                        <p className="text-xs text-red-600">{maxAgeError}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm">Jenis Kelamin</Label>
                    <Select
                        value={criteria?.gender ?? 'none'}
                        onValueChange={(value) => onUpdateCriteria('gender', value === 'none' ? null : value)}
                    >
                        <SelectTrigger id="gender">
                            <SelectValue placeholder="Pilih jenis kelamin" />
                        </SelectTrigger>
                        <SelectContent>
                            {GENDER_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="min-education" className="text-sm">Pendidikan Minimal</Label>
                    <Select
                        value={criteria?.min_education ?? 'none'}
                        onValueChange={(value) =>
                            onUpdateCriteria('min_education', value === 'none' ? null : value)
                        }
                    >
                        <SelectTrigger id="min-education">
                            <SelectValue placeholder="Pilih tingkat pendidikan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Semua (Tidak Dibatasi)</SelectItem>
                            {EDUCATION_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                    {level.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Kosongkan field yang tidak ingin dijadikan kriteria filter.
                    </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="program-study-input" className="text-sm">Program Studi (Bisa Lebih dari 1)</Label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <AutocompleteInput
                                options={programOptions}
                                value={programStudyInput}
                                onValueChange={onProgramStudyInputChange}
                                onInputChange={(value) => {
                                    onProgramStudyInputChange(value);
                                    onProgramStudyQueryChange(value);
                                }}
                                placeholder="Ketik program studi..."
                                emptyText="Program studi tidak ditemukan"
                                allowCustomValue
                                disabled={normalizedProgramStudies.length >= maxProgramStudies}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onAddProgramStudy}
                            disabled={!programStudyInput.trim() || normalizedProgramStudies.length >= maxProgramStudies}
                        >
                            Tambah
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Ketik minimal {minSearchCharacters}{' '}
                        karakter.
                    </p>
                    {programReferenceError && (
                        <p className="text-xs text-amber-600">{programReferenceError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Maksimal {maxProgramStudies} prodi. Kriteria ini dipakai untuk penyesuaian skor
                        pendidikan, bukan auto-reject.
                    </p>
                    {normalizedProgramStudies.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {normalizedProgramStudies.map((program) => (
                                <span
                                    key={program}
                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-800"
                                >
                                    {program}
                                    <button
                                        type="button"
                                        onClick={() => onRemoveProgramStudy(program)}
                                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100"
                                        aria-label={`Hapus ${program}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="min-experience" className="text-sm">Pengalaman Minimal (Tahun)</Label>
                    <Input
                        id="min-experience"
                        type="number"
                        min={0}
                        max={40}
                        value={criteria?.min_experience_years ?? ''}
                        onChange={(event) =>
                            onUpdateCriteria(
                                'min_experience_years',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                        placeholder="Contoh: 2"
                    />
                </div>
            </div>
        </div>
    );
}
