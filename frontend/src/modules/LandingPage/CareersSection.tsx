import { MapPin, Clock, ArrowRight, Users, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { markLandingSplashSkipOnce } from '@/shared/lib/landing-splash';

import { ImageWithFallback } from './figma/ImageWithFallback';

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
  requirements?: string[];
  eligibility_criteria?: Record<string, unknown> | null;
  hiring_opened_at?: string | null;
  isHiring: boolean;
  availableSlots?: number | null;
};

interface CareersSectionProps {
  jobs: CareerJob[];
}

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

export function CareersSection({ jobs }: CareersSectionProps) {
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
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center mb-12 md:mb-16">
          <div data-aos="fade-right">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              Bergabung dengan <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Tim Kami</span>
            </h2>
            <p className="text-lg sm:text-xl text-white/80 mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              Jelajahi lowongan pekerjaan saat ini dan kembangkan karir Anda bersama kami.
            </p>
            <p className="text-white/80">
              Kami membangun masa depan konektivitas. Bergabunglah dengan tim profesional yang bersemangat
              untuk membawa internet berkecepatan tinggi ke semua orang.
            </p>
          </div>

          <div data-aos="fade-left" className="relative mx-auto w-full max-w-[32rem] lg:max-w-none">
            <div className="overflow-hidden rounded-[28px] border border-white/30 shadow-[0_8px_32px_rgba(139,92,246,0.4)] backdrop-blur-sm">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1748346918817-0b1b6b2f9bab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWFtfGVufDF8fHx8MTc2Mjg2NTQ2OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Tim Kami"
                className="h-auto w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 to-cyan-500/20" />
            </div>
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

              return (
                <div
                  key={`${job.id ?? job.division}-${index}`}
                  data-aos="fade-up"
                  data-aos-delay={index * 50}
                  className={`relative group bg-white/15 backdrop-blur-[30px] border border-white/30 rounded-[24px] p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(34,211,238,0.4)] hover:border-cyan-400/50 ${canApply ? 'hover:-translate-y-1 cursor-pointer' : 'opacity-95'
                    }`}
                >
                  {canApply && (
                    <Link
                      href="/login"
                      onClick={handleApplyNavigate}
                      aria-label={`Lamar posisi ${title}`}
                      className="absolute inset-0 z-10"
                    />
                  )}
                  <div className="relative z-0 space-y-4">
                    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-3 py-1 text-sm text-cyan-300">
                      <span className="break-words">{job.division}</span>
                      {slots && <span className="text-xs text-cyan-200 break-words">{slots}</span>}
                    </div>

                    <div>
                      <h3 className="text-xl text-white mb-2 group-hover:text-cyan-300 transition-colors">
                        {title}
                      </h3>
                      {job.description && job.isHiring && (
                        <p className="text-sm text-white/70 line-clamp-4">{job.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm">{location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm">{type}</span>
                      </div>
                      {teamCapacityText && (
                        <div className="flex items-center gap-2 text-white/80">
                          <Users className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm">{teamCapacityText}</span>
                        </div>
                      )}
                      {openedAt && (
                        <p className="text-xs text-white/60">Dipublikasikan: {openedAt}</p>
                      )}
                    </div>

                    {requirements.length > 0 && (
                      <div className="space-y-2 rounded-xl border border-cyan-400/20 bg-black/20 p-3">
                        <p className="flex items-center gap-2 text-sm text-cyan-200">
                          <ListChecks className="h-4 w-4" />
                          Persyaratan Kandidat
                        </p>
                        <div className="space-y-1">
                          {requirements.map((requirement, requirementIndex) => (
                            <p key={`${job.id ?? job.division}-req-${requirementIndex}`} className="break-words text-xs text-white/75">
                              {requirementIndex + 1}. {requirement}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 rounded-xl border border-cyan-400/20 bg-black/20 p-3">
                      <p className="text-sm text-cyan-200">Kriteria Kelayakan</p>
                      <div className="flex flex-wrap gap-2">
                        {ageRangeText && (
                          <span className="max-w-full break-words rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/80">
                            Umur: {ageRangeText}
                          </span>
                        )}
                        {gender && (
                          <span className="max-w-full break-words rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/80">
                            Gender: {gender}
                          </span>
                        )}
                        {minEducation && (
                          <span className="max-w-full break-words rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/80">
                            Min Pendidikan: {minEducation}
                          </span>
                        )}
                        {minExperience !== null && (
                          <span className="max-w-full break-words rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/80">
                            Min Pengalaman: {minExperience} tahun
                          </span>
                        )}
                        {programStudiesText && (
                          <span className="max-w-full break-words rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                            Prodi: {programStudiesText}
                          </span>
                        )}
                      </div>
                      {additionalCriteriaEntries.length > 0 && (
                        <div className="space-y-1 border-t border-white/10 pt-2">
                          {additionalCriteriaEntries.map(([key, value]) => (
                            <p key={`${job.id ?? job.division}-criteria-${key}`} className="break-words text-[11px] text-white/65">
                              {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-center justify-between text-sm font-medium ${canApply ? 'text-cyan-300' : 'text-white/50'
                        }`}
                    >
                      <span>{canApply ? 'Klik untuk melamar' : 'Belum membuka lowongan'}</span>
                      {canApply && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-cyan-400/40 bg-white/5 p-8 text-center">
            <p className="text-cyan-300 font-medium">Belum ada data lowongan ditampilkan saat ini.</p>
            <p className="text-sm text-white/70 mt-2">
              Pantau halaman ini secara berkala untuk mengetahui pembukaan rekrutmen terbaru.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

