export interface Education {
    id: string;
    institution?: string;
    degree?: string;
    field_of_study?: string;
    start_year?: string;
    end_year?: string;
    gpa?: string;
}

export interface Experience {
    id: string;
    company?: string;
    position?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    is_current?: boolean;
}

export interface Certification {
    id: string;
    name?: string;
    issuing_organization?: string;
    issue_date?: string;
    expiry_date?: string;
    credential_id?: string;
    file_path?: string;
    file_url?: string;
    file_name?: string;
    file?: File | null;
}

export interface ApplicantProfilePayload {
    id: number;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    religion?: string | null;
    address?: string | null;
    domicile_address?: string | null;
    city?: string | null;
    province?: string | null;
    profile_photo_url?: string | null;
    educations: Education[];
    experiences: Experience[];
    certifications: Certification[];
    completion_percentage?: number;
    is_complete?: boolean;
}

export interface ApplicantProfileForm {
    personal: {
        full_name: string;
        email: string;
        phone: string;
        date_of_birth: string;
        gender: string;
        religion: string;
        address: string;
        domicile_address: string;
        city: string;
        province: string;
    };
    educations: Education[];
    experiences: Experience[];
    certifications: Certification[];
    profile_photo: File | null;
}

export type SectionKey = 'personal' | 'education' | 'experience' | 'certification' | 'photo';

export type RequiredEducationField = Exclude<keyof Education, 'id'>;
export type RequiredExperienceField =
    | 'company'
    | 'position'
    | 'start_date'
    | 'end_date'
    | 'description';
export type RequiredCertificationField =
    | 'name'
    | 'issuing_organization'
    | 'issue_date'
    | 'expiry_date';

export type FeedbackState =
    | {
          type: 'success' | 'error';
          message: string;
      }
    | null;

const generateId = () =>
    Math.random().toString(36).substring(2) + Date.now().toString(36);

export const createEmptyEducation = (): Education => ({
    id: generateId(),
    institution: '',
    degree: '',
    field_of_study: '',
    start_year: '',
    end_year: '',
    gpa: '',
});

export const createEmptyExperience = (): Experience => ({
    id: generateId(),
    company: '',
    position: '',
    start_date: '',
    end_date: '',
    description: '',
    is_current: false,
});

export const createEmptyCertification = (): Certification => ({
    id: generateId(),
    name: '',
    issuing_organization: '',
    issue_date: '',
    expiry_date: '',
    credential_id: '',
    file: null,
});

export const GPA_REQUIRED_DEGREES = ['D3', 'D4', 'S1', 'S2', 'S3'];

export const isEducationComplete = (education: Education): boolean => {
    const baseFields: RequiredEducationField[] = [
        'institution',
        'degree',
        'field_of_study',
        'start_year',
        'end_year',
    ];

    const isBaseComplete = baseFields.every((field) =>
        Boolean((education[field] ?? '').toString().trim()),
    );

    if (!isBaseComplete) {
        return false;
    }

    if (
        education.degree &&
        GPA_REQUIRED_DEGREES.includes(education.degree)
    ) {
        return Boolean((education.gpa ?? '').toString().trim());
    }

    return true;
};

export const isExperienceComplete = (experience: Experience): boolean => {
    const requiredValues = [
        experience.company,
        experience.position,
        experience.start_date,
        experience.description,
    ];

    const hasRequiredValues = requiredValues.every((value) =>
        Boolean((value ?? '').toString().trim()),
    );

    if (!hasRequiredValues) {
        return false;
    }

    if (experience.is_current) {
        return true;
    }

    return Boolean((experience.end_date ?? '').toString().trim());
};

export const isCertificationComplete = (
    certification: Certification,
): boolean =>
    [certification.name, certification.issuing_organization, certification.issue_date].every(
        (value) => Boolean((value ?? '').toString().trim()),
    );

