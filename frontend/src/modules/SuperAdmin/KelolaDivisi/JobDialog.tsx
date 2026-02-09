import { Plus, Trash2, Filter, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { AutocompleteInput, type AutocompleteOption } from '@/shared/components/ui/autocomplete-input';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { api, apiUrl } from '@/shared/lib/api';
import type { InertiaFormProps } from '@/shared/lib/inertia';

import type { DivisionRecord, EligibilityCriteria } from './types';

const MAX_REQUIREMENTS = 5;
const MAX_PROGRAM_STUDIES = 10;
const EDUCATION_REFERENCE_LIMIT = 50;
const MIN_SEARCH_CHARACTERS = 2;

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

const DEFAULT_SCORING_WEIGHTS = {
    education: 30,
    experience: 30,
    skills: 25,
    certification: 10,
    profile: 5,
} as const;

const DEFAULT_SCORING_THRESHOLDS = {
    priority: 85,
    recommended: 70,
    consider: 55,
} as const;

export type JobFormFields = {
    job_title: string;
    job_description: string;
    job_requirements: string[];
    job_eligibility_criteria: EligibilityCriteria;
};

type JobDialogProps = {
    division: DivisionRecord | null;
    form: InertiaFormProps<JobFormFields>;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function JobDialog({ division, form, onClose, onSubmit }: JobDialogProps) {
    const [programStudyInput, setProgramStudyInput] = useState('');
    const [programStudyQuery, setProgramStudyQuery] = useState('');
    const [programOptions, setProgramOptions] = useState<AutocompleteOption[]>([]);
    const [programReferenceError, setProgramReferenceError] = useState<string | null>(null);

    useEffect(() => {
        setProgramStudyInput('');
        setProgramStudyQuery('');
        setProgramOptions([]);
        setProgramReferenceError(null);
    }, [division?.id]);

    useEffect(() => {
        const query = programStudyQuery.trim();
        if (query.length < MIN_SEARCH_CHARACTERS) {
            setProgramOptions([]);
            return undefined;
        }

        let active = true;
        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const response = await api.get(apiUrl('/super-admin/references/education'), {
                        params: { q: query, limit: EDUCATION_REFERENCE_LIMIT },
                    });
                    if (!active) {
                        return;
                    }

                    const programs = Array.isArray(response.data?.programs) ? response.data.programs : [];
                    setProgramOptions(
                        programs.map((name: string) => ({
                            value: name,
                            label: name,
                        })),
                    );
                    setProgramReferenceError(null);
                } catch {
                    if (!active) {
                        return;
                    }
                    setProgramOptions([]);
                    setProgramReferenceError('Referensi program studi belum tersedia. Tetap bisa isi manual.');
                }
            })();
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [programStudyQuery]);

    const normalizedProgramStudies = (
        form.data.job_eligibility_criteria?.program_studies ?? []
    ).reduce<string[]>((acc, item) => {
        if (!item || !item.trim()) return acc;
        const cleaned = item.trim();
        const exists = acc.some((existing) => existing.toLowerCase() === cleaned.toLowerCase());
        if (!exists) {
            acc.push(cleaned);
        }
        return acc;
    }, []);

    const addProgramStudy = () => {
        const candidate = programStudyInput.trim();
        if (!candidate) return;
        if (normalizedProgramStudies.length >= MAX_PROGRAM_STUDIES) return;

        const exists = normalizedProgramStudies.some(
            (item) => item.trim().toLowerCase() === candidate.toLowerCase(),
        );
        if (exists) {
            setProgramStudyInput('');
            return;
        }

        updateCriteria('program_studies', [...normalizedProgramStudies, candidate]);
        setProgramStudyInput('');
    };

    const removeProgramStudy = (program: string) => {
        updateCriteria(
            'program_studies',
            normalizedProgramStudies.filter((item) => item !== program),
        );
    };

    const addRequirement = () => {
        if (form.data.job_requirements.length >= MAX_REQUIREMENTS) return;

        form.setData((prev) => ({
            ...prev,
            job_requirements: [...prev.job_requirements, ''],
        }));
    };

    const updateRequirement = (index: number, value: string) => {
        form.setData((prev) => {
            const requirements = [...prev.job_requirements];
            requirements[index] = value;
            return {
                ...prev,
                job_requirements: requirements,
            };
        });
        form.clearErrors('job_requirements');
    };

    const removeRequirement = (index: number) => {
        if (form.data.job_requirements.length === 1) return;

        form.setData((prev) => ({
            ...prev,
            job_requirements: prev.job_requirements.filter((_, idx) => idx !== index),
        }));
    };

    const updateCriteria = <K extends keyof EligibilityCriteria>(
        key: K,
        value: EligibilityCriteria[K]
    ) => {
        form.setData((prev) => ({
            ...prev,
            job_eligibility_criteria: {
                ...prev.job_eligibility_criteria,
                [key]: value,
            },
        }));

        // Validate max_age when it changes
        if (key === 'max_age' && value) {
            const minAge = form.data.job_eligibility_criteria?.min_age;
            if (minAge && Number(value) < minAge) {
                form.setError('job_eligibility_criteria.max_age', `Umur maksimal tidak boleh kurang dari umur minimal (${minAge} tahun)`);
            } else {
                form.clearErrors('job_eligibility_criteria.max_age');
            }
        }

        // Validate max_age when min_age changes
        if (key === 'min_age' && value) {
            const maxAge = form.data.job_eligibility_criteria?.max_age;
            if (maxAge && Number(value) > maxAge) {
                form.setError('job_eligibility_criteria.max_age', `Umur maksimal tidak boleh kurang dari umur minimal (${value} tahun)`);
            } else {
                form.clearErrors('job_eligibility_criteria.max_age');
            }
        }
    };

    const scoringWeights = {
        ...DEFAULT_SCORING_WEIGHTS,
        ...(form.data.job_eligibility_criteria?.scoring_weights ?? {}),
    };
    const scoringThresholds = {
        ...DEFAULT_SCORING_THRESHOLDS,
        ...(form.data.job_eligibility_criteria?.scoring_thresholds ?? {}),
    };
    const totalWeight: number = Object.values(scoringWeights).reduce<number>(
        (sum, value) => sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0),
        0,
    );

    const updateScoringWeight = (
        key: keyof NonNullable<EligibilityCriteria['scoring_weights']>,
        value: number | null,
    ) => {
        const normalizedValue = value == null ? null : Math.max(0, Math.min(100, value));
        form.setData((prev) => ({
            ...prev,
            job_eligibility_criteria: {
                ...prev.job_eligibility_criteria,
                scoring_weights: {
                    ...(prev.job_eligibility_criteria?.scoring_weights ?? {}),
                    [key]: normalizedValue,
                },
            },
        }));
    };

    const updateScoringThreshold = (
        key: keyof NonNullable<EligibilityCriteria['scoring_thresholds']>,
        value: number | null,
    ) => {
        const normalizedValue = value == null ? null : Math.max(0, Math.min(100, value));
        form.setData((prev) => ({
            ...prev,
            job_eligibility_criteria: {
                ...prev.job_eligibility_criteria,
                scoring_thresholds: {
                    ...(prev.job_eligibility_criteria?.scoring_thresholds ?? {}),
                    [key]: normalizedValue,
                },
            },
        }));
    };

    const validateRequirements = () => {
        // Filter out empty requirements
        const nonEmptyRequirements = form.data.job_requirements.filter(
            (requirement) => requirement && requirement.trim() !== ''
        );

        if (nonEmptyRequirements.length === 0) {
            form.setError('job_requirements', 'Mohon tambahkan minimal satu persyaratan.');
            window.alert('Mohon tambahkan minimal satu persyaratan sebelum menyimpan.');
            return false;
        }

        form.clearErrors('job_requirements');
        return true;
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        if (!validateRequirements()) {
            event.preventDefault();
            return;
        }

        onSubmit(event);
    };

    return (
        <Dialog open={Boolean(division)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl p-6">
                <DialogHeader>
                    <DialogTitle>Publikasikan Lowongan</DialogTitle>
                    <DialogDescription>
                        Lengkapi detail rekrutmen untuk divisi {division?.name}.
                    </DialogDescription>
                </DialogHeader>

                {division && (
                    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                        <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                                Kapasitas {division.current_staff}/{division.capacity}  Slot tersedia {division.available_slots}
                                {division.available_slots === 0 && (
                                    <span className="mt-1 block text-xs text-red-600">
                                        Tidak ada slot kosong. Tingkatkan kapasitas sebelum membuka lowongan.
                                    </span>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Divisi</Label>
                                    <Input value={division.name} disabled className="bg-muted/40" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Manager</Label>
                                    <Input value={division.manager_name ?? '-'} disabled className="bg-muted/40" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="job-title">Judul Lowongan</Label>
                                <Input
                                    id="job-title"
                                    value={form.data.job_title ?? ''}
                                    onChange={(e) => form.setData('job_title', e.target.value)}
                                    placeholder="Contoh: Marketing Specialist"
                                />
                                {form.errors.job_title && (
                                    <p className="text-xs text-destructive">{form.errors.job_title}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="job-description">Deskripsi Pekerjaan</Label>
                                <Textarea
                                    id="job-description"
                                    rows={4}
                                    value={form.data.job_description ?? ''}
                                    onChange={(e) => form.setData('job_description', e.target.value)}
                                    placeholder="Ceritakan tanggung jawab utama, ekspektasi, dan ruang lingkup pekerjaan."
                                />
                                {form.errors.job_description && (
                                    <p className="text-xs text-destructive">{form.errors.job_description}</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Persyaratan Kandidat</Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={addRequirement}
                                        disabled={form.data.job_requirements.length >= MAX_REQUIREMENTS}
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Tambah
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Maksimal {MAX_REQUIREMENTS} persyaratan kandidat.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Daftar persyaratan ini menjadi acuan utama perhitungan kecocokan skill kandidat.
                                </p>

                                <div className="space-y-3">
                                    {form.data.job_requirements.map((requirement, index) => (
                                        <div key={`req-${index}-${form.data.job_requirements.length}`} className="flex items-center gap-2">
                                            <Input
                                                value={requirement ?? ''}
                                                onChange={(e) => updateRequirement(index, e.target.value)}
                                                placeholder={`Persyaratan ${index + 1}`}
                                                required
                                            />
                                            {form.data.job_requirements.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeRequirement(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {form.errors.job_requirements && (
                                    <p className="text-xs text-destructive">{form.errors.job_requirements}</p>
                                )}
                            </div>

                            {/* Eligibility Criteria Section */}
                            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-amber-600" />
                                    <Label className="text-amber-900 font-semibold">Kriteria Kelayakan Otomatis</Label>
                                </div>
                                <p className="text-xs text-amber-700">
                                    Pelamar yang tidak memenuhi kriteria akan ditolak otomatis dengan notifikasi spesifik.
                                </p>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {/* Min Age */}
                                    <div className="space-y-2">
                                        <Label htmlFor="min-age" className="text-sm">Umur Minimal</Label>
                                        <Input
                                            id="min-age"
                                            type="number"
                                            min={17}
                                            max={65}
                                            value={form.data.job_eligibility_criteria?.min_age ?? ''}
                                            onChange={(e) => updateCriteria('min_age', e.target.value ? Number(e.target.value) : null)}
                                            placeholder="Contoh: 21"
                                        />
                                    </div>

                                    {/* Max Age */}
                                    <div className="space-y-2">
                                        <Label htmlFor="max-age" className="text-sm">Umur Maksimal</Label>
                                        <Input
                                            id="max-age"
                                            type="number"
                                            min={form.data.job_eligibility_criteria?.min_age ?? 17}
                                            max={65}
                                            value={form.data.job_eligibility_criteria?.max_age ?? ''}
                                            onChange={(e) => updateCriteria('max_age', e.target.value ? Number(e.target.value) : null)}
                                            placeholder="Contoh: 35"
                                            className={form.errors['job_eligibility_criteria.max_age'] ? 'border-red-500' : ''}
                                        />
                                        {form.errors['job_eligibility_criteria.max_age'] && (
                                            <p className="text-xs text-red-600">{form.errors['job_eligibility_criteria.max_age']}</p>
                                        )}
                                    </div>

                                    {/* Gender */}
                                    <div className="space-y-2">
                                        <Label htmlFor="gender" className="text-sm">Jenis Kelamin</Label>
                                        <Select
                                            value={form.data.job_eligibility_criteria?.gender ?? 'none'}
                                            onValueChange={(value) => updateCriteria('gender', value === 'none' ? null : value)}
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

                                    {/* Min Education */}
                                    <div className="space-y-2">
                                        <Label htmlFor="min-education" className="text-sm">Pendidikan Minimal</Label>
                                        <Select
                                            value={form.data.job_eligibility_criteria?.min_education ?? 'none'}
                                            onValueChange={(value) => updateCriteria('min_education', value === 'none' ? null : value)}
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

                                    {/* Preferred Study Programs */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="program-study-input" className="text-sm">Program Studi (Bisa Lebih dari 1)</Label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <AutocompleteInput
                                                    options={programOptions}
                                                    value={programStudyInput}
                                                    onValueChange={setProgramStudyInput}
                                                    onInputChange={(value) => {
                                                        setProgramStudyInput(value);
                                                        setProgramStudyQuery(value);
                                                    }}
                                                    placeholder="Ketik program studi..."
                                                    emptyText="Program studi tidak ditemukan"
                                                    allowCustomValue
                                                    disabled={normalizedProgramStudies.length >= MAX_PROGRAM_STUDIES}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={addProgramStudy}
                                                disabled={!programStudyInput.trim() || normalizedProgramStudies.length >= MAX_PROGRAM_STUDIES}
                                            >
                                                Tambah
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Sumber referensi: `education_reference_id.json`. Ketik minimal {MIN_SEARCH_CHARACTERS} karakter.
                                        </p>
                                        {programReferenceError && (
                                            <p className="text-xs text-amber-600">{programReferenceError}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Maksimal {MAX_PROGRAM_STUDIES} prodi. Kriteria ini dipakai untuk penyesuaian skor pendidikan, bukan auto-reject.
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
                                                            onClick={() => removeProgramStudy(program)}
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

                                    {/* Min Experience */}
                                    <div className="space-y-2">
                                        <Label htmlFor="min-experience" className="text-sm">Pengalaman Minimal (Tahun)</Label>
                                        <Input
                                            id="min-experience"
                                            type="number"
                                            min={0}
                                            max={40}
                                            value={form.data.job_eligibility_criteria?.min_experience_years ?? ''}
                                            onChange={(e) =>
                                                updateCriteria(
                                                    'min_experience_years',
                                                    e.target.value ? Number(e.target.value) : null,
                                                )
                                            }
                                            placeholder="Contoh: 2"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Scoring Profile Section */}
                            <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                                    <Label className="text-indigo-900 font-semibold">Konfigurasi Explainable Scoring</Label>
                                </div>
                                <p className="text-xs text-indigo-700">
                                    Atur bobot dan threshold rekomendasi per lowongan. Jika total bobot tidak 100, sistem akan menormalkan otomatis.
                                </p>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Bobot Pendidikan (%)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringWeights.education ?? ''}
                                            onChange={(e) => updateScoringWeight('education', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Bobot Pengalaman (%)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringWeights.experience ?? ''}
                                            onChange={(e) => updateScoringWeight('experience', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Bobot Skill Match (%)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringWeights.skills ?? ''}
                                            onChange={(e) => updateScoringWeight('skills', e.target.value ? Number(e.target.value) : null)}
                                        />
                                        <p className="text-xs text-slate-500">
                                            Bobot ini hanya menentukan kontribusi skor skill ke nilai total. Nilai skill dihitung dari jumlah requirement yang cocok dengan data `skills` pelamar.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Bobot Sertifikasi (%)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringWeights.certification ?? ''}
                                            onChange={(e) => updateScoringWeight('certification', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Bobot Kelengkapan Profil (%)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringWeights.profile ?? ''}
                                            onChange={(e) => updateScoringWeight('profile', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="rounded-lg border border-indigo-200 bg-white p-3">
                                        <p className="text-xs uppercase tracking-wide text-indigo-600">Total Bobot</p>
                                        <p className="mt-1 text-lg font-semibold text-indigo-900">{totalWeight.toFixed(1)}%</p>
                                        <p className="text-xs text-slate-500">
                                            {Math.abs(totalWeight - 100) < 0.5
                                                ? 'Sudah ideal.'
                                                : 'Akan dinormalisasi otomatis saat scoring.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Threshold Prioritas Tinggi</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringThresholds.priority ?? ''}
                                            onChange={(e) => updateScoringThreshold('priority', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Threshold Direkomendasikan</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringThresholds.recommended ?? ''}
                                            onChange={(e) => updateScoringThreshold('recommended', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Threshold Pertimbangkan</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={scoringThresholds.consider ?? ''}
                                            onChange={(e) => updateScoringThreshold('consider', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex justify-end gap-2 pt-2">
                            <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={onClose}>
                                Batalkan
                            </Button>
                            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={form.processing}>
                                Simpan Lowongan
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

