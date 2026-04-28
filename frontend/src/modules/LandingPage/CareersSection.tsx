import {
  ArrowRight,
  Clock,
  Info,
  ListChecks,
  MapPin,
  Banknote,
  MapPinned,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { markLandingSplashSkipOnce } from '@/shared/lib/landing-splash';


type CareerJob = {
  id?: number;
  division: string;
  division_description?: string | null;
  manager_name?: string | null;
  capacity?: number | null;
  current_staff?: number | null;
  title?: string | null;
  location?: string | null;
  type?: string | null;
  description?: string | null;
  salary_min?: number | null;
  work_mode?: string | null;
  requirements?: string[];
  eligibility_criteria?: Record<string, unknown> | null;
  hiring_opened_at?: string | null;
  isHiring: boolean;
  availableSlots?: number | null;
};

interface CareersSectionProps {
  jobs: CareerJob[];
}

type JobDetailModalState = {
  title: string;
  requirements: string[];
  ageRangeText: string | null;
  gender: string | null;
  minEducation: string | null;
  minExperience: number | null;
  salaryText: string | null;
  workMode: string | null;
  programStudiesText: string | null;
  additionalCriteriaEntries: Array<[string, unknown]>;
};

const EDUCATION_LABELS: Record<string, string> = {
  sma: 'SMA/SMK',
  smk: 'SMA/SMK',
  d3: 'D3',
  d4: 'D4',
  s1: 'S1',
  s2: 'S2',
  s3: 'S3',
};

const KNOWN_CRITERIA_KEYS = new Set([
  'min_age',
  'max_age',
  'gender',
  'min_education',
  'min_experience_years',
  'program_studies',
  'scoring_weights',
  'scoring_thresholds',
  'ineligible_penalty_per_failure',
]);

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item !== '');
};

const formatGender = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'male') return 'Laki-laki';
  if (normalized === 'female') return 'Perempuan';
  if (normalized === 'none' || normalized === 'any') return null;
  return value;
};

const formatEducation = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return EDUCATION_LABELS[normalized] ?? value.toUpperCase();
};

const formatDateIndo = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatRupiah = (value?: number | null): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
};

export function CareersSection({ jobs }: CareersSectionProps) {
  const [selectedJobDetail, setSelectedJobDetail] =
    useState<JobDetailModalState | null>(null);

  useEffect(() => {
    void import('aos').then(({ default: AOS }) => {
      AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
      });
    });
  }, []);

  const handleApplyNavigate = () => {
    markLandingSplashSkipOnce();
  };

  const availableJobs = jobs.filter((job) => {
    const hasSlots =
      typeof job.availableSlots === 'number' ? job.availableSlots > 0 : true;
    return job.isHiring && hasSlots;
  });
  const hasJobs = availableJobs.length > 0;

  return (
    <section id="careers" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mx-auto mb-12 max-w-3xl text-center md:mb-16" data-aos="fade-up">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              Bergabung dengan <span className="text-[#2F6DB5]">Tim Kami</span>
            </h2>
            <p className="text-lg sm:text-xl text-white/80 mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              Jelajahi lowongan pekerjaan saat ini dan kembangkan karir Anda bersama kami.
            </p>
            <p className="text-white/80">
              Kami membangun masa depan konektivitas. Bergabunglah dengan tim profesional yang bersemangat
              untuk membawa internet berkecepatan tinggi ke semua orang.
            </p>
          </div>

        </div>

        {hasJobs ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableJobs.map((job, index) => {
              const canApply = job.isHiring;
              const title = canApply
                ? job.title ?? `Lowongan ${job.division}`
                : `Belum ada lowongan di ${job.division}`;
              const location = job.location ?? job.division;
              const type = job.type ?? 'Full-time';
              const salaryText = formatRupiah(job.salary_min);
              const workMode = asString(job.work_mode);
              const requirements = Array.isArray(job.requirements)
                ? job.requirements.filter((req) => req && req.trim() !== '')
                : [];

              const criteria = (job.eligibility_criteria ?? {}) as Record<string, unknown>;
              const minAge = asNumber(criteria.min_age);
              const maxAge = asNumber(criteria.max_age);
              const ageRangeText =
                minAge !== null && maxAge !== null
                  ? `${minAge}-${maxAge}`
                  : minAge !== null
                    ? `>= ${minAge}`
                    : maxAge !== null
                      ? `<= ${maxAge}`
                      : null;
              const minExperience = asNumber(criteria.min_experience_years);
              const gender = formatGender(asString(criteria.gender));
              const minEducation = formatEducation(asString(criteria.min_education));
              const programStudies = asStringArray(criteria.program_studies);
              const programStudiesText =
                programStudies.length > 0 ? programStudies.join(', ') : null;
              const openedAt = formatDateIndo(job.hiring_opened_at);

              const additionalCriteriaEntries = Object.entries(criteria).filter(([key, value]) => {
                if (KNOWN_CRITERIA_KEYS.has(key)) return false;
                if (value == null) return false;
                if (typeof value === 'string' && value.trim() === '') return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0) return false;
                return true;
              });

              const slots =
                typeof job.availableSlots === 'number' && job.availableSlots > 0
                  ? `${job.availableSlots} posisi tersedia`
                  : null;
              const teamCapacityText =
                typeof job.current_staff === 'number' && typeof job.capacity === 'number'
                  ? `${job.current_staff}/${job.capacity} posisi terisi`
                  : null;
              const hasCriteriaSummary =
                ageRangeText !== null ||
                gender !== null ||
                minEducation !== null ||
                minExperience !== null ||
                programStudiesText !== null ||
                additionalCriteriaEntries.length > 0;
              const hasDetailSections = requirements.length > 0 || hasCriteriaSummary;

              return (
                <div
                  key={`${job.id ?? job.division}-${index}`}
                  data-aos="fade-up"
                  data-aos-delay={index * 50}
                  className={`relative group bg-white/15 backdrop-blur-[30px] border border-white/30 rounded-[24px] p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(47,109,181,0.28)] hover:border-[#2F6DB5]/50 ${canApply ? 'hover:-translate-y-1' : 'opacity-95'
                    }`}
                >
                  <div className="space-y-4">
                    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-[#2F6DB5]/40 bg-[#0F4C81]/20 px-3 py-1 text-sm text-[#7DB6F5]">
                      <span className="break-words">{job.division}</span>
                      {slots && <span className="text-xs text-[#A9D0FF] break-words">{slots}</span>}
                    </div>

                    <div>
                      <h3 className="text-xl text-white mb-2 group-hover:text-[#7DB6F5] transition-colors">
                        {title}
                      </h3>
                      {job.description && job.isHiring && (
                        <p className="text-sm text-white/70 line-clamp-4">{job.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="w-4 h-4 text-[#4A90D9]" />
                        <span className="text-sm">{location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Clock className="w-4 h-4 text-[#4A90D9]" />
                        <span className="text-sm">{type}</span>
                      </div>
                      {teamCapacityText && (
                        <div className="flex items-center gap-2 text-white/80">
                          <Users className="w-4 h-4 text-[#4A90D9]" />
                          <span className="text-sm">{teamCapacityText}</span>
                        </div>
                      )}
                      {salaryText && (
                        <div className="flex items-center gap-2 text-white/80">
                          <Banknote className="w-4 h-4 text-[#4A90D9]" />
                          <span className="text-sm">{salaryText}</span>
                        </div>
                      )}
                      {workMode && (
                        <div className="flex items-center gap-2 text-white/80">
                          <MapPinned className="w-4 h-4 text-[#4A90D9]" />
                          <span className="text-sm">{workMode}</span>
                        </div>
                      )}
                      {openedAt && (
                        <p className="text-xs text-white/60">Dipublikasikan: {openedAt}</p>
                      )}
                    </div>

                    {hasDetailSections && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setSelectedJobDetail({
                            title,
                            requirements,
                            ageRangeText,
                            gender,
                            minEducation,
                            minExperience,
                            salaryText,
                            workMode,
                            programStudiesText,
                            additionalCriteriaEntries,
                          })
                        }
                        className="flex h-auto w-full items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left text-white hover:bg-white/5 hover:text-[#A9D0FF]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2F6DB5]/30 bg-[#0F4C81]/10 text-[#7DB6F5]">
                            <Info className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                              Lihat persyaratan &amp; kriteria
                            </p>
                            <p className="text-xs text-white/60">
                              Buka popup detail lowongan
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-[#7DB6F5]">
                          Lihat detail
                        </span>
                      </Button>
                    )}

                    {canApply ? (
                      <Link
                        href="/login"
                        onClick={handleApplyNavigate}
                        aria-label={`Lamar posisi ${title}`}
                        className="flex items-center justify-between text-sm font-medium text-[#7DB6F5] transition-colors hover:text-[#A9D0FF]"
                      >
                        <span>Klik untuk melamar</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between text-sm font-medium text-white/50">
                        <span>Belum membuka lowongan</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#2F6DB5]/40 bg-white/5 p-8 text-center">
            <p className="text-[#7DB6F5] font-medium">Belum ada data lowongan ditampilkan saat ini.</p>
            <p className="text-sm text-white/70 mt-2">
              Pantau halaman ini secara berkala untuk mengetahui pembukaan rekrutmen terbaru.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={selectedJobDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJobDetail(null);
          }
        }}
      >
          <DialogContent className="max-h-[90vh] overflow-hidden border border-slate-800 bg-[#0f172a] p-0 text-white sm:max-w-2xl">
          <DialogHeader className="border-b border-white/10 bg-[#0F4C81]/12 px-6 py-5 pr-14">
            <DialogTitle className="text-xl text-white">
              {selectedJobDetail?.title ?? 'Detail Lowongan'}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/70">
              Persyaratan kandidat dan kriteria kelayakan untuk posisi ini.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-5.5rem)] space-y-4 overflow-y-auto px-6 py-5">
            {selectedJobDetail && selectedJobDetail.requirements.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-[#2F6DB5]/20 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-[#A9D0FF]">
                  <ListChecks className="h-4 w-4" />
                  Persyaratan Kandidat
                </p>
                <div className="space-y-2">
                  {selectedJobDetail.requirements.map((requirement, requirementIndex) => (
                    <p
                      key={`modal-req-${requirementIndex}`}
                      className="break-words text-sm text-white/80"
                    >
                      {requirementIndex + 1}. {requirement}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-[#2F6DB5]/20 bg-white/5 p-4">
              <p className="text-sm font-medium text-[#A9D0FF]">Kriteria Kelayakan</p>
              <div className="flex flex-wrap gap-2">
                {selectedJobDetail?.ageRangeText && (
                  <span className="max-w-full break-words rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80">
                    Umur: {selectedJobDetail.ageRangeText}
                  </span>
                )}
                {selectedJobDetail?.gender && (
                  <span className="max-w-full break-words rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80">
                    Gender: {selectedJobDetail.gender}
                  </span>
                )}
                {selectedJobDetail?.minEducation && (
                  <span className="max-w-full break-words rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80">
                    Min Pendidikan: {selectedJobDetail.minEducation}
                  </span>
                )}
                {selectedJobDetail?.minExperience !== null &&
                  selectedJobDetail?.minExperience !== undefined && (
                    <span className="max-w-full break-words rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80">
                      Min Pengalaman: {selectedJobDetail.minExperience} tahun
                    </span>
                  )}
                {selectedJobDetail?.salaryText && (
                  <span className="max-w-full break-words rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80">
                    Gaji: {selectedJobDetail.salaryText}
                  </span>
                )}
                {selectedJobDetail?.workMode && (
                  <span className="max-w-full break-words rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80">
                    Mode Kerja: {selectedJobDetail.workMode}
                  </span>
                )}
                {selectedJobDetail?.programStudiesText && (
                  <span className="max-w-full break-words rounded-full border border-[#2F6DB5]/30 bg-[#0F4C81]/10 px-3 py-1.5 text-xs text-[#A9D0FF]">
                    Prodi: {selectedJobDetail.programStudiesText}
                  </span>
                )}
              </div>

              {selectedJobDetail &&
                selectedJobDetail.additionalCriteriaEntries.length > 0 && (
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    {selectedJobDetail.additionalCriteriaEntries.map(([key, value]) => (
                      <p
                        key={`modal-criteria-${key}`}
                        className="break-words text-xs text-white/65"
                      >
                        {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                      </p>
                    ))}
                  </div>
                )}

              {selectedJobDetail &&
                selectedJobDetail.ageRangeText === null &&
                selectedJobDetail.gender === null &&
                selectedJobDetail.minEducation === null &&
                selectedJobDetail.minExperience === null &&
                selectedJobDetail.salaryText === null &&
                selectedJobDetail.workMode === null &&
                selectedJobDetail.programStudiesText === null &&
                selectedJobDetail.additionalCriteriaEntries.length === 0 && (
                  <p className="text-sm text-white/60">
                    Tidak ada kriteria kelayakan tambahan untuk lowongan ini.
                  </p>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

