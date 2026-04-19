import { Transition } from '@headlessui/react';
import { Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

import InputError from '@/shared/components/InputError';
import InputLabel from '@/shared/components/InputLabel';
import PasswordRequirementChecklist from '@/shared/components/PasswordRequirementChecklist';
import PrimaryButton from '@/shared/components/PrimaryButton';
import TextInput from '@/shared/components/TextInput';
import { useForm } from '@/shared/lib/inertia';
import {
    PASSWORD_POLICY_ERROR_MESSAGE,
    passwordViolatesPolicy,
} from '@/shared/lib/password-policy';

export default function UpdatePasswordForm({
    className = '',
}: {
    className?: string;
}) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] =
        useState(false);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        setError,
        clearErrors,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        if (passwordViolatesPolicy(data.password)) {
            setError('password', PASSWORD_POLICY_ERROR_MESSAGE);
            passwordInput.current?.focus();
            return;
        }

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    Update Password
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Ensure your account is using a long, random password to stay
                    secure.
                </p>
            </header>

            <form onSubmit={updatePassword} className="mt-6 space-y-6">
                <div>
                    <InputLabel
                        htmlFor="current_password"
                        value="Current Password"
                    />

                    <div className="relative mt-1">
                        <TextInput
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) =>
                                setData('current_password', e.target.value)
                            }
                            type={showCurrentPassword ? 'text' : 'password'}
                            className="block w-full pr-10"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                            onClick={() =>
                                setShowCurrentPassword((value) => !value)
                            }
                            aria-label={
                                showCurrentPassword
                                    ? 'Sembunyikan password saat ini'
                                    : 'Tampilkan password saat ini'
                            }
                        >
                            {showCurrentPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    <InputError
                        message={errors.current_password}
                        className="mt-2"
                    />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="New Password" />

                    <div className="relative mt-1">
                        <TextInput
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => {
                                clearErrors('password');
                                setData('password', e.target.value);
                            }}
                            type={showPassword ? 'text' : 'password'}
                            className="block w-full pr-10"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={
                                showPassword
                                    ? 'Sembunyikan password baru'
                                    : 'Tampilkan password baru'
                            }
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    <InputError message={errors.password} className="mt-2" />
                    <PasswordRequirementChecklist
                        password={data.password}
                        className="mt-3"
                    />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />

                    <div className="relative mt-1">
                        <TextInput
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            type={
                                showPasswordConfirmation ? 'text' : 'password'
                            }
                            className="block w-full pr-10"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                            onClick={() =>
                                setShowPasswordConfirmation((value) => !value)
                            }
                            aria-label={
                                showPasswordConfirmation
                                    ? 'Sembunyikan konfirmasi password'
                                    : 'Tampilkan konfirmasi password'
                            }
                        >
                            {showPasswordConfirmation ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton
                        disabled={processing}
                        className="!bg-blue-900 !text-white hover:!bg-blue-800 focus:!bg-blue-800 focus:!ring-blue-500 active:!bg-blue-950"
                    >
                        Save
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600">
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
