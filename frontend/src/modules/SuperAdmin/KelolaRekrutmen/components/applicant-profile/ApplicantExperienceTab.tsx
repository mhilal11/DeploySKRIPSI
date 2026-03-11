import { Briefcase } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

import { ApplicantExperience } from '../../types';

interface ApplicantExperienceTabProps {
  experiences: ApplicantExperience[];
  legacyExperience?: string | null;
}

export function ApplicantExperienceTab({
  experiences,
  legacyExperience,
}: ApplicantExperienceTabProps) {
  return (
    <Card className="border-0 shadow-md">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-green-700" />
          </div>
          <h3 className="text-blue-900">Pengalaman Kerja</h3>
        </div>
        {experiences.length > 0 ? (
          <div className="grid gap-4">
            {experiences.map((experience, index) => (
              <div
                key={`${experience.company ?? 'exp'}-${index}`}
                className="p-5 border-2 border-gray-100 rounded-xl bg-gradient-to-r from-white to-green-50/30"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-green-600 to-green-500 p-3 rounded-xl shadow-md flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-gray-900 font-medium">
                      {experience.position || 'Posisi tidak tersedia'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {experience.company || 'Perusahaan tidak tersedia'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[experience.start_date, experience.end_date]
                        .filter(Boolean)
                        .join(' - ') || 'Periode tidak tersedia'}
                    </p>
                    {experience.description && (
                      <p className="text-xs text-gray-500">{experience.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : legacyExperience ? (
          <div className="p-5 border-2 border-gray-100 rounded-xl bg-gradient-to-r from-white to-green-50/30">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-green-600 to-green-500 p-3 rounded-xl shadow-md flex-shrink-0">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">{legacyExperience}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Pelamar belum menambahkan data pengalaman kerja
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
