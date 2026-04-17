export const MAX_COMMON_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

const emailPattern =
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const personNamePattern = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
const disallowedPersonNameCharsPattern = /[^\p{L}\p{M}\s'-]/gu;

export const PERSON_NAME_ERROR_MESSAGE =
    "Nama hanya boleh berisi huruf, spasi, tanda hubung (-), dan apostrof (').";

export function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function sanitizePersonNameInput(value: string): string {
    return value.replace(disallowedPersonNameCharsPattern, '');
}

export function normalizePersonName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

export function isValidPersonName(value: string): boolean {
    const normalized = normalizePersonName(value);
    if (!normalized) {
        return false;
    }
    return personNamePattern.test(normalized);
}

export function isValidEmail(value: string): boolean {
    const normalized = normalizeEmail(value);
    if (!normalized || normalized.length > 254) {
        return false;
    }
    if (/\s/.test(normalized)) {
        return false;
    }
    return emailPattern.test(normalized);
}

export interface FileValidationRule {
    allowedExtensions: string[];
    allowedMimeTypes: string[];
    maxSizeBytes?: number;
}

export const imageUploadRule: FileValidationRule = {
    allowedExtensions: ['png', 'jpg', 'jpeg'],
    allowedMimeTypes: ['image/png', 'image/jpeg'],
    maxSizeBytes: MAX_COMMON_UPLOAD_SIZE_BYTES,
};

export const documentUploadRule: FileValidationRule = {
    allowedExtensions: ['pdf', 'doc', 'docx'],
    allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSizeBytes: MAX_COMMON_UPLOAD_SIZE_BYTES,
};

export const pdfUploadRule: FileValidationRule = {
    allowedExtensions: ['pdf'],
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: MAX_COMMON_UPLOAD_SIZE_BYTES,
};

export const imageOrPdfUploadRule: FileValidationRule = {
    allowedExtensions: ['png', 'jpg', 'jpeg', 'pdf'],
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    maxSizeBytes: MAX_COMMON_UPLOAD_SIZE_BYTES,
};

export function validateFile(file: File, rule: FileValidationRule): string | null {
    const normalizedMime = file.type.trim().toLowerCase();
    const extension = file.name.split('.').pop()?.trim().toLowerCase() ?? '';

    if (
        !rule.allowedMimeTypes.includes(normalizedMime) &&
        !rule.allowedExtensions.includes(extension)
    ) {
        return 'Format file tidak didukung.';
    }

    if (
        typeof rule.maxSizeBytes === 'number' &&
        file.size > rule.maxSizeBytes
    ) {
        return `Ukuran file maksimal ${Math.round(rule.maxSizeBytes / 1024 / 1024)}MB.`;
    }

    return null;
}
