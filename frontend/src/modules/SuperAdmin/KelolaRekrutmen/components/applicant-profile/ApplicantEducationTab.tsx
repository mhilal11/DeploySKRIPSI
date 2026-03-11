import { GraduationCap } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

import { ApplicantEducation } from '../../types';

interface ApplicantEducationTabProps {
  educations: ApplicantEducation[];
  legacyEducation?: string | null;
}

export function ApplicantEducationTab({
  educations,
  legacyEducation,
}: ApplicantEducationTabProps) {
  return (
    <Card className="border-0 shadow-md">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-blue-900" />
          </div>
          <h3 className="text-blue-900">Riwayat Pendidikan</h3>
        </div>
        {educations.length > 0 ? (
          <div className="grid gap-4">
            {educations.map((education, index) => (
              <div
                key={`${education.institution ?? 'edu'}-${index}`}
                className="p-5 border-2 border-gray-100 rounded-xl bg-gradient-to-r from-white to-gray-50"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-3 rounded-xl shadow-md flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-gray-900 font-medium">
                      {education.institution || 'Institusi tidak tersedia'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {[education.degree, education.field_of_study]
                        .filter(Boolean)
                        .join('  ') || 'Program tidak tersedia'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[education.start_year, education.end_year]
                        .filter(Boolean)
                        .join(' - ') || 'Tahun tidak tersedia'}
                    </p>
                    {education.gpa && (
                      <p className="text-xs text-gray-500">IPK: {education.gpa}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : legacyEducation ? (
          <div className="p-5 border-2 border-gray-100 rounded-xl bg-gradient-to-r from-white to-gray-50">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-3 rounded-xl shadow-md flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">{legacyEducation}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Informasi pendidikan tidak tersedia</p>
        )}
      </div>
    </Card>
  );
}
