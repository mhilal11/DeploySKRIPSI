import { Calendar, CheckCircle, Mail, Phone, User } from 'lucide-react';
import Image from 'next/image';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

import { ApplicantStatusBadge } from './ApplicantStatusBadge';
import { ApplicantRecord } from '../../types';

interface ApplicantProfileHeaderProps {
  applicant: ApplicantRecord;
  profileName: string;
  profileEmail: string;
  profilePhone?: string | null;
  profilePhotoUrl?: string | null;
  scoreValue?: number;
  scoreBadgeClassName: string;
  rankingLabel?: string | null;
}

export function ApplicantProfileHeader({
  applicant,
  profileName,
  profileEmail,
  profilePhone,
  profilePhotoUrl,
  scoreValue,
  scoreBadgeClassName,
  rankingLabel,
}: ApplicantProfileHeaderProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 h-32"></div>
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16 relative">
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
              {profilePhotoUrl ? (
                <Image
                  src={profilePhotoUrl}
                  alt={applicant.name}
                  width={128}
                  height={128}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-white" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 mt-4 sm:mt-0">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-3">
                <div>
                  <h2 className="text-gray-900 mb-1">{profileName}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-900 hover:bg-blue-800">
                    ID: APL{String(applicant.id).padStart(3, '0')}
                  </Badge>
                  <ApplicantStatusBadge status={applicant.status} />
                  <Badge variant="outline" className="border-gray-400 text-gray-700">
                    {applicant.position}
                  </Badge>
                  {typeof scoreValue === 'number' && (
                    <Badge variant="outline" className={scoreBadgeClassName}>
                      Skor {scoreValue.toFixed(1)}
                    </Badge>
                  )}
                  {rankingLabel && (
                    <Badge variant="outline" className="border-indigo-400 text-indigo-700">
                      Rank {rankingLabel}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5 hover:text-blue-900 transition-colors">
                    <Mail className="w-4 h-4" />
                    <span>{profileEmail}</span>
                  </div>
                  {profilePhone && (
                    <div className="flex items-center gap-1.5 hover:text-blue-900 transition-colors">
                      <Phone className="w-4 h-4" />
                      <span>{profilePhone}</span>
                    </div>
                  )}
                  {applicant.date && (
                    <div className="flex items-center gap-1.5 hover:text-blue-900 transition-colors">
                      <Calendar className="w-4 h-4" />
                      <span>{applicant.date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
