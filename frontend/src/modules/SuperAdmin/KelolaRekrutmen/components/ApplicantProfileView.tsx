import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Bot,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { apiUrl, resolveAssetUrl } from '@/shared/lib/api';

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
  const scoring = applicant.recruitment_score;
  const aiScreening = applicant.ai_screening;
  const cvUrl =
    applicant.cv_file || applicant.cv_url
      ? resolveAssetUrl(apiUrl(`/super-admin/recruitment/${applicant.id}/cv`))
      : null;
  const profilePhotoUrl = resolveAssetUrl(applicant.profile_photo_url ?? null);
  const scoreValue = scoring?.total;
  const rankingLabel =
    scoring?.rank && scoring?.total_candidates
      ? `#${scoring.rank} dari ${scoring.total_candidates}`
      : null;
  const scoreBadgeClassName =
    typeof scoreValue !== 'number'
      ? 'border-slate-300 text-slate-600'
      : scoreValue >= 85
        ? 'border-emerald-500 text-emerald-700'
        : scoreValue >= 70
          ? 'border-blue-500 text-blue-700'
          : scoreValue >= 55
            ? 'border-amber-500 text-amber-700'
            : 'border-rose-500 text-rose-700';
  const hasInterviewSchedule =
    applicant.has_interview_schedule ||
    applicant.status === 'Interview' ||
    Boolean(applicant.interview_date || applicant.interview_time || applicant.interview_mode);
  const scheduleButtonLabel = hasInterviewSchedule ? 'Edit Jadwal' : 'Jadwalkan Interview';
  const aiScore =
    aiScreening && typeof aiScreening.match_score === 'number'
      ? aiScreening.match_score
      : null;
  const aiScoreBadgeClassName =
    aiScore === null
      ? 'border-slate-300 text-slate-600'
      : aiScore >= 85
        ? 'border-emerald-500 text-emerald-700'
        : aiScore >= 70
          ? 'border-blue-500 text-blue-700'
          : aiScore >= 55
            ? 'border-amber-500 text-amber-700'
            : 'border-rose-500 text-rose-700';
  const aiScreeningStatus = (aiScreening?.status ?? '').trim().toLowerCase();

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
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
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

      {/* Modern Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {cvUrl && (
          <Button
            variant="outline"
            className="shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
            onClick={() => cvUrl && window.open(cvUrl, '_blank')}
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto bg-gray-100 p-1 rounded-xl">
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
          <TabsTrigger value="scoring" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4">
            <Sparkles className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Skoring</span>
            <span className="sm:hidden">Skor</span>
          </TabsTrigger>
          <TabsTrigger value="ai-screening" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg py-3 px-2 sm:px-4">
            <Bot className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">AI Screening</span>
            <span className="sm:hidden">AI</span>
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
                          {(resolveAssetUrl(certification.file_url ?? certification.file_path ?? null)) && (
                            <div className="mt-3 flex items-center gap-2">
                              {(() => {
                                const certificationUrl = resolveAssetUrl(certification.file_url ?? certification.file_path ?? null);
                                if (!certificationUrl) {
                                  return null;
                                }
                                return (
                                  <>
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
                                  </>
                                );
                              })()}
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

        {/* Explainable Scoring Tab */}
        <TabsContent value="scoring">
          <Card className="border-0 shadow-md">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-blue-900">Explainable Recruitment Scoring</h3>
                  <p className="text-sm text-slate-600">
                    Hasil penilaian kandidat per lowongan berdasarkan bobot multi-kriteria.
                  </p>
                </div>
                {scoring && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${scoreBadgeClassName} px-3 py-1`}>
                      Total {scoring.total.toFixed(1)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        scoring.eligible
                          ? 'border-emerald-500 text-emerald-700'
                          : 'border-rose-500 text-rose-700'
                      }
                    >
                      {scoring.eligible ? 'Eligible' : 'Tidak Eligible'}
                    </Badge>
                  </div>
                )}
              </div>

              {!scoring ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Skor belum tersedia untuk kandidat ini.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Metode</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{scoring.method}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Rekomendasi</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{scoring.recommendation}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Posisi Ranking</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {scoring.rank > 0 && scoring.total_candidates > 0
                          ? `#${scoring.rank} dari ${scoring.total_candidates}`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {scoring.breakdown.map((item) => (
                      <div key={item.key} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">{item.score.toFixed(1)}/100</p>
                            <p className="text-xs text-slate-500">
                              Bobot {item.weight.toFixed(1)}% | Kontribusi {item.contribution.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                            style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-900">Kekuatan Kandidat</p>
                      </div>
                      {scoring.highlights.length === 0 ? (
                        <p className="text-xs text-emerald-800">Belum ada highlight tambahan.</p>
                      ) : (
                        <div className="space-y-1">
                          {scoring.highlights.map((item, index) => (
                            <p key={`highlight-${index}`} className="text-xs text-emerald-900">
                              {item}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-semibold text-amber-900">Risiko & Catatan</p>
                      </div>
                      {scoring.risks.length === 0 ? (
                        <p className="text-xs text-amber-800">Tidak ada risiko signifikan terdeteksi.</p>
                      ) : (
                        <div className="space-y-1">
                          {scoring.risks.map((item, index) => (
                            <p key={`risk-${index}`} className="text-xs text-amber-900">
                              {item}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai-screening">
          <Card className="border-0 shadow-md">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-blue-900">AI CV Screening (Groq)</h3>
                  <p className="text-sm text-slate-600">
                    Ringkasan kecocokan CV kandidat terhadap kriteria lowongan.
                  </p>
                </div>
                {aiScore !== null && (
                  <Badge variant="outline" className={`${aiScoreBadgeClassName} px-3 py-1`}>
                    Match {aiScore.toFixed(1)}
                  </Badge>
                )}
              </div>

              {!aiScreening ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Belum ada hasil AI screening. Screening berjalan otomatis saat pelamar submit lamaran.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Rekomendasi</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {aiScreening.recommendation ?? '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Model</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {aiScreening.model_used ?? '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          aiScreeningStatus === 'success'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {aiScreening.status ?? '-'}
                      </p>
                    </div>
                  </div>

                  {aiScreening.summary && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Ringkasan</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{aiScreening.summary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-900 mb-2">Kekuatan CV</p>
                      {aiScreening.strengths?.length ? (
                        <div className="space-y-1">
                          {aiScreening.strengths.map((item, index) => (
                            <p key={`ai-strength-${index}`} className="text-xs text-emerald-900">{item}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-800">Belum ada poin kekuatan.</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900 mb-2">Gap Kandidat</p>
                      {aiScreening.gaps?.length ? (
                        <div className="space-y-1">
                          {aiScreening.gaps.map((item, index) => (
                            <p key={`ai-gap-${index}`} className="text-xs text-amber-900">{item}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-800">Tidak ada gap utama terdeteksi.</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-sm font-semibold text-rose-900 mb-2">Red Flags</p>
                      {aiScreening.red_flags?.length ? (
                        <div className="space-y-1">
                          {aiScreening.red_flags.map((item, index) => (
                            <p key={`ai-flag-${index}`} className="text-xs text-rose-900">{item}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-rose-800">Tidak ada red flag signifikan.</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                      <p className="text-sm font-semibold text-indigo-900 mb-2">Saran Pertanyaan Interview</p>
                      {aiScreening.interview_questions?.length ? (
                        <div className="space-y-1">
                          {aiScreening.interview_questions.map((item, index) => (
                            <p key={`ai-question-${index}`} className="text-xs text-indigo-900">{item}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-indigo-800">Belum ada saran pertanyaan.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                      <p>
                        Token Prompt: <span className="font-semibold text-slate-700">{aiScreening.tokens?.prompt ?? 0}</span>
                      </p>
                      <p>
                        Token Completion: <span className="font-semibold text-slate-700">{aiScreening.tokens?.completion ?? 0}</span>
                      </p>
                      <p>
                        Token Total: <span className="font-semibold text-slate-700">{aiScreening.tokens?.total ?? 0}</span>
                      </p>
                    </div>
                    {aiScreening.error_message && (
                      <p className="mt-2 text-xs text-rose-700">{aiScreening.error_message}</p>
                    )}
                  </div>
                </>
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



