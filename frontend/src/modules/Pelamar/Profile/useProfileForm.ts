import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { router, useForm } from '@/shared/lib/inertia';
import { imageUploadRule, validateFile } from '@/shared/lib/input-validation';

import {
    ApplicantProfilePayload,
    ApplicantProfileForm,
    createEmptyEducation,
    createEmptyExperience,
    createEmptyCertification,
    Education,
    Experience,
    Certification,
    RequiredEducationField,
    SectionKey,
    isEducationComplete,
} from './profileTypes';

const truthyValues = new Set(['1', 'true', 'yes', 'ya', 'aktif', 'active']);

const coerceBool = (value: unknown): boolean => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value === 1;
    }
    if (typeof value === 'string') {
        return truthyValues.has(value.trim().toLowerCase());
    }
    return false;
};

const normalizeYearMonth = (value: unknown): string => {
    if (typeof value !== 'string') {
        return '';
    }
    const text = value.trim();
    if (!text) {
        return '';
    }
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) {
        return text;
    }
    if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(text)) {
        return text.slice(0, 7);
    }
    return '';
};

const normalizeExperience = (item: Experience): Experience => {
    const raw = item as Experience & {
        start_year?: string | number;
        end_year?: string | number;
        is_current?: unknown;
    };

    const isCurrent = coerceBool(raw.is_current);
    let startDate = normalizeYearMonth(raw.start_date);
    let endDate = normalizeYearMonth(raw.end_date);

    if (!startDate && raw.start_year !== undefined && raw.start_year !== null) {
        const year = String(raw.start_year).trim();
        if (/^\d{4}$/.test(year)) {
            startDate = `${year}-01`;
        }
    }

    if (!endDate && raw.end_year !== undefined && raw.end_year !== null) {
        const year = String(raw.end_year).trim();
        if (/^\d{4}$/.test(year)) {
            endDate = `${year}-12`;
        }
    }

    return {
        ...item,
        start_date: startDate,
        end_date: isCurrent ? '' : endDate,
        is_current: isCurrent,
    };
};

export function useProfileForm(profile: ApplicantProfilePayload) {
    const initialData: ApplicantProfileForm = {
        personal: {
            full_name: profile.full_name ?? '',
            email: profile.email ?? '',
            phone: profile.phone ?? '',
            date_of_birth: profile.date_of_birth ?? '',
            gender: profile.gender ?? '',
            religion: profile.religion ?? '',
            address: profile.address ?? '',
            domicile_address: profile.domicile_address ?? '',
            city: profile.city ?? '',
            province: profile.province ?? '',
        },
        educations:
            profile.educations.length > 0
                ? profile.educations.map((item) => ({ ...item }))
                : [createEmptyEducation()],
        experiences:
            profile.experiences.length > 0
                ? profile.experiences.map((item) => normalizeExperience(item))
                : [],
        certifications:
            profile.certifications?.length > 0
                ? profile.certifications.map((item) => ({ ...item, file: null }))
                : [],
        profile_photo: null,
    };

    const form = useForm<ApplicantProfileForm>(initialData);

    const [photoPreview, setPhotoPreview] = useState<string | null>(
        profile.profile_photo_url ?? null,
    );
    const [photoChanged, setPhotoChanged] = useState(false);
    const [submittingSection, setSubmittingSection] =
        useState<SectionKey | null>(null);

    useEffect(() => {
        if (profile.profile_photo_url) {
            setPhotoPreview(profile.profile_photo_url);
        }
    }, [profile.profile_photo_url]);

    const completionPercentage = useMemo(() => {
        const fields: (keyof ApplicantProfileForm['personal'])[] = [
            'full_name',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'religion',
            'address',
            'domicile_address',
            'city',
            'province',
        ];
        const personalProgress =
            fields.filter((field) => Boolean(form.data.personal[field]))
                .length / fields.length;

        const hasValidEducation = form.data.educations.some((education) =>
            isEducationComplete(education),
        );
        const educationProgress = hasValidEducation ? 1 : 0;

        return Math.round(((personalProgress + educationProgress) / 2) * 100);
    }, [form.data.personal, form.data.educations]);

    const setPersonalField = (
        key: keyof ApplicantProfileForm['personal'],
        value: string,
    ) => {
        // Use callback form to get latest state and avoid stale closure issues
        form.setData((prevData) => ({
            ...prevData,
            personal: {
                ...prevData.personal,
                [key]: value,
            },
        }));
    };

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const validationMessage = validateFile(file, imageUploadRule);
        if (validationMessage) {
            toast.error('Foto profil tidak valid', {
                description: validationMessage,
            });
            event.target.value = '';
            return;
        }

        (form.setData as any)('profile_photo', file);
        setPhotoPreview(URL.createObjectURL(file));
        setPhotoChanged(true);
    };

    const handlePhotoSave = () => {
        if (!form.data.profile_photo) {
            return;
        }

        setSubmittingSection('photo');
        form.transform((data) => ({
            profile_photo: data.profile_photo,
            section: 'photo',
        }));
        form.post(route('pelamar.profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                (form.setData as any)('profile_photo', null);
                setPhotoChanged(false);
                router.reload({ only: ['profile'] });
                toast.success('Berhasil! ', {
                    description: 'Foto profil berhasil disimpan.',
                    duration: 3000,
                });
            },
            onError: () => {
                toast.error('Gagal Menyimpan ', {
                    description: 'Gagal menyimpan foto profil, silakan coba lagi.',
                    duration: 4000,
                });
            },
            onFinish: () => setSubmittingSection(null),
        });
    };

    const handlePhotoCancel = () => {
        (form.setData as any)('profile_photo', null);
        setPhotoPreview(profile.profile_photo_url ?? null);
        setPhotoChanged(false);
    };

    const handleEducationChange = (
        id: string,
        key: keyof Education,
        value: string,
    ) => {
        const updated = form.data.educations.map((item) =>
            item.id === id ? { ...item, [key]: value } : item,
        );
        form.setData({
            ...form.data,
            educations: updated,
        });
    };

    const handleExperienceChange = (
        id: string,
        key: keyof Experience,
        value: string | boolean,
    ) => {
        form.setData((prevData) => ({
            ...prevData,
            experiences: prevData.experiences.map((item) =>
                item.id === id ? { ...item, [key]: value } : item,
            ),
        }));
    };

    const addEducation = () => {
        form.setData({
            ...form.data,
            educations: [
                ...form.data.educations,
                createEmptyEducation(),
            ],
        });
    };

    const removeEducation = (id: string) => {
        const updated = form.data.educations.filter((item) => item.id !== id);
        form.setData({
            ...form.data,
            educations: updated.length === 0 ? [createEmptyEducation()] : updated,
        });
    };

    const addExperience = () => {
        form.setData({
            ...form.data,
            experiences: [
                ...form.data.experiences,
                createEmptyExperience(),
            ],
        });
    };

    const removeExperience = (id: string) => {
        form.setData({
            ...form.data,
            experiences: form.data.experiences.filter((item) => item.id !== id),
        });
    };

    const handleCertificationChange = (
        id: string,
        key: keyof Certification,
        value: string | File | null,
    ) => {
        const updated = form.data.certifications.map((item) =>
            item.id === id ? { ...item, [key]: value } : item,
        );
        form.setData({
            ...form.data,
            certifications: updated,
        });
    };

    const clearCertificationFile = (id: string) => {
        const updated = form.data.certifications.map((item) =>
            item.id === id 
                ? { 
                    ...item, 
                    file: null, 
                    file_url: undefined, 
                    file_path: undefined, 
                    file_name: undefined 
                } 
                : item,
        );
        form.setData({
            ...form.data,
            certifications: updated,
        });
    };

    const addCertification = () => {
        form.setData({
            ...form.data,
            certifications: [
                ...form.data.certifications,
                createEmptyCertification(),
            ],
        });
    };

    const removeCertification = (id: string) => {
        form.setData({
            ...form.data,
            certifications: form.data.certifications.filter((item) => item.id !== id),
        });
    };

    const submitSection = (section: SectionKey) => {
        setSubmittingSection(section);
        
        form.transform((data) => {
            const transformedData: Record<string, any> = { ...data, section };
            
            // Handle certification files separately
            if (section === 'certification') {
                // Extract files from certifications and add them with the correct key
                data.certifications.forEach((cert, index) => {
                    if (cert.file) {
                        transformedData[`certification_files.${index}`] = cert.file;
                    }
                });
                
                // Clean up the certifications array - include all fields except 'file'
                // Keep file_path, file_url, file_name to preserve existing file info
                transformedData.certifications = data.certifications.map(cert => ({
                    id: cert.id,
                    name: cert.name || '',
                    issuing_organization: cert.issuing_organization || '',
                    issue_date: cert.issue_date || '',
                    expiry_date: cert.expiry_date || '',
                    credential_id: cert.credential_id || '',
                    // Include these so backend knows if there's an existing file
                    file_path: cert.file_path || '',
                }));
            }
            
            return transformedData;
        });
        
        form.post(route('pelamar.profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                if (section === 'personal') {
                    (form.setData as any)('profile_photo', null);
                }
                if (section === 'certification' || section === 'personal') {
                    // Reload profile data from server to get updated file URLs
                    router.reload({ only: ['profile'] });
                }
                const messages = {
                    personal: 'Data pribadi berhasil disimpan.',
                    education: 'Data pendidikan berhasil disimpan.',
                    experience: 'Data pengalaman kerja/magang berhasil disimpan.',
                    certification: 'Data sertifikasi berhasil disimpan.',
                    photo: 'Foto profil berhasil disimpan.',
                };
                toast.success('Berhasil! ', {
                    description: messages[section],
                    duration: 3000,
                });
            },
            onError: () => {
                const errorMessages = {
                    personal: 'Periksa kembali semua field wajib pada data pribadi.',
                    education: 'Periksa kembali data pendidikan yang wajib diisi.',
                    experience: 'Periksa kembali semua field wajib pada data pengalaman kerja/magang.',
                    certification: 'Periksa kembali data sertifikasi yang wajib diisi.',
                    photo: 'Gagal menyimpan foto profil, silakan coba lagi.',
                };
                toast.error('Gagal Menyimpan ', {
                    description: errorMessages[section],
                    duration: 4000,
                });
            },
            onFinish: () => setSubmittingSection(null),
        });
    };

    const getEducationError = (
        index: number,
        field: RequiredEducationField,
    ) => (form.errors as any)[`educations.${index}.${field}`];

    return {
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
    };
}



