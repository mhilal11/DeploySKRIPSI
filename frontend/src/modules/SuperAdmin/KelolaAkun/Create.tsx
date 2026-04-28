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
const DEFAULT_SUCCESS_MESSAGE = 'Akun baru berhasil dibuat.';

interface CreateProps {
    roleOptions: string[];
    statusOptions: string[];
    divisionOptions: string[];
    religionOptions: string[];
    genderOptions: string[];
    educationLevelOptions: string[];
}

const today = new Date().toISOString().split('T')[0];

const roleRequiresDivision = (role: string) =>
    ['Admin', 'Staff'].includes(role);

export default function Create({
    roleOptions,
    statusOptions,
    divisionOptions,
    religionOptions,
    genderOptions,
    educationLevelOptions,
}: CreateProps) {
    const indexURL = route('super-admin.accounts.index');
    const defaultRole = '';

    const form = useForm({
        name: '',
        email: '',
        role: defaultRole,
        division: '',
        religion: '',
        gender: '',
        education_level: '',
        status: statusOptions[0] ?? 'Active',
        registered_at: today,
        inactive_at: '',
        password: '',
        password_confirmation: '',
    });

    const { role, division, religion, gender, education_level } = form.data;
    const setFormData = form.setData;
    const showDivision = roleRequiresDivision(role);

    useEffect(() => {
        if (!roleRequiresDivision(role) && division) {
            setFormData('division', '');
        }
    }, [role, division, setFormData]);

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

        if (passwordViolatesPolicy(form.data.password)) {
            form.setError('password', PASSWORD_POLICY_ERROR_MESSAGE);
            toast.error('Password belum memenuhi kebijakan.', {
                id: ACCOUNT_TOAST_ID,
                description: PASSWORD_POLICY_ERROR_MESSAGE,
            });
            return;
        }

        form.post(route('super-admin.accounts.store'), {
            forceFormData: true,
            onSuccess: (responseData) => {
                const message =
                    typeof responseData?.status === 'string' && responseData.status.length > 0
                        ? responseData.status
                        : DEFAULT_SUCCESS_MESSAGE;

                toast.success(message, {
                    id: ACCOUNT_TOAST_ID,
                });

                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(ACCOUNT_TOAST_STORAGE_KEY, message);
                }
                router.visit(indexURL, { replace: true });
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
                        : 'Gagal membuat akun. Coba lagi.',
                    {
                        id: ACCOUNT_TOAST_ID,
                    },
                );
            },
        });
    };

    return (
        <SuperAdminLayout
            title="Tambah Akun"
            description="Buat akun baru untuk pengguna sistem"
            breadcrumbs={[
                { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Kelola Akun', href: route('super-admin.accounts.index') },
                { label: 'Tambah Akun' },
            ]}
        >
            <Head title="Tambah Akun" />

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
                setData={(key, value) =>
                    form.setData(key, value ?? '')
                }
                onSubmit={handleSubmit}
                showDivision={showDivision}
                showPasswordFields
                submitLabel="Simpan Akun"
                secondaryAction={
                    <ButtonLink href={route('super-admin.accounts.index')}>
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



