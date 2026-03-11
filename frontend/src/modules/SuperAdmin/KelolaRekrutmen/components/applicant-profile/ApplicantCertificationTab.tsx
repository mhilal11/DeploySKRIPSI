import { Award, Download, FileText } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';
import { resolveAssetUrl } from '@/shared/lib/api';

import { ApplicantCertification } from '../../types';

interface ApplicantCertificationTabProps {
  certifications: ApplicantCertification[];
}

export function ApplicantCertificationTab({
  certifications,
}: ApplicantCertificationTabProps) {
  return (
    <Card className="border-0 shadow-md">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-700" />
          </div>
          <h3 className="text-blue-900">Sertifikasi</h3>
        </div>
        {certifications.length > 0 ? (
          <div className="grid gap-4">
            {certifications.map((certification, index) => {
              const certificationUrl = resolveAssetUrl(
                certification.file_url ?? certification.file_path ?? null,
              );
              return (
                <div
                  key={certification.id ?? `cert-${index}`}
                  className="p-5 border-2 border-gray-100 rounded-xl bg-gradient-to-r from-white to-amber-50/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-amber-600 to-amber-500 p-3 rounded-xl shadow-md flex-shrink-0">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-gray-900 font-medium">
                        {certification.name || 'Sertifikasi tidak tersedia'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {certification.issuing_organization || 'Organisasi tidak tersedia'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {certification.issue_date
                          ? `Diterbitkan: ${certification.issue_date}`
                          : 'Tanggal tidak tersedia'}
                        {certification.expiry_date &&
                          `  Berlaku hingga: ${certification.expiry_date}`}
                      </p>
                      {certification.credential_id && (
                        <p className="text-xs text-gray-500">
                          ID Kredensial: {certification.credential_id}
                        </p>
                      )}
                      {certificationUrl && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[150px] truncate">
                              {certification.file_name || 'Sertifikat'}
                            </span>
                          </div>
                          <a
                            href={certificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Lihat
                          </a>
                          <a
                            href={certificationUrl}
                            download
                            className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Pelamar belum menambahkan data sertifikasi
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
