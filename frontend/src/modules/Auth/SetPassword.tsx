import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Image from 'next/image';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

import InputError from '@/shared/components/InputError';
import PasswordRequirementChecklist from '@/shared/components/PasswordRequirementChecklist';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Head, useForm } from '@/shared/lib/inertia';
import { normalizeEmail } from '@/shared/lib/input-validation';
import {
    PASSWORD_POLICY_ERROR_MESSAGE,
    passwordViolatesPolicy,
} from '@/shared/lib/password-policy';

const logo = '/img/LogoLDP.png';

function resolveEmailFromURL(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('email') ?? '';
    return normalizeEmail(raw);
}

export default function SetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const initialEmail = (email ?? '').trim().toLowerCase();
    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        token: token,
        email: initialEmail,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        void import('gsap').then(({ gsap }) => {
            if (!mounted) {
                return;
            }
            if (containerRef.current) {
                gsap.from(containerRef.current, {
                    opacity: 0,
                    duration: 0.4,
                });
            }

            if (cardRef.current) {
                gsap.from(cardRef.current, {
                    opacity: 0,
                    y: 30,
                    duration: 0.8,
                    delay: 0.15,
                    ease: 'power3.out',
                });
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if ((data.email ?? '').trim() !== '') {
            return;
        }
        const fallbackEmail = resolveEmailFromURL();
        if (fallbackEmail !== '') {
            setData('email', fallbackEmail);
        }
    }, [data.email, setData]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (passwordViolatesPolicy(data.password)) {
            setError('password', PASSWORD_POLICY_ERROR_MESSAGE);
            return;
        }

        post('/reset-password', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Atur Password" />

            <div className="relative min-h-screen bg-black px-4 py-10 text-white overflow-hidden">
                <div className="pointer-events-none absolute right-4 top-20 h-40 w-40 animate-pulse rounded-full bg-cyan-500/20 blur-3xl sm:right-10 sm:h-48 sm:w-48 md:h-72 md:w-72" />
                <div
                    className="pointer-events-none absolute bottom-16 left-0 h-52 w-52 animate-pulse rounded-full bg-purple-500/20 blur-3xl sm:left-10 sm:h-64 sm:w-64 md:h-96 md:w-96"
                    style={{ animationDelay: '1s' }}
                />
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-blue-500/10 blur-3xl sm:h-80 sm:w-80 md:h-96 md:w-96"
                    style={{ animationDelay: '0.5s' }}
                />

                <div
                    ref={containerRef}
                    className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-center"
                >
                    <div className="w-full max-w-md">
                        <div
                            ref={cardRef}
                            className="bg-white/10 backdrop-blur-[26px] rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] border border-white/15 p-8 md:p-10"
                        >
                            <div className="mb-8 text-center">
                                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white/10">
                                    <Image
                                        src={logo}
                                        alt="Lintas Data Prima"
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 object-contain"
                                    />
                                </div>
                                <h1 className="text-3xl text-white mb-2">
                                    Atur Kata Sandi
                                </h1>
                                <p className="text-white/80">
                                    Buat kata sandi pertama untuk akun Anda
                                </p>
                            </div>

                            <form onSubmit={submit} className="space-y-6">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="email"
                                        className="text-sm font-medium text-white/90"
                                    >
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={data.email}
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 text-base text-white placeholder:text-white/60 focus-visible:border-[#2F6DB5]/60 focus-visible:ring-[#2F6DB5]/60 backdrop-blur-sm"
                                            autoComplete="username"
                                            readOnly
                                        />
                                    </div>
                                    <InputError message={errors.email} className="text-sm text-red-300" />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-white/90"
                                    >
                                        Kata Sandi Baru
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={data.password}
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 pr-12 text-base text-white placeholder:text-white/60 focus-visible:border-[#2F6DB5]/60 focus-visible:ring-[#2F6DB5]/60 backdrop-blur-sm"
                                            autoComplete="new-password"
                                            autoFocus
                                            onChange={(e) => {
                                                clearErrors('password');
                                                setData('password', e.target.value);
                                            }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white/80"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError message={errors.password} className="text-sm text-red-300" />
                                    <PasswordRequirementChecklist
                                        password={data.password}
                                        variant="dark"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="password_confirmation"
                                        className="text-sm font-medium text-white/90"
                                    >
                                        Konfirmasi Kata Sandi
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                                        <Input
                                            id="password_confirmation"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="password_confirmation"
                                            value={data.password_confirmation}
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 pr-12 text-base text-white placeholder:text-white/60 focus-visible:border-[#2F6DB5]/60 focus-visible:ring-[#2F6DB5]/60 backdrop-blur-sm"
                                            autoComplete="new-password"
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white/80"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError message={errors.password_confirmation} className="text-sm text-red-300" />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 w-full bg-[#0F4C81] hover:bg-[#0C3E6B] text-base font-semibold text-white shadow-[0_8px_32px_rgba(47,109,181,0.32)] border border-[#2F6DB5]/30 rounded-[20px]"
                                >
                                    {processing ? 'Memproses...' : 'Atur Kata Sandi'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

