import { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

import AccountForm from '@/modules/SuperAdmin/components/accounts/AccountForm';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import { Head, Link, router, useForm } from '@/shared/lib/inertia';


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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.put(route('super-admin.accounts.update', user.id), {
            forceFormData: true,
            onSuccess: (responseData) => {
                const message =
                    typeof responseData?.status === 'string' && responseData.status.length > 0
                        ? responseData.status
                        : 'Akun berhasil diperbarui.';
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('super-admin.accounts.toast', message);
                }
                router.visit(route('super-admin.accounts.index'), { replace: true });
            },
            onError: (errors) => {
                if (!errors || Object.keys(errors).length === 0) {
                    toast.error('Gagal memperbarui akun. Coba lagi.');
                }
            },
        });
    };

    return (
        <SuperAdminLayout
            title="Edit Akun"
            description={`Perbarui informasi akun ${user.name}`}
            breadcrumbs={[
                { label: 'Super Admin', href: route('super-admin.dashboard') },
                { label: 'Kelola Akun', href: route('super-admin.accounts.index') },
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





