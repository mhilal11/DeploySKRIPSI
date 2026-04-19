import {
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
    validatePhoneNumberLength,
    type CountryCode,
} from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';

export interface PhoneCountryOption {
    code: CountryCode;
    name: string;
    callingCode: string;
    label: string;
}

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'ID';

const PHONE_LENGTH_OVERRIDES: Partial<Record<CountryCode, number[]>> = {
    ID: [8, 9, 10, 11, 12, 13],
};

const regionDisplayNames =
    typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
        ? new Intl.DisplayNames(['id', 'en'], { type: 'region' })
        : null;

const resolveCountryName = (code: CountryCode) =>
    regionDisplayNames?.of(code) ?? code;

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = getCountries()
    .map((code) => {
        const name = resolveCountryName(code);
        const callingCode = getCountryCallingCode(code);

        return {
            code,
            name,
            callingCode,
            label: `${name} (+${callingCode})`,
        };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'id'));

const stripToDigits = (value: string) => value.replace(/\D/g, '');

const getCountryCallingCodeSafe = (code: CountryCode) => {
    try {
        return getCountryCallingCode(code);
    } catch {
        return getCountryCallingCode(DEFAULT_PHONE_COUNTRY);
    }
};

export function normalizePhoneInput(value: string): string {
    return stripToDigits(value);
}

function getPossibleLengthsForCountry(country: CountryCode): number[] {
    const override = PHONE_LENGTH_OVERRIDES[country];
    if (override && override.length > 0) {
        return [...override];
    }

    const countryMetadata = (metadata as {
        countries?: Record<string, unknown[]>;
    }).countries?.[country];
    const lengths = Array.isArray(countryMetadata?.[3])
        ? (countryMetadata[3] as number[])
        : [];

    return Array.from(
        new Set(lengths.filter((length) => length >= 4 && length <= 15)),
    ).sort((left, right) => left - right);
}

function formatLengthList(lengths: number[]): string {
    if (lengths.length === 0) {
        return 'format nomor yang valid';
    }
    if (lengths.length === 1) {
        return `${lengths[0]} digit`;
    }

    const isSequential = lengths.every((length, index) =>
        index === 0 ? true : length === lengths[index - 1] + 1,
    );
    if (isSequential) {
        return `${lengths[0]}-${lengths[lengths.length - 1]} digit`;
    }

    if (lengths.length <= 4) {
        const head = lengths.slice(0, -1).join(', ');
        return `${head} atau ${lengths[lengths.length - 1]} digit`;
    }

    return `${lengths[0]}-${lengths[lengths.length - 1]} digit`;
}

export function getPhoneLengthHint(country: CountryCode): string {
    const option = PHONE_COUNTRY_OPTIONS.find((item) => item.code === country);
    const label = option?.name ?? country;
    const lengths = getPossibleLengthsForCountry(country);

    if (lengths.length === 0) {
        return `Masukkan nomor telepon aktif untuk ${label}.`;
    }

    return `${label}: ${formatLengthList(lengths)}.`;
}

export function validatePhoneNumberForCountry(
    country: CountryCode,
    localNumber: string,
): {
    isValid: boolean;
    message?: string;
} {
    const digits = normalizePhoneInput(localNumber);
    if (!digits) {
        return { isValid: false };
    }

    const option = PHONE_COUNTRY_OPTIONS.find((item) => item.code === country);
    const label = option?.name ?? country;
    const lengths = getPossibleLengthsForCountry(country);
    const hasLengthRule = lengths.length > 0;

    if (hasLengthRule && !lengths.includes(digits.length)) {
        return {
            isValid: false,
            message: `Nomor telepon ${label} harus ${formatLengthList(lengths)}.`,
        };
    }

    const lengthReason = validatePhoneNumberLength(digits, country);
    if (lengthReason === 'TOO_SHORT' || lengthReason === 'TOO_LONG' || lengthReason === 'INVALID_LENGTH') {
        return {
            isValid: false,
            message: hasLengthRule
                ? `Nomor telepon ${label} harus ${formatLengthList(lengths)}.`
                : `Panjang nomor telepon untuk ${label} belum valid.`,
        };
    }

    const parsed = parsePhoneNumberFromString(digits, country);
    if (parsed && !parsed.isPossible()) {
        return {
            isValid: false,
            message: `Format nomor telepon untuk ${label} belum valid.`,
        };
    }

    return { isValid: true };
}

export function buildInternationalPhoneValue(
    country: CountryCode,
    localNumber: string,
): string {
    const digits = stripToDigits(localNumber);
    if (!digits) {
        return '';
    }

    const parsed = parsePhoneNumberFromString(digits, country);
    if (parsed) {
        return parsed.number;
    }

    return `+${getCountryCallingCodeSafe(country)}${digits}`;
}

export function parseStoredPhoneNumber(value: string | null | undefined): {
    country: CountryCode;
    localNumber: string;
    internationalNumber: string;
} {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return {
            country: DEFAULT_PHONE_COUNTRY,
            localNumber: '',
            internationalNumber: '',
        };
    }

    const parsedInternational = parsePhoneNumberFromString(trimmed);
    if (parsedInternational?.country) {
        return {
            country: parsedInternational.country,
            localNumber: parsedInternational.nationalNumber,
            internationalNumber: parsedInternational.number,
        };
    }

    const parsedDefault = parsePhoneNumberFromString(trimmed, DEFAULT_PHONE_COUNTRY);
    if (parsedDefault) {
        return {
            country: parsedDefault.country ?? DEFAULT_PHONE_COUNTRY,
            localNumber: parsedDefault.nationalNumber,
            internationalNumber: parsedDefault.number,
        };
    }

    const digits = stripToDigits(trimmed);
    if (digits.startsWith('62') && digits.length > 2) {
        return {
            country: 'ID',
            localNumber: digits.slice(2),
            internationalNumber: `+${digits}`,
        };
    }

    return {
        country: DEFAULT_PHONE_COUNTRY,
        localNumber: digits,
        internationalNumber: buildInternationalPhoneValue(DEFAULT_PHONE_COUNTRY, digits),
    };
}

export function isPossiblePhoneNumberValue(value: string | null | undefined): boolean {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return false;
    }

    const parsedInternational = parsePhoneNumberFromString(trimmed);
    if (parsedInternational) {
        return parsedInternational.isPossible();
    }

    const parsedDefault = parsePhoneNumberFromString(trimmed, DEFAULT_PHONE_COUNTRY);
    if (parsedDefault) {
        return parsedDefault.isPossible();
    }

    const digits = stripToDigits(trimmed);
    return digits.length >= 8 && digits.length <= 15;
}
