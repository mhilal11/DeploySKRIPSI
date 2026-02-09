import { Edit, X, Lock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import PelamarLayout from '@/modules/Pelamar/Layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Head } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

import CertificationForm from './Profile/components/CertificationForm';
import EducationForm from './Profile/components/EducationForm';
import ExperienceForm from './Profile/components/ExperienceForm';
import PersonalForm from './Profile/components/PersonalForm';
import ProfileHeader from './Profile/components/ProfileHeader';
import { ApplicantProfilePayload, Education, SectionKey } from './Profile/profileTypes';
import { useProfileForm } from './Profile/useProfileForm';


type ProfilePageProps = PageProps<{
    profile: ApplicantProfilePayload;
    profileReminderMessage?: string | null;
    hasActiveApplication?: boolean;
    hasCompletedApplication?: boolean;
}>;

const AVATAR_SIZE = 160;

export default function Profile({
    profile,
    profileReminderMessage,
    hasActiveApplication = false,
    hasCompletedApplication = false,
}: ProfilePageProps) {
    const {
        form,
        photoPreview,
        photoChanged,
        submittingSection,
        completionPercentage,
        setPersonalField,
        handlePhotoChange,
        handlePhotoSave,
        handlePhotoCancel,
        handleEducationChange,
        handleExperienceChange,
        handleCertificationChange,
        clearCertificationFile,
        addEducation,
        removeEducation,
        addExperience,
        removeExperience,
        addCertification,
        removeCertification,
        submitSection,
        getEducationError,
        handleReset,
    } = useProfileForm(profile);
    const [reminderOpen, setReminderOpen] = useState(
        Boolean(profileReminderMessage),
    );
    const [isEditing, setIsEditing] = useState(false);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [pendingSaveSection, setPendingSaveSection] = useState<SectionKey | null>(null);
    const editSnapshotRef = useRef<{
        personal: typeof form.data.personal;
        educations: Education[];
    } | null>(null);
    const prevRecentlySuccessfulRef = useRef(false);

    // Profile is locked only during active application process
    const isProfileLocked = hasActiveApplication;

    useEffect(() => {
        setReminderOpen(Boolean(profileReminderMessage));
    }, [profileReminderMessage]);

    useEffect(() => {
        if (isEditing && form.recentlySuccessful && !prevRecentlySuccessfulRef.current) {
            editSnapshotRef.current = {
                personal: { ...form.data.personal },
                educations: form.data.educations.map((item) => ({ ...item })),
            };
        }
        prevRecentlySuccessfulRef.current = form.recentlySuccessful;
    }, [form.recentlySuccessful, form.data.personal, form.data.educations, isEditing]);
    const flatErrors = form.errors as Record<string, string>;

    // Check section completion status
    const isPersonalComplete = Boolean(
        form.data.personal.full_name &&
        form.data.personal.email &&
        form.data.personal.phone &&
        form.data.personal.date_of_birth &&
        form.data.personal.gender &&
        form.data.personal.religion &&
        form.data.personal.address &&
        form.data.personal.city &&
        form.data.personal.province
    );

    const isEducationComplete = form.data.educations.length > 0 &&
        form.data.educations.every(edu =>
            edu.institution && edu.degree && edu.field_of_study && edu.start_year && edu.end_year
        );

    // Experience is optional, so it's "complete" if empty or all filled
    const isExperienceComplete = form.data.experiences.length === 0 ||
        form.data.experiences.every(exp =>
            exp.company && exp.position && exp.start_date
        );

    // Get tab style class
    const getTabClassName = (isComplete: boolean) => {
        if (isComplete) {
            return 'data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 data-[state=inactive]:bg-emerald-50 data-[state=inactive]:text-emerald-600 border border-emerald-200';
        }
        return 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 data-[state=inactive]:bg-amber-50 data-[state=inactive]:text-amber-600 border border-amber-200';
    };

    // Handle save with confirmation
    const handleSaveWithConfirmation = (section: SectionKey) => {
        setPendingSaveSection(section);
        setConfirmSaveOpen(true);
    };

    const confirmAndSave = () => {
        if (pendingSaveSection) {
            submitSection(pendingSaveSection);
        }
        setConfirmSaveOpen(false);
        setPendingSaveSection(null);
    };

    const handleToggleEdit = () => {
        if (isEditing) {
            if (editSnapshotRef.current) {
                form.setData((prevData) => ({
                    ...prevData,
                    personal: { ...editSnapshotRef.current!.personal },
                    educations: editSnapshotRef.current!.educations.map((item) => ({ ...item })),
                }));
            }
            form.clearErrors();
            setIsEditing(false);
            return;
        }

        editSnapshotRef.current = {
            personal: { ...form.data.personal },
            educations: form.data.educations.map((item) => ({ ...item })),
        };
        setIsEditing(true);
    };

    return (
        <>
            <Head title="Profil Pelamar" />
            <PelamarLayout
                title="Profil Pelamar"
                description="Lengkapi informasi diri untuk dapat mengajukan lamaran"
                breadcrumbs={['Dashboard', 'Profil']}
            >
                <ProfileHeader
                    avatarSize={AVATAR_SIZE}
                    photoPreview={photoPreview ?? profile.profile_photo_url ?? null}
                    photoChanged={photoChanged}
                    onPhotoChange={handlePhotoChange}
                    onPhotoSave={handlePhotoSave}
                    onPhotoCancel={handlePhotoCancel}
                    fullName={form.data.personal.full_name}
                    email={form.data.personal.email}
                    completion={completionPercentage}
                    savingPhoto={form.processing && submittingSection === 'photo'}
                    disabled={isProfileLocked}
                />

                {/* Locked Profile Warning - During Active Application */}
                {isProfileLocked && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <Lock className="h-5 w-5 flex-shrink-0 text-amber-600" />
                        <div>
                            <p className="font-medium text-amber-800">Profil Terkunci</p>
                            <p className="text-sm text-amber-700">
                                Anda tidak dapat mengedit data profil karena lamaran Anda sedang dalam proses. Profil akan dapat diedit kembali setelah proses lamaran selesai.
                            </p>
                        </div>
                    </div>
                )}

                {/* Profile Unlocked Notice - After Application Completed */}
                {!isProfileLocked && hasCompletedApplication && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                        <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                        <div>
                            <p className="font-medium text-green-800">Profil Dapat Diedit</p>
                            <p className="text-sm text-green-700">
                                Proses lamaran Anda sudah selesai. Anda dapat memperbarui data profil untuk melamar pekerjaan lain.
                            </p>
                        </div>
                    </div>
                )}

                {/* Edit Mode Toggle Button */}
                <div className="mb-6 flex justify-end">
                    {isProfileLocked ? (
                        <Button disabled variant="outline" className="cursor-not-allowed opacity-60">
                            <Lock className="mr-2 h-4 w-4" />
                            Profil Terkunci
                        </Button>
                    ) : (
                        <Button
                            onClick={handleToggleEdit}
                            variant={isEditing ? "destructive" : "default"}
                            className={isEditing ? "" : "bg-blue-900 hover:bg-blue-800"}
                        >
                            {isEditing ? (
                                <>
                                    <X className="mr-2 h-4 w-4" />
                                    Batalkan Edit
                                </>
                            ) : (
                                <>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Profil
                                </>
                            )}
                        </Button>
                    )}
                </div>

                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700" />
                        <div>
                            <p className="font-medium text-blue-900">Petunjuk Kelengkapan Profil</p>
                            <p className="text-sm text-blue-800">
                                Data Pribadi dan Pendidikan wajib diisi. Pengalaman Kerja dan Sertifikasi bersifat opsional.
                            </p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="personal" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 gap-1 bg-transparent">
                        <TabsTrigger value="personal" className={getTabClassName(isPersonalComplete)}>
                            Data Pribadi
                        </TabsTrigger>
                        <TabsTrigger value="education" className={getTabClassName(isEducationComplete)}>
                            Pendidikan
                        </TabsTrigger>
                        <TabsTrigger value="experience" className={getTabClassName(false)}>
                            Pengalaman
                        </TabsTrigger>
                        <TabsTrigger value="certification" className={getTabClassName(false)}>
                            Sertifikasi
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal">
                        <PersonalForm
                            data={form.data.personal}
                            errors={form.errors as Record<string, string>}
                            onChange={setPersonalField}
                            onSave={() => handleSaveWithConfirmation('personal')}
                            onReset={handleReset}
                            processing={
                                form.processing && submittingSection === 'personal'
                            }
                            disabled={!isEditing || isProfileLocked}
                        />
                    </TabsContent>

                    <TabsContent value="education">
                        <EducationForm
                            educations={form.data.educations}
                            errors={flatErrors}
                            baseError={flatErrors['educations']}
                            onChange={handleEducationChange}
                            onAdd={addEducation}
                            onRemove={removeEducation}
                            onSave={() => handleSaveWithConfirmation('education')}
                            processing={
                                form.processing && submittingSection === 'education'
                            }
                            getFieldError={getEducationError}
                            disabled={!isEditing || isProfileLocked}
                        />
                    </TabsContent>

                    <TabsContent value="experience">
                        <ExperienceForm
                            experiences={form.data.experiences}
                            onChange={handleExperienceChange}
                            onAdd={addExperience}
                            onRemove={removeExperience}
                            onSave={() => handleSaveWithConfirmation('experience')}
                            processing={
                                form.processing && submittingSection === 'experience'
                            }
                            disabled={!isEditing || isProfileLocked}
                        />
                    </TabsContent>

                    <TabsContent value="certification">
                        <CertificationForm
                            certifications={form.data.certifications}
                            onChange={handleCertificationChange}
                            onClearFile={clearCertificationFile}
                            onAdd={addCertification}
                            onRemove={removeCertification}
                            onSave={() => handleSaveWithConfirmation('certification')}
                            processing={
                                form.processing && submittingSection === 'certification'
                            }
                            disabled={!isEditing || isProfileLocked}
                        />
                    </TabsContent>
                </Tabs>
            </PelamarLayout>

            {/* Profile Reminder Dialog */}
            <AlertDialog open={reminderOpen} onOpenChange={setReminderOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Profil belum lengkap</AlertDialogTitle>
                        <AlertDialogDescription>
                            {profileReminderMessage ??
                                'Lengkapi Data Pribadi dan Pendidikan (wajib). Data Pengalaman dan Sertifikasi bersifat opsional.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            className="bg-blue-900 text-white hover:bg-blue-800"
                            onClick={() => setReminderOpen(false)}
                        >
                            Mengerti
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirmation Dialog Before Save */}
            <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <AlertDialogTitle className="text-center">
                            Konfirmasi Simpan Data
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Apakah data yang Anda masukkan sudah benar?
                            <br /><br />
                            <span className="font-medium text-amber-700">
                                Perhatian: Setelah Anda mengajukan lamaran pekerjaan, profil tidak dapat diubah kembali.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                        <AlertDialogCancel className="flex-1">
                            Periksa Kembali
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                            onClick={confirmAndSave}
                        >
                            Ya, Simpan Data
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}




