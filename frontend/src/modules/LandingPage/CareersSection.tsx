import AOS from 'aos';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Link } from '@/shared/lib/inertia';

import { ImageWithFallback } from './figma/ImageWithFallback';

type CareerJob = {
  division: string;
  title?: string | null;
  location?: string | null;
  type?: string | null;
  description?: string | null;
  isHiring: boolean;
  availableSlots?: number | null;
};

interface CareersSectionProps {
  jobs: CareerJob[];
}

export function CareersSection({ jobs }: CareersSectionProps) {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    });
  }, []);

  const availableJobs = jobs.filter((job) => {
    const hasSlots =
      typeof job.availableSlots === 'number' ? job.availableSlots > 0 : true;
    return job.isHiring && hasSlots;
  });
  const hasJobs = availableJobs.length > 0;

  return (
    <section id="careers" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
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

          <div data-aos="fade-left" className="relative">
            <div className="rounded-[28px] overflow-hidden shadow-[0_8px_32px_rgba(139,92,246,0.4)] border border-white/30 backdrop-blur-sm">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1748346918817-0b1b6b2f9bab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWFtfGVufDF8fHx8MTc2Mjg2NTQ2OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Tim Kami"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 to-cyan-500/20" />
            </div>
          </div>
        </div>

        {/* Job Listings */}
        {hasJobs ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableJobs.map((job, index) => {
              const canApply = job.isHiring;
              const title = canApply
                ? job.title ?? `Lowongan ${job.division}`
                : `Belum ada lowongan di ${job.division}`;
              const location = job.location ?? job.division;
              const type = job.type ?? 'Full-time';
              const slots =
                typeof job.availableSlots === 'number' && job.availableSlots > 0
                  ? `${job.availableSlots} posisi tersedia`
                  : null;

              return (
                <div
                  key={`${job.division}-${index}`}
                  data-aos="fade-up"
                  data-aos-delay={index * 50}
                  className={`relative group bg-white/15 backdrop-blur-[30px] border border-white/30 rounded-[24px] p-6 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(34,211,238,0.4)] hover:border-cyan-400/50 ${canApply ? 'hover:-translate-y-1 cursor-pointer' : 'opacity-95'
                    }`}
                >
                  {canApply && (
                    <Link
                      href={route('login')}
                      aria-label={`Lamar posisi ${title}`}
                      className="absolute inset-0 z-10"
                    />
                  )}
                  <div className="relative z-0 space-y-4">
                    {/* Division Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm border border-cyan-400/40">
                      <span>{job.division}</span>
                      {slots && <span className="text-xs text-cyan-200">{slots}</span>}
                    </div>

                    {/* Job Title */}
                    <div>
                      <h3 className="text-xl text-white mb-2 group-hover:text-cyan-300 transition-colors">
                        {title}
                      </h3>
                      {job.description && job.isHiring && (
                        <p className="text-sm text-white/70 line-clamp-3">{job.description}</p>
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/80">
                        <MapPin className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm">{location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm">{type}</span>
                      </div>
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



