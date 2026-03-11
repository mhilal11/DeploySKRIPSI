import { User } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

import { ApplicantStatusBadge } from './ApplicantStatusBadge';
import { ApplicantRecord } from '../../types';

interface ApplicantPersonalTabProps {
  applicant: ApplicantRecord;
  profileName: string;
  profileEmail: string;
  profilePhone?: string | null;
  profileAddress?: string | null;
  profileCity?: string | null;
  profileProvince?: string | null;
  profileGender?: string | null;
  profileReligion?: string | null;
  profileBirthDate?: string | null;
  isRejected: boolean;
}

export function ApplicantPersonalTab({
  applicant,
  profileName,
  profileEmail,
  profilePhone,
  profileAddress,
  profileCity,
  profileProvince,
  profileGender,
  profileReligion,
  profileBirthDate,
  isRejected,
}: ApplicantPersonalTabProps) {
  return (
    <Card className="border-0 shadow-md">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-900" />
          </div>
          <h3 className="text-blue-900">Informasi Pribadi</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Nama Lengkap</p>
            <p className="text-gray-900">{profileName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-gray-900">{profileEmail}</p>
          </div>
          {profilePhone && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Nomor Telepon</p>
              <p className="text-gray-900">{profilePhone}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Posisi yang Dilamar</p>
            <p className="text-gray-900">{applicant.position}</p>
          </div>
          {profileGender && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Jenis Kelamin</p>
              <p className="text-gray-900">{profileGender}</p>
            </div>
          )}
          {profileReligion && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Agama</p>
              <p className="text-gray-900">{profileReligion}</p>
            </div>
          )}
          {profileBirthDate && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Tanggal Lahir</p>
              <p className="text-gray-900">{profileBirthDate}</p>
            </div>
          )}
          {applicant.date && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Tanggal Melamar</p>
              <p className="text-gray-900">{applicant.date}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Status Lamaran</p>
            <div>
              <ApplicantStatusBadge status={applicant.status} />
            </div>
          </div>
          {isRejected && applicant.rejection_reason && (
            <div className="space-y-2 md:col-span-2 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Catatan Penolakan
              </p>
              <p className="text-sm text-red-800 leading-relaxed">
                {applicant.rejection_reason}
              </p>
            </div>
          )}
          {profileAddress && (
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs text-gray-500">Alamat</p>
              <p className="text-gray-900">{profileAddress}</p>
              <p className="text-sm text-gray-600">
                {[profileCity, profileProvince].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
