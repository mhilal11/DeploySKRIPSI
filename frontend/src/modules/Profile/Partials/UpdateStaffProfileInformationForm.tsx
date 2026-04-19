import { Transition } from '@headlessui/react';
import Image from 'next/image';
import { ChangeEvent, FormEventHandler, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import { AutocompleteInput, AutocompleteOption } from '@/shared/components/ui/autocomplete-input';
import { DatePickerInput } from '@/shared/components/ui/date-picker-input';
import { InternationalPhoneInput } from '@/shared/components/ui/international-phone-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
    getAllProvinces,
    getCitiesByProvince,
    getCityDisplayName,
} from '@/shared/data/indonesian-locations';
import { api, apiUrl } from '@/shared/lib/api';
import { useForm, usePage } from '@/shared/lib/inertia';
import {
    imageUploadRule,
    isValidEmail,
    parseStoredPhoneNumber,
    isValidPersonName,
    PERSON_NAME_ERROR_MESSAGE,
    sanitizePersonNameInput,
    validatePhoneNumberForCountry,
    validateFile,
} from '@/shared/lib/input-validation';

import UpdatePasswordForm from './UpdatePasswordForm';

type StaffTab = 'personal' | 'education' | 'password';
type Edu = { institution: string; degree: string; field_of_study: string; start_year: string; end_year: string; gpa: string };
type StaffProfilePayload = {
    phone?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    religion?: string | null;
    address?: string | null;
    domicile_address?: string | null;
    city?: string | null;
    province?: string | null;
    education_level?: string | null;
    educations?: Edu[] | null;
    profile_photo_url?: string | null;
};
type Data = {
    section?: string;
    remove_profile_photo: boolean;
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
    religion: string;
    address: string;
    domicile_address: string;
    city: string;
    province: string;
    education_level: string;
    educations: Edu[];
    profile_photo: File | null;
};
type PersonalSectionData = Pick<
    Data,
    'name' | 'email' | 'phone' | 'date_of_birth' | 'gender' | 'religion' | 'address' | 'domicile_address' | 'city' | 'province'
>;
type EducationSectionData = Pick<Data, 'education_level' | 'educations'>;

const EMPTY_EDU: Edu = { institution: '', degree: '', field_of_study: '', start_year: '', end_year: '', gpa: '' };
const DEGREE_OPTIONS = ['SD', 'SMP', 'SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3'];
const GPA_REQUIRED_DEGREES = ['D3', 'D4', 'S1', 'S2', 'S3'];
const MIN_SEARCH_CHARACTERS = 2;
const EDUCATION_REFERENCE_LIMIT = 50;
const MIN_EDUCATION_YEAR = 1900;
const MONTH_OPTIONS = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
];

interface Props {
    className?: string;
    profile?: StaffProfilePayload | null;
    religionOptions?: string[];
    genderOptions?: string[];
    educationLevelOptions?: string[];
}

export default function UpdateStaffProfileInformationForm({
    className = '',
    profile,
    religionOptions = [],
    genderOptions = [],
    educationLevelOptions = [],
}: Props) {
    const user = usePage().props.auth?.user;
    const [tab, setTab] = useState<StaffTab>('personal');
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const [isEditing, setIsEditing] = useState<{ personal: boolean; education: boolean }>({
        personal: false,
        education: false,
    });
    const [snapshots, setSnapshots] = useState<{
        personal: PersonalSectionData | null;
        education: EducationSectionData | null;
    }>({
        personal: null,
        education: null,
    });
    const [institutionOptions, setInstitutionOptions] = useState<AutocompleteOption[]>([]);
    const [programOptions, setProgramOptions] = useState<AutocompleteOption[]>([]);
    const [institutionQuery, setInstitutionQuery] = useState('');
    const [programQuery, setProgramQuery] = useState('');
    const [referenceError, setReferenceError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.profile_photo_url ?? null);
    const [photoChanged, setPhotoChanged] = useState(false);
    const [confirmDeletePhotoOpen, setConfirmDeletePhotoOpen] = useState(false);

    const { data, setData, patch, transform, errors, processing, recentlySuccessful, clearErrors } = useForm<Data>({
        section: '',
        remove_profile_photo: false,
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: profile?.phone ?? '',
        date_of_birth: profile?.date_of_birth ?? '',
        gender: profile?.gender ?? '',
        religion: profile?.religion ?? '',
        address: profile?.address ?? '',
        domicile_address: profile?.domicile_address ?? '',
        city: profile?.city ?? '',
        province: profile?.province ?? '',
        education_level: profile?.education_level ?? '',
        educations: normalizeEducations(profile?.educations),
        profile_photo: null,
    });

    useEffect(() => {
        setData((prev) => ({
            ...prev,
            section: '',
            remove_profile_photo: false,
            name: user?.name ?? '',
            email: user?.email ?? '',
            phone: profile?.phone ?? '',
            date_of_birth: profile?.date_of_birth ?? '',
            gender: profile?.gender ?? '',
            religion: profile?.religion ?? '',
            address: profile?.address ?? '',
            domicile_address: profile?.domicile_address ?? '',
            city: profile?.city ?? '',
            province: profile?.province ?? '',
            education_level: profile?.education_level ?? '',
            educations: normalizeEducations(profile?.educations),
            profile_photo: null,
        }));
        setClientErrors({});
        setIsEditing({ personal: false, education: false });
        setSnapshots({ personal: null, education: null });
    }, [setData, user?.name, user?.email, profile]);

    useEffect(() => {
        setPhotoPreview(profile?.profile_photo_url ?? null);
        setPhotoChanged(false);
    }, [profile?.profile_photo_url]);

    useEffect(() => {
        void fetchEducationRefs(institutionQuery, setInstitutionOptions, setReferenceError);
    }, [institutionQuery]);

    useEffect(() => {
        void fetchEducationRefs(programQuery, setProgramOptions, setReferenceError, 'programs');
    }, [programQuery]);

    const mergedErrors = { ...(errors as Record<string, string | undefined>), ...clientErrors };
    const provinceOptions = useMemo(
        () => getAllProvinces().map((province) => ({ value: province, label: province })),
        [],
    );
    const cityOptions = useMemo(
        () =>
            data.province
                ? getCitiesByProvince(data.province).map((city) => ({
                      value: getCityDisplayName(city),
                      label: getCityDisplayName(city),
                  }))
                : [],
        [data.province],
    );
    const maxBirthDate = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        today.setDate(today.getDate() - 1);
        return today;
    }, []);
    const currentYear = new Date().getFullYear();

    const startEdit = (section: 'personal' | 'education') => {
        setClientErrors({});
        clearErrors();
        setIsEditing((prev) => ({ ...prev, [section]: true }));
        if (section === 'personal') {
            setSnapshots((prev) => ({ ...prev, personal: buildPersonalSnapshot(data) }));
            return;
        }
        setSnapshots((prev) => ({ ...prev, education: buildEducationSnapshot(data) }));
    };

    const cancelEdit = (section: 'personal' | 'education') => {
        setClientErrors({});
        clearErrors();
        if (section === 'personal') {
            if (snapshots.personal) {
                setData((prev) => ({
                    ...prev,
                    ...snapshots.personal,
                }));
            }
        } else if (snapshots.education) {
            const educationSnapshot = snapshots.education;
            setData((prev) => ({
                ...prev,
                education_level: educationSnapshot.education_level,
                educations: educationSnapshot.educations.map((item: Edu) => ({ ...item })),
            }));
        }
        setIsEditing((prev) => ({ ...prev, [section]: false }));
        setSnapshots((prev) => ({ ...prev, [section]: null }));
    };

    const submitSection = (section: 'personal' | 'education'): FormEventHandler => (event) => {
        event.preventDefault();
        const validationErrors = validate(data, section);
        if (Object.keys(validationErrors).length > 0) {
            setClientErrors(validationErrors);
            setTab(resolveTab(Object.keys(validationErrors)));
            toast.error('Validasi gagal.', {
                description:
                    section === 'personal'
                        ? 'Periksa kembali field wajib pada data pribadi.'
                        : 'Periksa kembali field wajib pada data pendidikan.',
            });
            return;
        }
        setClientErrors({});
        transform((payload) => ({
            ...payload,
            section,
            profile_photo: null,
            remove_profile_photo: false,
        }));
        patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditing((prev) => ({ ...prev, [section]: false }));
                setSnapshots((prev) => ({ ...prev, [section]: null }));
                toast.success(
                    section === 'personal'
                        ? 'Data pribadi berhasil disimpan.'
                        : 'Data pendidikan berhasil disimpan.',
                );
            },
            onError: (serverErrors) => {
                setTab(resolveTab(Object.keys(serverErrors as Record<string, string>)));
                toast.error(
                    section === 'personal'
                        ? 'Gagal menyimpan data pribadi.'
                        : 'Gagal menyimpan data pendidikan.',
                    {
                        description: 'Periksa kembali field yang ditandai lalu coba lagi.',
                    },
                );
            },
        });
    };

    const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const validationMessage = validateFile(file, imageUploadRule);
        if (validationMessage) {
            toast.error('File foto tidak valid.', {
                description: validationMessage,
            });
            return;
        }
        setData('remove_profile_photo', false);
        setData('profile_photo', file);
        setPhotoPreview(URL.createObjectURL(file));
        setPhotoChanged(true);
    };

    const handlePhotoCancel = () => {
        setData('remove_profile_photo', false);
        setData('profile_photo', null);
        setPhotoPreview(profile?.profile_photo_url ?? null);
        setPhotoChanged(false);
    };

    const handlePhotoSave = () => {
        if (!data.profile_photo) {
            toast.error('Silakan pilih foto terlebih dahulu.');
            return;
        }
        transform((payload) => ({
            section: 'photo',
            profile_photo: payload.profile_photo,
            remove_profile_photo: false,
        }));
        patch(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (response) => {
                const nextPhotoURL =
                    typeof response?.profile_photo_url === 'string'
                        ? response.profile_photo_url
                        : photoPreview;
                setPhotoPreview(nextPhotoURL);
                setData('remove_profile_photo', false);
                setData('profile_photo', null);
                setPhotoChanged(false);
                toast.success('Foto profil berhasil disimpan.');
            },
            onError: () => {
                toast.error('Gagal menyimpan foto profil.');
            },
        });
    };

    const handlePhotoDelete = () => {
        if (!photoPreview || photoChanged) {
            return;
        }
        setConfirmDeletePhotoOpen(true);
    };

    const confirmPhotoDelete = () => {
        transform(() => ({
            section: 'photo',
            remove_profile_photo: true,
        }));
        patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmDeletePhotoOpen(false);
                setData('remove_profile_photo', false);
                setData('profile_photo', null);
                setPhotoPreview(null);
                setPhotoChanged(false);
                toast.success('Foto profil berhasil dihapus.');
            },
            onError: () => {
                setConfirmDeletePhotoOpen(false);
                setData('remove_profile_photo', false);
                toast.error('Gagal menghapus foto profil.');
            },
        });
    };

    return (
        <section className={className}>
            <div className="mb-4 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-blue-900 bg-slate-100">
                        {photoPreview ? (
                            <Image
                                src={photoPreview}
                                alt="Foto profil staff"
                                width={80}
                                height={80}
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                                {(data.name?.[0] ?? 'S').toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">Foto Profil Staff</p>
                        <p className="text-xs text-slate-500">Gunakan foto terbaru agar identitas akun staff lebih jelas.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                            Pilih Foto
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                                className="hidden"
                                onChange={handlePhotoChange}
                                disabled={processing}
                            />
                        </label>
                        {photoChanged && (
                            <>
                                <button
                                    type="button"
                                    className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    onClick={handlePhotoCancel}
                                    disabled={processing}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="rounded bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                                    onClick={handlePhotoSave}
                                    disabled={processing}
                                >
                                    Simpan Foto
                                </button>
                            </>
                        )}
                        {!photoChanged && photoPreview && (
                            <button
                                type="button"
                                className="rounded border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                onClick={handlePhotoDelete}
                                disabled={processing}
                            >
                                Hapus Foto
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <Tabs value={tab} onValueChange={(value) => setTab(value as StaffTab)} className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-1 gap-1 bg-slate-100 p-1 sm:grid-cols-3">
                    <TabsTrigger value="personal">Data Pribadi</TabsTrigger>
                    <TabsTrigger value="education">Pendidikan</TabsTrigger>
                    <TabsTrigger value="password">Update Password</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="mt-0">
                    <form onSubmit={submitSection('personal')} className="space-y-4 rounded-xl border border-slate-200 p-4">
                        <SectionActions
                            sectionLabel="Data Pribadi"
                            isEditing={isEditing.personal}
                            onEdit={() => startEdit('personal')}
                        />
                        <Field label="Nama Lengkap *" value={data.name} onChange={(value) => setData('name', sanitizePersonNameInput(value))} error={mergedErrors.name} disabled={!isEditing.personal} />
                        <Field label="Email *" type="email" value={data.email} onChange={(value) => setData('email', value)} error={mergedErrors.email} disabled={!isEditing.personal} />
                        <div>
                            <label className="text-sm font-medium text-slate-600">
                                <RequiredLabel text="Nomor Telepon *" />
                            </label>
                            <div className="mt-1">
                                <InternationalPhoneInput
                                    value={data.phone}
                                    onChange={(value) => setData('phone', value)}
                                    disabled={!isEditing.personal}
                                    error={mergedErrors.phone}
                                />
                            </div>
                        </div>
                        <DateField
                            label="Tanggal Lahir *"
                            value={data.date_of_birth}
                            onChange={(value) => setData('date_of_birth', value)}
                            error={mergedErrors.date_of_birth}
                            disabled={!isEditing.personal}
                            maxDate={maxBirthDate}
                            toYear={currentYear}
                        />
                        <Select label="Jenis Kelamin *" value={data.gender} options={genderOptions} onChange={(value) => setData('gender', value)} error={mergedErrors.gender} disabled={!isEditing.personal} />
                        <Select label="Agama *" value={data.religion} options={religionOptions} onChange={(value) => setData('religion', value)} error={mergedErrors.religion} disabled={!isEditing.personal} />
                        <Area label="Alamat Lengkap *" value={data.address} onChange={(value) => setData('address', value)} error={mergedErrors.address} disabled={!isEditing.personal} />
                        <Auto label="Provinsi *" value={data.province} options={provinceOptions} onValueChange={(value) => { setData('province', value); setData('city', ''); }} error={mergedErrors.province} disabled={!isEditing.personal} />
                        <Auto label="Kota/Kabupaten *" value={data.city} options={cityOptions} onValueChange={(value) => setData('city', value)} error={mergedErrors.city} disabled={!data.province || !isEditing.personal} />
                        <Area label="Alamat Domisili *" value={data.domicile_address} onChange={(value) => setData('domicile_address', value)} error={mergedErrors.domicile_address} disabled={!isEditing.personal} />
                        <SectionFooterActions
                            isEditing={isEditing.personal}
                            processing={processing}
                            recentlySuccessful={recentlySuccessful}
                            saveLabel="Simpan Data Pribadi"
                            onCancel={() => cancelEdit('personal')}
                        />
                    </form>
                </TabsContent>

                <TabsContent value="education" className="mt-0">
                    <form onSubmit={submitSection('education')} className="space-y-4 rounded-xl border border-slate-200 p-4">
                        <SectionActions
                            sectionLabel="Data Pendidikan"
                            isEditing={isEditing.education}
                            onEdit={() => startEdit('education')}
                        />
                        <Select label="Pendidikan Tertinggi *" value={data.education_level} options={educationLevelOptions} onChange={(value) => setData('education_level', value)} error={mergedErrors.education_level} disabled={!isEditing.education} />
                        {mergedErrors.educations && <p className="text-xs text-red-500">{mergedErrors.educations}</p>}
                        <button type="button" className="rounded border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setData('educations', [...data.educations, { ...EMPTY_EDU }])} disabled={!isEditing.education}>+ Tambah Riwayat</button>
                        {data.educations.map((education, index) => (
                            <div key={`edu-${index}`} className="space-y-3 rounded border p-3">
                                <Auto label="Nama Institusi *" value={education.institution} options={institutionOptions} onValueChange={(value) => updateEdu(setData, data, index, 'institution', value)} onInputChange={setInstitutionQuery} allowCustomValue error={mergedErrors[`educations.${index}.institution`]} disabled={!isEditing.education} />
                                <Select label="Jenjang *" value={education.degree} options={DEGREE_OPTIONS} onChange={(value) => updateEdu(setData, data, index, 'degree', value)} error={mergedErrors[`educations.${index}.degree`]} disabled={!isEditing.education} />
                                <Auto label="Program Studi *" value={education.field_of_study} options={programOptions} onValueChange={(value) => updateEdu(setData, data, index, 'field_of_study', value)} onInputChange={setProgramQuery} allowCustomValue error={mergedErrors[`educations.${index}.field_of_study`]} disabled={!isEditing.education} />
                                <MonthField
                                    label="Tahun Mulai *"
                                    value={normalizeEducationMonthValue(education.start_year)}
                                    onChange={(value) => updateEdu(setData, data, index, 'start_year', value)}
                                    error={mergedErrors[`educations.${index}.start_year`]}
                                    minYear={MIN_EDUCATION_YEAR}
                                    maxYear={currentYear}
                                    disabled={!isEditing.education}
                                />
                                <MonthField
                                    label="Tahun Selesai *"
                                    value={normalizeEducationMonthValue(education.end_year)}
                                    onChange={(value) => updateEdu(setData, data, index, 'end_year', value)}
                                    error={mergedErrors[`educations.${index}.end_year`]}
                                    minYear={extractEducationYear(education.start_year) ?? MIN_EDUCATION_YEAR}
                                    maxYear={(extractEducationYear(education.start_year) ?? currentYear) + 7}
                                    disabled={!isEditing.education}
                                />
                                {requiresGPA(education.degree) && (
                                    <Field
                                        label="IPK *"
                                        value={education.gpa}
                                        onChange={(value) => updateEdu(setData, data, index, 'gpa', normalizeGPAInput(value))}
                                        error={mergedErrors[`educations.${index}.gpa`]}
                                        disabled={!isEditing.education}
                                    />
                                )}
                                {referenceError && <p className="text-xs text-amber-600">{referenceError}</p>}
                                <button type="button" className="text-xs text-rose-600 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => removeEdu(setData, data, index)} disabled={!isEditing.education}>Hapus</button>
                            </div>
                        ))}
                        <SectionFooterActions
                            isEditing={isEditing.education}
                            processing={processing}
                            recentlySuccessful={recentlySuccessful}
                            saveLabel="Simpan Data Pendidikan"
                            onCancel={() => cancelEdit('education')}
                        />
                    </form>
                </TabsContent>

                <TabsContent value="password" className="mt-0 rounded-xl border border-slate-200 p-4">
                    <UpdatePasswordForm className="max-w-none" />
                </TabsContent>
            </Tabs>

            <AlertDialog open={confirmDeletePhotoOpen} onOpenChange={setConfirmDeletePhotoOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Foto Profil?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Foto profil akan dihapus dan avatar akan kembali ke tampilan default.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={processing}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPhotoDelete}
                            disabled={processing}
                            className="bg-rose-600 text-white hover:bg-rose-700"
                        >
                            Ya, Hapus Foto
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}

async function fetchEducationRefs(
    query: string,
    setter: (value: AutocompleteOption[]) => void,
    setReferenceError: (value: string | null) => void,
    key: 'institutions' | 'programs' = 'institutions',
) {
    const q = query.trim();
    if (q.length < MIN_SEARCH_CHARACTERS) {
        setter([]);
        return;
    }
    try {
        const response = await api.get(apiUrl('/staff/references/education'), { params: { q, limit: EDUCATION_REFERENCE_LIMIT } });
        const values = Array.isArray(response.data?.[key]) ? response.data[key] : [];
        setter(values.map((name: string) => ({ value: name, label: name })));
        setReferenceError(null);
    } catch {
        setter([]);
        setReferenceError('Referensi kampus/prodi belum tersedia. Silakan isi manual.');
    }
}

function validate(data: Data, section: 'personal' | 'education'): Record<string, string> {
    const errs: Record<string, string> = {};
    if (section === 'personal') {
        const requiredTop: Array<[keyof Omit<Data, 'educations'>, string]> = [
            ['name', 'Nama lengkap wajib diisi.'],
            ['email', 'Email wajib diisi.'],
            ['phone', 'Nomor telepon wajib diisi.'],
            ['date_of_birth', 'Tanggal lahir wajib diisi.'],
            ['gender', 'Jenis kelamin wajib diisi.'],
            ['religion', 'Agama wajib diisi.'],
            ['address', 'Alamat lengkap wajib diisi.'],
            ['domicile_address', 'Alamat domisili wajib diisi.'],
            ['city', 'Kota/Kabupaten wajib diisi.'],
            ['province', 'Provinsi wajib diisi.'],
        ];
        requiredTop.forEach(([field, msg]) => !String(data[field]).trim() && (errs[field] = msg));
        if (data.name && !isValidPersonName(data.name)) errs.name = PERSON_NAME_ERROR_MESSAGE;
        if (data.email && !isValidEmail(data.email)) errs.email = 'Format email tidak valid.';
        if (data.phone) {
            const parsedPhone = parseStoredPhoneNumber(data.phone);
            const phoneValidation = validatePhoneNumberForCountry(
                parsedPhone.country,
                parsedPhone.localNumber,
            );
            if (!phoneValidation.isValid && phoneValidation.message) {
                errs.phone = phoneValidation.message;
            }
        }
        if (data.date_of_birth) {
            const selected = new Date(data.date_of_birth).getTime();
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (Number.isNaN(selected)) errs.date_of_birth = 'Format tanggal lahir tidak valid.';
            else if (selected >= today.getTime()) errs.date_of_birth = 'Tidak dapat memilih tanggal hari ini atau masa depan.';
        }
        return errs;
    }

    if (!data.education_level.trim()) {
        errs.education_level = 'Pendidikan tertinggi wajib diisi.';
    }
    if (data.educations.length === 0) return { ...errs, educations: 'Minimal 1 riwayat pendidikan wajib diisi.' };
    const yearNow = new Date().getFullYear();
    data.educations.forEach((e, i) => {
        const p = `educations.${i}`;
        if (!e.institution.trim()) errs[`${p}.institution`] = 'Nama institusi wajib diisi.';
        if (!e.degree.trim()) errs[`${p}.degree`] = 'Jenjang wajib diisi.';
        if (!e.field_of_study.trim()) errs[`${p}.field_of_study`] = 'Program studi wajib diisi.';
        const s = extractEducationYear(e.start_year); const en = extractEducationYear(e.end_year);
        if (!e.start_year.trim()) errs[`${p}.start_year`] = 'Tahun mulai wajib diisi.';
        else if (s === null) errs[`${p}.start_year`] = 'Tahun mulai harus berupa angka.';
        else if (s < MIN_EDUCATION_YEAR || s > yearNow) errs[`${p}.start_year`] = 'Tahun mulai harus antara 1900 dan tahun sekarang.';
        if (!e.end_year.trim()) errs[`${p}.end_year`] = 'Tahun selesai wajib diisi.';
        else if (en === null) errs[`${p}.end_year`] = 'Tahun selesai harus berupa angka.';
        else if (en < MIN_EDUCATION_YEAR) errs[`${p}.end_year`] = 'Tahun selesai minimal 1900.';
        if (s !== null && en !== null) {
            if (en < s) errs[`${p}.end_year`] = 'Tahun selesai tidak boleh lebih kecil dari tahun mulai.';
            else if (en > s + 7) errs[`${p}.end_year`] = 'Tahun selesai maksimal 7 tahun dari tahun mulai.';
        }
        if (requiresGPA(e.degree) && !e.gpa.trim()) errs[`${p}.gpa`] = 'IPK wajib diisi untuk jenjang ini.';
        else if (e.gpa.trim()) {
            const g = parseFloat(e.gpa.replace(',', '.'));
            if (Number.isNaN(g)) errs[`${p}.gpa`] = 'Format IPK tidak valid.';
            else if (g < 0 || g > 4) errs[`${p}.gpa`] = 'IPK harus antara 0.00 sampai 4.00.';
        }
    });
    return errs;
}

function resolveTab(keys: string[]): StaffTab {
    return keys.some((key) => key === 'education_level' || key === 'educations' || key.startsWith('educations.')) ? 'education' : 'personal';
}
function buildPersonalSnapshot(data: Data): PersonalSectionData {
    return {
        name: data.name,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        religion: data.religion,
        address: data.address,
        domicile_address: data.domicile_address,
        city: data.city,
        province: data.province,
    };
}
function buildEducationSnapshot(data: Data): EducationSectionData {
    return {
        education_level: data.education_level,
        educations: data.educations.map((item) => ({ ...item })),
    };
}
function normalizeEducations(items?: Edu[] | null): Edu[] {
    return items && items.length > 0
        ? items.map((item) => ({
            ...EMPTY_EDU,
            ...item,
            start_year: normalizeEducationMonthValue(item.start_year ?? ''),
            end_year: normalizeEducationMonthValue(item.end_year ?? ''),
        }))
        : [{ ...EMPTY_EDU }];
}
function requiresGPA(degree: string): boolean { return GPA_REQUIRED_DEGREES.includes(degree.toUpperCase().trim()); }
function updateEdu(setData: any, data: Data, index: number, field: keyof Edu, value: string) { const next = [...data.educations]; next[index] = { ...next[index], [field]: value }; setData('educations', next); }
function removeEdu(setData: any, data: Data, index: number) { const next = data.educations.filter((_, i) => i !== index); setData('educations', next.length ? next : [{ ...EMPTY_EDU }]); }

function normalizeEducationMonthValue(value: string): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return '';
    }
    if (/^\d{4}$/.test(trimmed)) {
        return `${trimmed}-01`;
    }
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) {
        return trimmed;
    }
    if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(trimmed)) {
        return trimmed.slice(0, 7);
    }
    return trimmed;
}

function extractEducationYear(value: string): number | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return null;
    }
    if (/^\d{4}$/.test(trimmed)) {
        return Number(trimmed);
    }
    if (/^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(trimmed)) {
        return Number(trimmed.slice(0, 4));
    }
    return null;
}

function normalizeGPAInput(value: string): string {
    let next = value.replace(',', '.').replace(/[^0-9.]/g, '');
    if (!next) {
        return '';
    }

    const firstDot = next.indexOf('.');
    if (firstDot !== -1) {
        next = `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replace(/\./g, '')}`;
    }

    if (!next.includes('.')) {
        if (next.length === 1) {
            next = `${next}.`;
        } else {
            next = `${next[0]}.${next.slice(1)}`;
        }
    }

    const [leftRaw, rightRaw = ''] = next.split('.');
    const left = (leftRaw || '0').slice(0, 1);
    const right = rightRaw.slice(0, 2);
    const normalized = `${left}.${right}`;

    if (Number(left) > 4) {
        return '4.00';
    }

    const parsed = Number(normalized);
    if (!Number.isNaN(parsed) && parsed > 4) {
        return '4.00';
    }

    return normalized.slice(0, 5);
}

function MonthField({
    label,
    value,
    onChange,
    error,
    minYear,
    maxYear,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    minYear: number;
    maxYear: number;
    disabled?: boolean;
}) {
    const normalized = normalizeEducationMonthValue(value);
    const selectedYear = normalized ? normalized.slice(0, 4) : '';
    const selectedMonth = normalized ? normalized.slice(5, 7) : '';
    const years = createYearOptions(minYear, maxYear);

    return (
        <div>
            <label className="text-sm font-medium text-slate-600">
                <RequiredLabel text={label} />
            </label>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                    value={selectedYear}
                    disabled={disabled}
                    onChange={(event) => {
                        const year = event.target.value;
                        if (!year) {
                            onChange('');
                            return;
                        }
                        onChange(selectedMonth ? `${year}-${selectedMonth}` : year);
                    }}
                    className="h-10 w-full rounded border border-slate-300 px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                    <option value="">Pilih tahun</option>
                    {years.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedMonth}
                    disabled={disabled || !selectedYear}
                    onChange={(event) => {
                        const month = event.target.value;
                        if (!selectedYear || !month) {
                            onChange('');
                            return;
                        }
                        onChange(`${selectedYear}-${month}`);
                    }}
                    className="h-10 w-full rounded border border-slate-300 px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                    <option value="">Pilih bulan</option>
                    {MONTH_OPTIONS.map((month) => (
                        <option key={month.value} value={month.value}>
                            {month.label}
                        </option>
                    ))}
                </select>
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function createYearOptions(minYear: number, maxYear: number): string[] {
    if (maxYear < minYear) {
        return [];
    }
    const years: string[] = [];
    for (let year = maxYear; year >= minYear; year -= 1) {
        years.push(String(year));
    }
    return years;
}

function SaveButton({ processing, recentlySuccessful, label }: { processing: boolean; recentlySuccessful: boolean; label: string }) {
    return (
        <div className="flex items-center gap-3">
            <button type="submit" disabled={processing} className="rounded bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{label}</button>
            <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                <p className="text-sm text-slate-600">Tersimpan.</p>
            </Transition>
        </div>
    );
}
function SectionActions({
    sectionLabel,
    isEditing,
    onEdit,
}: {
    sectionLabel: string;
    isEditing: boolean;
    onEdit: () => void;
}) {
    if (isEditing) {
        return (
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Mode edit aktif untuk {sectionLabel.toLowerCase()}.</p>
            </div>
        );
    }
    return (
        <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Section terkunci. Klik Edit untuk mengubah data.</p>
            <button
                type="button"
                onClick={onEdit}
                className="rounded bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
                Edit
            </button>
        </div>
    );
}
function SectionFooterActions({
    isEditing,
    processing,
    recentlySuccessful,
    saveLabel,
    onCancel,
}: {
    isEditing: boolean;
    processing: boolean;
    recentlySuccessful: boolean;
    saveLabel: string;
    onCancel: () => void;
}) {
    if (!isEditing) {
        return null;
    }
    return (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <button
                type="button"
                onClick={onCancel}
                className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
                Batal
            </button>
            <SaveButton processing={processing} recentlySuccessful={recentlySuccessful} label={saveLabel} />
        </div>
    );
}

function RequiredLabel({ text }: { text: string }) {
    const required = text.includes('*');
    const plain = text.replace('*', '').trim();

    return (
        <span>
            {plain}
            {required && <span className="text-red-500"> *</span>}
        </span>
    );
}

function Field({ label, value, onChange, error, type = 'text', maxLength, min, max, disabled = false }: { label: string; value: string; onChange: (value: string) => void; error?: string; type?: string; maxLength?: number; min?: number | string; max?: number | string; disabled?: boolean }) {
    return (
        <div>
            <label className="text-sm font-medium text-slate-600">
                <RequiredLabel text={label} />
            </label>
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} min={min} max={max} disabled={disabled} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function DateField({
    label,
    value,
    onChange,
    error,
    disabled = false,
    maxDate,
    toYear,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
    maxDate?: Date;
    toYear?: number;
}) {
    return (
        <div>
            <label className="text-sm font-medium text-slate-600">
                <RequiredLabel text={label} />
            </label>
            <div className="mt-1">
                <DatePickerInput
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    maxDate={maxDate}
                    toYear={toYear}
                    className={error ? 'border-destructive' : undefined}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function Select({ label, value, options, onChange, error, disabled = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; error?: string; disabled?: boolean }) {
    return (
        <div>
            <label className="text-sm font-medium text-slate-600">
                <RequiredLabel text={label} />
            </label>
            <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                <option value="">Pilih {label.replace('*', '').trim().toLowerCase()}</option>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function Area({ label, value, onChange, error, disabled = false }: { label: string; value: string; onChange: (value: string) => void; error?: string; disabled?: boolean }) {
    return (
        <div>
            <label className="text-sm font-medium text-slate-600">
                <RequiredLabel text={label} />
            </label>
            <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} disabled={disabled} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function Auto({ label, value, options, onValueChange, error, disabled = false, onInputChange, allowCustomValue = false }: { label: string; value: string; options: AutocompleteOption[]; onValueChange: (value: string) => void; error?: string; disabled?: boolean; onInputChange?: (value: string) => void; allowCustomValue?: boolean }) {
    return (
        <div>
            <label className="text-sm font-medium text-slate-600">
                <RequiredLabel text={label} />
            </label>
            <div className="mt-1">
                <AutocompleteInput options={options} value={value} onValueChange={onValueChange} onInputChange={onInputChange} allowCustomValue={allowCustomValue} disabled={disabled} />
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
