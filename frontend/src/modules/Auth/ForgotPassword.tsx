import { ArrowLeft, Mail } from 'lucide-react';
import Image from 'next/image';
import { FormEventHandler, useEffect, useRef } from 'react';

import InputError from '@/shared/components/InputError';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Head, Link, useForm } from '@/shared/lib/inertia';

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

        post(route('password.email'));
    };

    return (
        <>
            <Head title="Lupa Kata Sandi" />

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
                            href={route('login')}
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
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 text-base text-white placeholder:text-white/60 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/50 backdrop-blur-sm"
                                            autoFocus
                                            onChange={(e) => setData('email', e.target.value)}
                                        />
                                    </div>
                                    <InputError message={errors.email} className="text-sm text-red-300" />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-base font-semibold text-white shadow-[0_8px_32px_rgba(34,211,238,0.5)] border border-cyan-400/30 rounded-[20px]"
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




