import { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

import AccountForm from '@/modules/SuperAdmin/components/accounts/AccountForm';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Head, Link, router, useForm } from '@/shared/lib/inertia';
import {
    PASSWORD_POLICY_ERROR_MESSAGE,
    passwordViolatesPolicy,
} from '@/shared/lib/password-policy';

const ACCOUNT_TOAST_ID = 'super-admin.accounts.feedback';
const ACCOUNT_TOAST_STORAGE_KEY = 'super-admin.accounts.toast';
const DEFAULT_SUCCESS_MESSAGE = 'Akun berhasil diperbarui.';

interface EditProps {
    user: {
        id: number;
        employee_code?: string | null;
        name: string;
        email: string;
        role: string;
        division?: string | null;
        religion?: string | null;
        gender?: string | null;
        education_level?: string | null;
        status: string;
        registered_at?: string | null;
        inactive_at?: string | null;
    };
    roleOptions: string[];
    statusOptions: string[];
    divisionOptions: string[];
    religionOptions: string[];
    genderOptions: string[];
    educationLevelOptions: string[];
}

const roleRequiresDivision = (role: string) =>
    ['Admin', 'Staff'].includes(role);

export default function Edit({
    user,
    roleOptions,
    statusOptions,
    divisionOptions,
    religionOptions,
    genderOptions,
    educationLevelOptions,
}: EditProps) {
    const indexURL = route('super-admin.accounts.index');
    const returnURL =
        typeof window !== 'undefined'
            ? (() => {
                const raw = new URLSearchParams(window.location.search).get('return_to') ?? '';
                const trimmed = raw.trim();
                if (trimmed.startsWith('/super-admin/accounts')) {
                    return trimmed;
                }
                if (/^https?:\/\//i.test(trimmed)) {
                    try {
                        const parsed = new URL(trimmed);
                        if (parsed.pathname.startsWith('/super-admin/accounts')) {
                            return parsed.pathname + parsed.search;
                        }
                    } catch {
                        // fall back to index URL
                    }
                }
                return indexURL;
            })()
            : indexURL;

    const form = useForm({
        employee_code: user.employee_code ?? '',
        name: user.name,
        email: user.email,
        role: user.role,
        division: user.division ?? '',
        religion: user.religion ?? '',
        gender: user.gender ?? '',
        education_level: user.education_level ?? '',
        status: user.status,
        registered_at: user.registered_at ?? '',
        inactive_at: user.inactive_at ?? '',
        password: '',
        password_confirmation: '',
    });

    const { role, religion, gender, education_level } = form.data;
    const setFormData = form.setData;
    const showDivision = roleRequiresDivision(role);

    useEffect(() => {
        if (!roleRequiresDivision(role)) {
            setFormData('division', '');
        }
    }, [role, setFormData]);

    useEffect(() => {
        if (role === 'Staff') {
            return;
        }

        if (religion) {
            setFormData('religion', '');
        }
        if (gender) {
            setFormData('gender', '');
        }
        if (education_level) {
            setFormData('education_level', '');
        }
    }, [role, religion, gender, education_level, setFormData]);

    useEffect(() => {
        if (form.errors.password && form.data.password.trim() !== '') {
            form.clearErrors('password');
        }
    }, [form, form.data.password, form.errors.password]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (
            form.data.password.trim() !== '' &&
            passwordViolatesPolicy(form.data.password)
        ) {
            form.setError('password', PASSWORD_POLICY_ERROR_MESSAGE);
            toast.error('Password belum memenuhi kebijakan.', {
                id: ACCOUNT_TOAST_ID,
                description: PASSWORD_POLICY_ERROR_MESSAGE,
            });
            return;
        }

        form.put(route('super-admin.accounts.update', user.id), {
            forceFormData: true,
            onSuccess: (responseData) => {
                const message =
                    typeof responseData?.status === 'string' && responseData.status.length > 0
                        ? responseData.status
                        : DEFAULT_SUCCESS_MESSAGE;

                // Show feedback immediately on edit page.
                // The toaster lives in SuperAdminShell, so it persists across navigation.
                toast.success(message, {
                    id: ACCOUNT_TOAST_ID,
                });

                // Keep queued toast as fallback in case the destination page
                // needs to re-show feedback after transition.
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(ACCOUNT_TOAST_STORAGE_KEY, message);
                }

                router.visit(returnURL);
            },
            onError: (errors) => {
                const firstError = errors
                    ? Object.values(errors).find(
                        (value) => typeof value === 'string' && value.trim().length > 0,
                    )
                    : null;
                toast.error(
                    typeof firstError === 'string'
                        ? firstError
                        : 'Gagal memperbarui akun. Coba lagi.',
                    {
                        id: ACCOUNT_TOAST_ID,
                    },
                );
            },
        });
    };

    return (
        <SuperAdminLayout
            title="Edit Akun"
            description={`Perbarui informasi akun ${user.name}`}
            breadcrumbs={[
                { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Kelola Akun', href: returnURL },
                { label: 'Edit Akun' },
            ]}
        >
            <Head title="Edit Akun" />

            <AccountForm
                data={form.data}
                errors={form.errors}
                processing={form.processing}
                roleOptions={roleOptions}
                divisionOptions={divisionOptions}
                statusOptions={statusOptions}
                religionOptions={religionOptions}
                genderOptions={genderOptions}
                educationLevelOptions={educationLevelOptions}
                setData={(key, value) => form.setData(key, value ?? '')}
                onSubmit={handleSubmit}
                showDivision={showDivision}
                showPasswordFields
                submitLabel="Perbarui Akun"
                secondaryAction={
                    <ButtonLink href={returnURL}>
                        Kembali ke daftar
                    </ButtonLink>
                }
            />
        </SuperAdminLayout>
    );
}

function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="text-sm text-blue-900 underline-offset-2 hover:underline"
        >
            {children}
        </Link>
    );
}






