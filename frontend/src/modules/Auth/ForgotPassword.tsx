import { ArrowLeft, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEventHandler, useEffect, useRef } from 'react';

import InputError from '@/shared/components/InputError';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Head, useForm } from '@/shared/lib/inertia';
import { normalizeEmail } from '@/shared/lib/input-validation';

const logo = '/img/LogoLDP.png';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post('/forgot-password');
    };

    return (
        <>
            <Head title="Lupa Kata Sandi" />

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
                        <Link
                            href="/login"
                            className="mb-6 inline-flex items-center gap-2 text-sm text-white/80 transition hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Kembali ke Login
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
                                    Lupa Kata Sandi?
                                </h1>
                                <p className="text-white/80 text-sm">
                                    Jangan khawatir. Cukup beri tahu kami alamat email Anda dan kami akan mengirimkan tautan reset kata sandi.
                                </p>
                            </div>

                            {status && (
                                <div className="mb-6 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                                    {status}
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
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 text-base text-white placeholder:text-white/60 focus-visible:border-[#2F6DB5]/60 focus-visible:ring-[#2F6DB5]/60 backdrop-blur-sm"
                                            autoFocus
                                            onChange={(e) => setData('email', normalizeEmail(e.target.value))}
                                            required
                                        />
                                    </div>
                                    <InputError message={errors.email} className="text-sm text-red-300" />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 w-full bg-[#0F4C81] hover:bg-[#0C3E6B] text-base font-semibold text-white shadow-[0_8px_32px_rgba(47,109,181,0.32)] border border-[#2F6DB5]/30 rounded-[20px]"
                                >
                                    {processing ? 'Mengirim...' : 'Kirim Link Reset Password'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}




