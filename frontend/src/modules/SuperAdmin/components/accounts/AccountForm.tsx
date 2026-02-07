import { FormEvent } from 'react';

interface AccountFormState {
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
    password?: string;
    password_confirmation?: string;
}

type EditableField = Exclude<keyof AccountFormState, 'employee_code'>;

interface AccountFormProps {
    data: AccountFormState;
    errors: Record<string, string>;
    processing: boolean;
    roleOptions: string[];
    divisionOptions: string[];
    statusOptions: string[];
    religionOptions: string[];
    genderOptions: string[];
    educationLevelOptions: string[];
    setData: (key: EditableField, value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    showDivision: boolean;
    showPasswordFields: boolean;
    submitLabel: string;
    secondaryAction?: React.ReactNode;
}

export default function AccountForm({
    data,
    errors,
    processing,
    roleOptions,
    divisionOptions,
    statusOptions,
    religionOptions,
    genderOptions,
    educationLevelOptions,
    setData,
    onSubmit,
    showDivision,
    showPasswordFields,
    submitLabel,
    secondaryAction,
}: AccountFormProps) {
    const filteredRoleOptions =
        data.role === 'Super Admin'
            ? roleOptions
            : roleOptions.filter((role) => role !== 'Super Admin');
    const isStaffRole = data.role === 'Staff';

    const handleStatusChange = (nextStatus: string) => {
        setData('status', nextStatus);

        if (nextStatus === 'Inactive') {
            const value = data.inactive_at && data.inactive_at.length > 0
                ? data.inactive_at
                : new Date().toISOString().split('T')[0];
            setData('inactive_at', value);
            return;
        }

        setData('inactive_at', '');
    };

    return (
        <form
            onSubmit={onSubmit}
            className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
        >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {data.employee_code && (
                    <div>
                        <label className="text-sm font-medium text-slate-600">
                            User ID
                        </label>
                        <input
                            id="employee_code"
                            value={data.employee_code}
                            disabled
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm text-slate-600"
                        />
                    </div>
                )}
                <div>
                    <label
                        className="text-sm font-medium text-slate-600"
                        htmlFor="name"
                    >
                        Nama Lengkap
                    </label>
                    <input
                        id="name"
                        value={data.name}
                        onChange={(e) => {
                            // Only allow letters, spaces, apostrophes, and hyphens
                            const value = e.target.value.replace(/[^a-zA-Z\s'-]/g, '');
                            setData('name', value);
                        }}
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {errors.name && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.name}
                        </p>
                    )}
                </div>
                <div>
                    <label
                        className="text-sm font-medium text-slate-600"
                        htmlFor="email"
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) =>
                            setData('email', e.target.value.toLowerCase())
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {errors.email && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.email}
                        </p>
                    )}
                </div>
                <div>
                    <label
                        className="text-sm font-medium text-slate-600"
                        htmlFor="role"
                    >
                        Role
                    </label>
                    <select
                        id="role"
                        value={data.role}
                        onChange={(event) =>
                            setData('role', event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">Pilih role</option>
                        {filteredRoleOptions.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </select>
                    {errors.role && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.role}
                        </p>
                    )}
                </div>
                {showDivision && (
                    <div>
                        <label
                            className="text-sm font-medium text-slate-600"
                            htmlFor="division"
                        >
                            Divisi
                        </label>
                        <select
                            id="division"
                            value={data.division ?? ''}
                            onChange={(event) =>
                                setData('division', event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Pilih divisi</option>
                            {divisionOptions.map((division) => (
                                <option key={division} value={division}>
                                    {division}
                                </option>
                            ))}
                        </select>
                        {errors.division && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.division}
                            </p>
                        )}
                    </div>
                )}
                {isStaffRole && (
                    <>
                        <div>
                            <label
                                className="text-sm font-medium text-slate-600"
                                htmlFor="religion"
                            >
                                Agama
                            </label>
                            <select
                                id="religion"
                                value={data.religion ?? ''}
                                onChange={(event) =>
                                    setData('religion', event.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Pilih agama</option>
                                {religionOptions.map((religion) => (
                                    <option key={religion} value={religion}>
                                        {religion}
                                    </option>
                                ))}
                            </select>
                            {errors.religion && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.religion}
                                </p>
                            )}
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium text-slate-600"
                                htmlFor="gender"
                            >
                                Jenis Kelamin
                            </label>
                            <select
                                id="gender"
                                value={data.gender ?? ''}
                                onChange={(event) =>
                                    setData('gender', event.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Pilih jenis kelamin</option>
                                {genderOptions.map((gender) => (
                                    <option key={gender} value={gender}>
                                        {gender}
                                    </option>
                                ))}
                            </select>
                            {errors.gender && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.gender}
                                </p>
                            )}
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium text-slate-600"
                                htmlFor="education_level"
                            >
                                Tingkat Pendidikan
                            </label>
                            <select
                                id="education_level"
                                value={data.education_level ?? ''}
                                onChange={(event) =>
                                    setData('education_level', event.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Pilih tingkat pendidikan</option>
                                {educationLevelOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                            {errors.education_level && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.education_level}
                                </p>
                            )}
                        </div>
                    </>
                )}
                <div>
                    <label
                        className="text-sm font-medium text-slate-600"
                        htmlFor="status"
                    >
                        Status
                    </label>
                    <select
                        id="status"
                        value={data.status}
                        onChange={(event) =>
                            handleStatusChange(event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    {errors.status && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.status}
                        </p>
                    )}
                </div>
                <div>
                    <label
                        className="text-sm font-medium text-slate-600"
                        htmlFor="inactive_at"
                    >
                        Tanggal Nonaktif
                    </label>
                    <input
                        id="inactive_at"
                        type="date"
                        value={data.inactive_at ?? ''}
                        onChange={(event) =>
                            setData('inactive_at', event.target.value)
                        }
                        disabled={data.status !== 'Inactive'}
                        className={`mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                            data.status !== 'Inactive'
                                ? 'bg-slate-50 text-slate-400'
                                : ''
                        }`}
                    />
                    {data.status !== 'Inactive' && (
                        <p className="mt-1 text-xs text-slate-500">
                            Tanggal nonaktif akan otomatis diisi saat status
                            menjadi Inactive
                        </p>
                    )}
                    {errors.inactive_at && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.inactive_at}
                        </p>
                    )}
                </div>
                <div>
                    <label
                        className="text-sm font-medium text-slate-600"
                        htmlFor="registered_at"
                    >
                        Tanggal Terdaftar
                    </label>
                    <input
                        id="registered_at"
                        type="date"
                        value={data.registered_at ?? ''}
                        onChange={(e) =>
                            setData('registered_at', e.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {errors.registered_at && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.registered_at}
                        </p>
                    )}
                </div>
            </div>

            {showPasswordFields && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <label
                            className="text-sm font-medium text-slate-600"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={data.password ?? ''}
                            onChange={(e) => setData('password', e.target.value)}
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.password}
                            </p>
                        )}
                    </div>
                    <div>
                        <label
                            className="text-sm font-medium text-slate-600"
                            htmlFor="password_confirmation"
                        >
                            Konfirmasi Password
                        </label>
                        <input
                            id="password_confirmation"
                            type="password"
                            value={data.password_confirmation ?? ''}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {secondaryAction}
                <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-900 px-6 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={processing}
                >
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

