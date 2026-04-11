import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';

import InputError from '@/shared/components/InputError';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { api, apiUrl, ensureCsrfToken, isAxiosError } from '@/shared/lib/api';
import { Head, useForm } from '@/shared/lib/inertia';
import { markLandingSplashSkipOnce } from '@/shared/lib/landing-splash';
import { queueLoginSuccessToast } from '@/shared/lib/login-success-toast';



const logo = '/img/LogoLDP.png';
const REGISTER_SUCCESS_TOAST_KEY = 'auth_register_success_toast';

export default function Login({
    status,
    canResetPassword,
    oauth_error,
}: {
    status?: string;
    canResetPassword: boolean;
    oauth_error?: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });
    type ExtendedErrors = typeof errors & {
        credentials?: string;
        account_status?: string;
        verification_email?: string;
        verification_resend_available?: string;
    };
    const typedErrors = errors as ExtendedErrors;
    const credentialError = typedErrors.credentials;
    const inactiveMessage = typedErrors.account_status;
    const verificationEmail = typedErrors.verification_email?.trim() || data.email.trim();
    const canResendVerification =
        typedErrors.verification_resend_available === '1' &&
        verificationEmail !== '';
    const normalizedStatus = status?.trim().toLowerCase() ?? '';
    const statusMessage =
        normalizedStatus === 'email-verified'
            ? 'Email berhasil diverifikasi. Silakan login.'
            : status;
    const [showInactiveDialog, setShowInactiveDialog] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isResendingVerification, setIsResendingVerification] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        markLandingSplashSkipOnce();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const queuedToast = window.sessionStorage.getItem(
            REGISTER_SUCCESS_TOAST_KEY,
        );
        if (!queuedToast) {
            return;
        }

        window.sessionStorage.removeItem(REGISTER_SUCCESS_TOAST_KEY);

        try {
            const parsed = JSON.parse(queuedToast) as {
                title?: string;
                description?: string;
            };
            toast.success(parsed.title ?? 'Pendaftaran berhasil.', {
                description:
                    parsed.description ??
                    'Akun berhasil dibuat. Silakan verifikasi email Anda terlebih dahulu sebelum login.',
            });
        } catch {
            toast.success('Pendaftaran berhasil.', {
                description: 'Akun berhasil dibuat. Silakan verifikasi email Anda terlebih dahulu sebelum login.',
            });
        }
    }, []);

    useEffect(() => {
        if (inactiveMessage) {
            setShowInactiveDialog(true);
        }
    }, [inactiveMessage]);

    useEffect(() => {
        if (normalizedStatus !== 'email-verified') {
            return;
        }

        toast.success('Email berhasil diverifikasi.', {
            description: 'Akun Anda sudah aktif. Silakan login.',
        });
    }, [normalizedStatus]);

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post('/login', {
            onSuccess: (responseData: any) => {
                if (
                    typeof window !== 'undefined' &&
                    (responseData?.user?.role === 'Pelamar' ||
                        responseData?.redirect_to === '/pelamar/dashboard')
                ) {
                    queueLoginSuccessToast('pelamar');
                    return;
                }
                if (
                    typeof window !== 'undefined' &&
                    (responseData?.user?.role === 'Admin' ||
                        String(responseData?.redirect_to ?? '').includes('/admin-staff'))
                ) {
                    queueLoginSuccessToast('adminStaff');
                    return;
                }
                if (
                    typeof window !== 'undefined' &&
                    (responseData?.user?.role === 'Staff' ||
                        String(responseData?.redirect_to ?? '').includes('/staff'))
                ) {
                    queueLoginSuccessToast('staff');
                    return;
                }
                if (
                    typeof window !== 'undefined' &&
                    ((responseData?.user?.role === 'Super Admin' || responseData?.user?.role === 'SuperAdmin') ||
                        String(responseData?.redirect_to ?? '').includes('/super-admin'))
                ) {
                    queueLoginSuccessToast('superAdmin');
                    return;
                }
                toast.success('Login berhasil.', {
                    description: 'Selamat datang kembali.',
                });
            },
            onError: (formErrors) => {
                const firstError = Object.entries(formErrors).find(
                    ([key, message]) =>
                        !['verification_email', 'verification_resend_available'].includes(key) &&
                        typeof message === 'string' &&
                        message.trim() !== '',
                )?.[1];

                toast.error('Login gagal.', {
                    description:
                        typeof firstError === 'string'
                            ? firstError
                            : 'Periksa kembali email dan kata sandi Anda.',
                });
            },
            onFinish: () => reset('password'),
        });
    };

    const handleResendVerification = async () => {
        if (!canResendVerification || isResendingVerification) {
            return;
        }

        setIsResendingVerification(true);
        try {
            await ensureCsrfToken();
            const { data: responseData } = await api.post(
                apiUrl('/email/verification-notification'),
                { email: verificationEmail },
            );
            toast.success('Email verifikasi dikirim ulang.', {
                description:
                    responseData?.email_target
                        ? `Tautan verifikasi baru telah dikirim ke ${responseData.email_target}.`
                        : 'Silakan cek inbox email Anda.',
            });
        } catch (error) {
            const responseData = isAxiosError(error) ? error.response?.data as { errors?: Record<string, string>; message?: string } | undefined : undefined;
            const firstError = responseData?.errors
                ? Object.values(responseData.errors).find(
                    (message) => typeof message === 'string' && message.trim() !== '',
                )
                : undefined;

            toast.error('Gagal mengirim ulang verifikasi.', {
                description:
                    firstError ||
                    responseData?.message ||
                    'Silakan coba lagi dalam beberapa saat.',
            });
        } finally {
            setIsResendingVerification(false);
        }
    };

    return (
        <>
            <Head title="Masuk" />

            <div className="relative min-h-screen bg-gradient-to-br from-[#0a0f1f] via-[#0b152b] to-[#060910] px-4 py-10 text-white overflow-hidden">
                <div className="pointer-events-none absolute top-16 right-12 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
                <div
                    className="pointer-events-none absolute bottom-10 left-10 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl"
                    style={{ animationDelay: '0.5s' }}
                />

                <div
                    ref={containerRef}
                    className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-center"
                >
                    <div className="w-full max-w-md">
                        <Link
                            href="/"
                            onClick={() => markLandingSplashSkipOnce()}
                            className="mb-6 inline-flex items-center gap-2 text-sm text-white/80 transition hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Kembali ke Beranda
                        </Link>

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
                                    Selamat Datang Kembali
                                </h1>
                                <p className="text-white/80">
                                    Masuk ke akun Lintas Data Prima Anda
                                </p>
                            </div>

                            {statusMessage && normalizedStatus !== 'email-verified' && (
                                <div className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                                    {statusMessage}
                                </div>
                            )}

                            {credentialError && (
                                <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                                    <p>{credentialError}</p>
                                    {canResendVerification && (
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <p className="text-xs text-red-100/90">
                                                Link verifikasi sebelumnya sudah lebih dari 1 jam.
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleResendVerification}
                                                disabled={isResendingVerification}
                                                className="border-red-200/40 bg-transparent text-red-100 hover:bg-red-400/10 hover:text-white"
                                            >
                                                {isResendingVerification
                                                    ? 'Mengirim ulang...'
                                                    : 'Verifikasi Ulang Email'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {oauth_error && (
                                <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                                    {oauth_error}
                                </div>
                            )}

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
                                            autoComplete="username"
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 text-base text-white placeholder:text-white/60 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/50 backdrop-blur-sm"
                                            onChange={(e) =>
                                                setData('email', e.target.value.toLowerCase())
                                            }
                                        />
                                    </div>
                                    <InputError
                                        message={errors.email}
                                        className="text-sm text-red-300"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label
                                            htmlFor="password"
                                            className="text-sm font-medium text-white/90"
                                        >
                                            Kata Sandi
                                        </label>
                                        {canResetPassword && (
                                            <Link
                                                href="/forgot-password"
                                                className="text-sm text-cyan-400 hover:text-cyan-300"
                                            >
                                                Lupa kata sandi?
                                            </Link>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={data.password}
                                            autoComplete="current-password"
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 pr-12 text-base text-white placeholder:text-white/60 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/50 backdrop-blur-sm"
                                            onChange={(e) =>
                                                setData('password', e.target.value)
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((prev) => !prev)
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white/80"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError
                                        message={errors.password}
                                        className="text-sm text-red-300"
                                    />
                                </div>

                                <div className="flex items-center justify-between text-sm text-white/80">
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            id="remember"
                                            name="remember"
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(e) =>
                                                setData('remember', e.target.checked)
                                            }
                                            className="h-4 w-4 rounded border-white/40 bg-white/10 text-cyan-400 focus:ring-cyan-400"
                                        />
                                        Ingat saya
                                    </label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-base font-semibold text-white shadow-[0_8px_32px_rgba(34,211,238,0.5)] border border-cyan-400/30 rounded-[20px]"
                                >
                                    {processing ? 'Memproses...' : 'Masuk'}
                                </Button>

                            </form>

                            <div className="mt-8 text-center text-sm text-white/80">
                                Belum punya akun?{' '}
                                <Link
                                    href="/register"
                                    className="font-semibold text-cyan-300 hover:text-cyan-200"
                                >
                                    Daftar sekarang
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {inactiveMessage && (
                <AlertDialog
                    open={showInactiveDialog}
                    onOpenChange={setShowInactiveDialog}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Akun Dinonaktifkan</AlertDialogTitle>
                            <AlertDialogDescription>
                                {inactiveMessage}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction autoFocus>
                                Mengerti
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            <Toaster richColors position="top-right" />
        </>
    );
}


