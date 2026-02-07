import { gsap } from 'gsap';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

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
import { Head, Link, useForm } from '@/shared/lib/inertia';



const logo = '/img/LogoLDP.png';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });
    type ExtendedErrors = typeof errors & {
        credentials?: string;
        account_status?: string;
    };
    const typedErrors = errors as ExtendedErrors;
    const credentialError = typedErrors.credentials;
    const inactiveMessage = typedErrors.account_status;
    const [showInactiveDialog, setShowInactiveDialog] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (inactiveMessage) {
            setShowInactiveDialog(true);
        }
    }, [inactiveMessage]);

    useEffect(() => {
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
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
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
                                    <img
                                        src={logo}
                                        alt="Lintas Data Prima"
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

                            {status && (
                                <div className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                                    {status}
                                </div>
                            )}

                            {credentialError && (
                                <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                                    {credentialError}
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
                                                href={route('password.request')}
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
                                    href={route('register')}
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
        </>
    );
}



