export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;
export const PASSWORD_SPECIAL_CHARACTERS = '!@#$%^&*.()';
export const PASSWORD_POLICY_ERROR_MESSAGE =
    'Password harus 8-16 karakter dan mengandung minimal 1 huruf besar, 1 huruf kecil, 1 angka, dan 1 karakter khusus (!@#$%^&*.()).';

export interface PasswordPolicyState {
    hasValidLength: boolean;
    hasMixedCase: boolean;
    hasNumberAndSpecialCharacter: boolean;
    isValid: boolean;
}

export function evaluatePasswordPolicy(password: string): PasswordPolicyState {
    const value = password ?? '';
    const hasValidLength =
        value.length >= PASSWORD_MIN_LENGTH &&
        value.length <= PASSWORD_MAX_LENGTH;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    const hasSpecialCharacter = /[!@#$%^&*.()]/.test(value);
    const hasMixedCase = hasUppercase && hasLowercase;
    const hasNumberAndSpecialCharacter = hasDigit && hasSpecialCharacter;

    return {
        hasValidLength,
        hasMixedCase,
        hasNumberAndSpecialCharacter,
        isValid:
            hasValidLength &&
            hasMixedCase &&
            hasNumberAndSpecialCharacter,
    };
}

export function passwordViolatesPolicy(password: string): boolean {
    return !evaluatePasswordPolicy(password).isValid;
}
