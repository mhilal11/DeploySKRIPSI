import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Building2,
  Clock,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

import { ApplicantRecord } from '../types';
import AcceptanceModal from './AcceptanceModal';
import RejectionModal from './RejectionModal';

interface ApplicantProfileViewProps {
  applicant: ApplicantRecord;
  onAccept?: () => void;
  onReject?: (reason: string) => void;
  onScheduleInterview?: () => void;
  onViewInterviewDetails?: () => void;
  isUpdatingStatus?: boolean;
}

export function ApplicantProfileView({
  applicant,
  onAccept,
  onReject,
  onScheduleInterview,
  onViewInterviewDetails,
  isUpdatingStatus = false
}: ApplicantProfileViewProps) {
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false);

  const educations = applicant.educations ?? [];
  const experiences = applicant.experiences ?? [];
  const certifications = applicant.certifications ?? [];
  const profileName = applicant.profile_name ?? applicant.name;
  const profileEmail = applicant.profile_email ?? applicant.email;
  const profilePhone = applicant.profile_phone ?? applicant.phone;
  const profileAddress = applicant.profile_address;
  const profileCity = applicant.profile_city;
  const profileProvince = applicant.profile_province;
  const profileGender = applicant.profile_gender;
  const profileReligion = applicant.profile_religion;
  const profileBirthDate = applicant.profile_date_of_birth;
  const isHired = applicant.status === 'Hired';
  const isRejected = applicant.status === 'Rejected';
  const hasInterviewSchedule =
    applicant.has_interview_schedule ||
    applicant.status === 'Interview' ||
    Boolean(applicant.interview_date || applicant.interview_time || applicant.interview_mode);
  const scheduleButtonLabel = hasInterviewSchedule ? 'Edit Jadwal' : 'Jadwalkan Interview';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Applied':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Applied</Badge>;
      case 'Screening':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Screening</Badge>;
      case 'Interview':
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Interview</Badge>;
      case 'Hired':
        return <Badge variant="outline" className="border-green-500 text-green-500">Hired</Badge>;
      case 'Rejected':
        return <Badge variant="outline" className="border-red-500 text-red-500">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRejectClick = () => {
    setIsRejectionModalOpen(true);
  };

  const handleAcceptClick = () => {
    setIsAcceptanceModalOpen(true);
  };

  const handleConfirmReject = (reason: string) => {
    if (onReject) {
      onReject(reason);
    }
    setIsRejectionModalOpen(false);
  };

  const handleConfirmAccept = () => {
    if (onAccept) {
      onAccept();
    }
    setIsAcceptanceModalOpen(false);
  };



  return (
    <div className="space-y-6">
      {/* Modern Profile Header */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 h-32"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16 relative">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                {applicant.profile_photo_url ? (
                  <img
                    src={applicant.profile_photo_url}
                    alt={applicant.name}
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

            {/* Profile Info */}
            <div className="flex-1 mt-4 sm:mt-0">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <h2 className="text-gray-900 mb-1">{profileName}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-blue-900 hover:bg-blue-800">ID: APL{String(applicant.id).padStart(3, '0')}</Badge>
                    {getStatusBadge(applicant.status)}
                    <Badge variant="outline" className="border-gray-400 text-gray-700">
                      {applicant.position}
                    </Badge>
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

      {/* Modern Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {applicant.cv_url && (
          <Button
            variant="outline"
            className="shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
            onClick={() => applicant.cv_url && window.open(applicant.cv_url, '_blank')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Lihat CV
          </Button>
        )}
        {onScheduleInterview && !isHired && !isRejected && (
          <Button
            onClick={onScheduleInterview}
            variant="outline"
            className="border-blue-900 text-blue-900 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all"
            title={hasInterviewSchedule ? 'Edit jadwal interview yang sudah dibuat' : 'Buat jadwal interview'}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {scheduleButtonLabel}
          </Button>
        )}
        {onViewInterviewDetails && hasInterviewSchedule && !isHired && !isRejected && (
          <Button
            onClick={onViewInterviewDetails}
            variant="outline"
            className="border-purple-600 text-purple-700 hover:bg-purple-50 shadow-sm hover:shadow-md transition-all"
            title="Lihat detail jadwal interview"
          >
            <Clock className="w-4 h-4 mr-2" />
            Detail Interview
          </Button>
        )}
        {onAccept && !isHired && !isRejected && (
          <Button
            onClick={handleAcceptClick}
            className="bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
            disabled={isUpdatingStatus}
          >
            Terima
          </Button>
        )}
        {onReject && !isHired && !isRejected && (
          <Button
            onClick={handleRejectClick}
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 shadow-sm hover:shadow-md transition-all"
            disabled={isUpdatingStatus}
          >
            Tolak
          </Button>
        )}
      </div>

      {/* Modern Tabbed Content */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4">
            <User className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Data Pribadi</span>
            <span className="sm:hidden">Pribadi</span>
          </TabsTrigger>
          <TabsTrigger value="education" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4">
            <GraduationCap className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Pendidikan</span>
            <span className="sm:hidden">Edu</span>
          </TabsTrigger>
          <TabsTrigger value="experience" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4">
            <Briefcase className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Pengalaman</span>
            <span className="sm:hidden">Exp</span>
          </TabsTrigger>
          <TabsTrigger value="certification" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4">
            <Award className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Sertifikasi</span>
            <span className="sm:hidden">Cert</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
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
                  <div>{getStatusBadge(applicant.status)}</div>
                </div>
                {isRejected && applicant.rejection_reason && (
                  <div className="space-y-2 md:col-span-2 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Catatan Penolakan
                    </p>
                    <p className="text-sm text-red-800 leading-relaxed">{applicant.rejection_reason}</p>
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
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education">
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
                            {[education.degree, education.field_of_study].filter(Boolean).join('  ') || 'Program tidak tersedia'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[education.start_year, education.end_year].filter(Boolean).join(' - ') || 'Tahun tidak tersedia'}
                          </p>
                          {education.gpa && (
                            <p className="text-xs text-gray-500">IPK: {education.gpa}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : applicant.education ? (
                <div className="p-5 border-2 border-gray-100 rounded-xl bg-gradient-to-r from-white to-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-3 rounded-xl shadow-md flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{applicant.education}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Informasi pendidikan tidak tersedia</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience">
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
                            {[experience.start_date, experience.end_date].filter(Boolean).join(' - ') || 'Periode tidak tersedia'}
                          </p>
                          {experience.description && (
                            <p className="text-xs text-gray-500">{experience.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : applicant.experience ? (
                <div className="p-5 border-2 border-gray-100 rounded-xl bg-gradient-to-r from-white to-green-50/30">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-green-600 to-green-500 p-3 rounded-xl shadow-md flex-shrink-0">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{applicant.experience}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Pelamar belum menambahkan data pengalaman kerja</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Certification Tab */}
        <TabsContent value="certification">
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
                  {certifications.map((certification, index) => (
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
                            {certification.expiry_date && `  Berlaku hingga: ${certification.expiry_date}`}
                          </p>
                          {certification.credential_id && (
                            <p className="text-xs text-gray-500">
                              ID Kredensial: {certification.credential_id}
                            </p>
                          )}
                          {certification.file_url && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                <FileText className="w-3.5 h-3.5" />
                                <span className="max-w-[150px] truncate">
                                  {certification.file_name || 'Sertifikat'}
                                </span>
                              </div>
                              <a
                                href={certification.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Lihat
                              </a>
                              <a
                                href={certification.file_url}
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
                  ))}
                </div>
              ) : (
                <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
                  <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Pelamar belum menambahkan data sertifikasi</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onConfirm={handleConfirmReject}
        applicant={applicant}
        isSubmitting={isUpdatingStatus}
      />

      <AcceptanceModal
        isOpen={isAcceptanceModalOpen}
        onClose={() => setIsAcceptanceModalOpen(false)}
        onConfirm={handleConfirmAccept}
        applicant={applicant}
        isSubmitting={isUpdatingStatus}
      />
    </div>
  );
}



