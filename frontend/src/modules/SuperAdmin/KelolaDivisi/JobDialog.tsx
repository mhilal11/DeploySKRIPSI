import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { EligibilityCriteriaSection } from '@/modules/SuperAdmin/KelolaDivisi/components/job-dialog/EligibilityCriteriaSection';
import { ScoringConfigSection } from '@/modules/SuperAdmin/KelolaDivisi/components/job-dialog/ScoringConfigSection';
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
const MIN_JOB_SALARY = 500000;
const WORK_MODE_OPTIONS = ['WFO', 'WFA', 'Fleksibel'] as const;

const DEFAULT_SCORING_WEIGHTS = {
    education: 25,
    experience: 25,
    certification: 10,
    profile: 5,
    ai_screening: 35,
} as const;

const DEFAULT_SCORING_THRESHOLDS = {
    priority: 85,
    recommended: 70,
    consider: 55,
} as const;

function normalizeScoreValue(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export type JobFormFields = {
    job_id?: number | null;
    job_title: string;
    job_description: string;
    job_salary_min: string | number;
    job_work_mode: string;
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
        education: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_weights?.education,
            DEFAULT_SCORING_WEIGHTS.education,
        ),
        experience: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_weights?.experience,
            DEFAULT_SCORING_WEIGHTS.experience,
        ),
        certification: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_weights?.certification,
            DEFAULT_SCORING_WEIGHTS.certification,
        ),
        profile: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_weights?.profile,
            DEFAULT_SCORING_WEIGHTS.profile,
        ),
        ai_screening: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_weights?.ai_screening,
            DEFAULT_SCORING_WEIGHTS.ai_screening,
        ),
    };
    const scoringThresholds = {
        priority: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_thresholds?.priority,
            DEFAULT_SCORING_THRESHOLDS.priority,
        ),
        recommended: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_thresholds?.recommended,
            DEFAULT_SCORING_THRESHOLDS.recommended,
        ),
        consider: normalizeScoreValue(
            form.data.job_eligibility_criteria?.scoring_thresholds?.consider,
            DEFAULT_SCORING_THRESHOLDS.consider,
        ),
    };
    const totalWeight: number = [
        scoringWeights.education,
        scoringWeights.experience,
        scoringWeights.certification,
        scoringWeights.profile,
        scoringWeights.ai_screening,
    ].reduce<number>(
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
        const salaryValue = Number(String(form.data.job_salary_min).replace(/\D/g, ''));
        if (!Number.isFinite(salaryValue) || salaryValue < MIN_JOB_SALARY) {
            form.setError('job_salary_min', 'Gaji minimal Rp 500.000.');
            window.alert('Gaji minimal Rp 500.000.');
            return false;
        }
        form.clearErrors('job_salary_min');

        if (!WORK_MODE_OPTIONS.includes(form.data.job_work_mode as typeof WORK_MODE_OPTIONS[number])) {
            form.setError('job_work_mode', 'Pilih mode kerja WFO, WFA, atau Fleksibel.');
            window.alert('Pilih mode kerja sebelum menyimpan.');
            return false;
        }
        form.clearErrors('job_work_mode');

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
            <DialogContent className="flex max-h-[90vh] w-[96vw] flex-col overflow-hidden border-0 bg-white p-0 sm:w-full sm:max-w-2xl">
                <DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 px-4 py-4 sm:px-6">
                    <DialogTitle>{form.data.job_id ? 'Edit Lowongan' : 'Publikasikan Lowongan'}</DialogTitle>
                    <DialogDescription>
                        Lengkapi detail rekrutmen untuk divisi {division?.name}.
                    </DialogDescription>
                </DialogHeader>

                {division && (
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 pr-3 sm:px-6 sm:py-5 sm:pr-4">
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

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="job-salary">Gaji Minimum</Label>
                                    <div className="flex overflow-hidden rounded-md border border-input bg-white focus-within:ring-2 focus-within:ring-ring/50">
                                        <span className="inline-flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                                            Rp
                                        </span>
                                        <Input
                                            id="job-salary"
                                            type="number"
                                            min={MIN_JOB_SALARY}
                                            step={50000}
                                            value={form.data.job_salary_min ?? ''}
                                            onChange={(event) => {
                                                form.setData('job_salary_min', event.target.value);
                                                form.clearErrors('job_salary_min');
                                            }}
                                            placeholder="500000"
                                            className="border-0 focus-visible:ring-0"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Minimal Rp 500.000.</p>
                                    {form.errors.job_salary_min && (
                                        <p className="text-xs text-destructive">{form.errors.job_salary_min}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Mode Kerja</Label>
                                    <Select
                                        value={form.data.job_work_mode ?? ''}
                                        onValueChange={(value) => {
                                            form.setData('job_work_mode', value);
                                            form.clearErrors('job_work_mode');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih mode kerja" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WORK_MODE_OPTIONS.map((mode) => (
                                                <SelectItem key={mode} value={mode}>
                                                    {mode === 'Fleksibel' ? 'Fleksibel (WFA/WFO)' : mode}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.job_work_mode && (
                                        <p className="text-xs text-destructive">{form.errors.job_work_mode}</p>
                                    )}
                                </div>
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

                            <EligibilityCriteriaSection
                                criteria={form.data.job_eligibility_criteria}
                                normalizedProgramStudies={normalizedProgramStudies}
                                programStudyInput={programStudyInput}
                                programOptions={programOptions}
                                programReferenceError={programReferenceError}
                                minSearchCharacters={MIN_SEARCH_CHARACTERS}
                                maxProgramStudies={MAX_PROGRAM_STUDIES}
                                maxAgeError={form.errors['job_eligibility_criteria.max_age']}
                                onProgramStudyInputChange={setProgramStudyInput}
                                onProgramStudyQueryChange={setProgramStudyQuery}
                                onAddProgramStudy={addProgramStudy}
                                onRemoveProgramStudy={removeProgramStudy}
                                onUpdateCriteria={updateCriteria}
                            />

                            <ScoringConfigSection
                                scoringWeights={scoringWeights}
                                scoringThresholds={scoringThresholds}
                                totalWeight={totalWeight}
                                onUpdateScoringWeight={updateScoringWeight}
                                onUpdateScoringThreshold={updateScoringThreshold}
                            />
                        </div>

                        <DialogFooter className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
                            <Button type="button" className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto" onClick={onClose}>
                                Batalkan
                            </Button>
                            <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto" disabled={form.processing}>
                                Simpan Lowongan
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

