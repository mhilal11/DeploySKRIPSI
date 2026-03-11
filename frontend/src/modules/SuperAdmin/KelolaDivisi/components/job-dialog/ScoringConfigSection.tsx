import { SlidersHorizontal } from 'lucide-react';

import type { EligibilityCriteria } from '@/modules/SuperAdmin/KelolaDivisi/types';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';


type ScoringConfigSectionProps = {
    scoringWeights: {
        education: number;
        experience: number;
        certification: number;
        profile: number;
        ai_screening: number;
    };
    scoringThresholds: {
        priority: number;
        recommended: number;
        consider: number;
    };
    totalWeight: number;
    onUpdateScoringWeight: (
        key: keyof NonNullable<EligibilityCriteria['scoring_weights']>,
        value: number | null,
    ) => void;
    onUpdateScoringThreshold: (
        key: keyof NonNullable<EligibilityCriteria['scoring_thresholds']>,
        value: number | null,
    ) => void;
};

export function ScoringConfigSection({
    scoringWeights,
    scoringThresholds,
    totalWeight,
    onUpdateScoringWeight,
    onUpdateScoringThreshold,
}: ScoringConfigSectionProps) {
    return (
        <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                <Label className="font-semibold text-indigo-900">Konfigurasi Explainable Scoring</Label>
            </div>
            <p className="text-xs text-indigo-700">
                Atur bobot dan threshold rekomendasi per lowongan. Jika total bobot tidak 100, sistem
                akan menormalkan otomatis. Kecocokan skill tetap ditampilkan sebagai informasi, tetapi
                tidak dihitung ke skor total.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-sm">Bobot Pendidikan (%)</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoringWeights.education ?? ''}
                        onChange={(event) =>
                            onUpdateScoringWeight(
                                'education',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm">Bobot Pengalaman (%)</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoringWeights.experience ?? ''}
                        onChange={(event) =>
                            onUpdateScoringWeight(
                                'experience',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm">Bobot Sertifikasi (%)</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoringWeights.certification ?? ''}
                        onChange={(event) =>
                            onUpdateScoringWeight(
                                'certification',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm">Bobot Kelengkapan Profil (%)</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoringWeights.profile ?? ''}
                        onChange={(event) =>
                            onUpdateScoringWeight(
                                'profile',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm">Bobot AI CV Screening (%)</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoringWeights.ai_screening ?? ''}
                        onChange={(event) =>
                            onUpdateScoringWeight(
                                'ai_screening',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                    <p className="text-xs text-slate-500">
                        Mengatur pengaruh skor AI terhadap total nilai kandidat.
                    </p>
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
                        onChange={(event) =>
                            onUpdateScoringThreshold(
                                'priority',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm">Threshold Direkomendasikan</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoringThresholds.recommended ?? ''}
                        onChange={(event) =>
                            onUpdateScoringThreshold(
                                'recommended',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm">Threshold Pertimbangkan</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoringThresholds.consider ?? ''}
                        onChange={(event) =>
                            onUpdateScoringThreshold(
                                'consider',
                                event.target.value ? Number(event.target.value) : null,
                            )
                        }
                    />
                </div>
            </div>
        </div>
    );
}
