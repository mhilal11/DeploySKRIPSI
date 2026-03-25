import StaffLayout from '@/modules/Staff/components/Layout';
import StaffShell from '@/modules/Staff/components/StaffShell';
import { Card } from '@/shared/components/ui/card';
import AuthenticatedLayout from '@/shared/layouts/AuthenticatedLayout';
import { Head, usePage } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdateStaffProfileInformationForm from './Partials/UpdateStaffProfileInformationForm';

export default function Edit() {
    const { props } = usePage<PageProps<{
        mustVerifyEmail: boolean;
        status?: string;
        staffProfile?: {
            phone?: string | null;
            date_of_birth?: string | null;
            gender?: string | null;
            religion?: string | null;
            address?: string | null;
            domicile_address?: string | null;
            city?: string | null;
            province?: string | null;
            education_level?: string | null;
            educations?: Array<{
                institution: string;
                degree: string;
                field_of_study: string;
                start_year: string;
                end_year: string;
                gpa: string;
            }>;
        };
        religionOptions?: string[];
        genderOptions?: string[];
        educationLevelOptions?: string[];
    }>>();
    const user = props?.auth?.user;
    const isStaff = user?.role === 'Staff';

    if (isStaff) {
        return (
            <StaffShell>
                <Head title="Profil Staff" />
                <StaffLayout
                    title="Profil Saya"
                    description="Kelola informasi akun dan keamanan profil Anda."
                >
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="p-6 lg:col-span-1">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
                                    {(user?.name?.[0] ?? 'U').toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-slate-900">{user?.name ?? 'User'}</p>
                                    <p className="text-sm text-slate-500">{user?.email ?? '-'}</p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Role</span>
                                    <span className="font-medium text-slate-900">{user?.role ?? '-'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Divisi</span>
                                    <span className="font-medium text-slate-900">{user?.division ?? '-'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Kode Karyawan</span>
                                    <span className="font-medium text-slate-900">{user?.employee_code ?? '-'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Status</span>
                                    <span className="font-medium text-slate-900">{user?.status ?? '-'}</span>
                                </div>
                            </div>
                        </Card>

                        <div className="space-y-6 lg:col-span-2">
                            <Card className="p-6">
                                <UpdateStaffProfileInformationForm
                                    className="max-w-none"
                                    profile={props.staffProfile}
                                    religionOptions={props.religionOptions ?? []}
                                    genderOptions={props.genderOptions ?? []}
                                    educationLevelOptions={props.educationLevelOptions ?? []}
                                />
                            </Card>
                        </div>
                    </div>
                </StaffLayout>
            </StaffShell>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Profile
                </h2>
            }
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8 space-y-8">
                        <UpdateProfileInformationForm className="max-w-xl" />
                        <div className="border-t border-slate-200" />
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
