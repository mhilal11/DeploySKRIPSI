import { gsap } from "gsap";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Image from "next/image";
import { FormEventHandler, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import InputError from "@/shared/components/InputError";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Head, Link, useForm } from "@/shared/lib/inertia";
import { markLandingSplashSkipOnce } from "@/shared/lib/landing-splash";

const logo = "/img/LogoLDP.png";

function buildGoogleRegisterUrl(): string {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "/api";
    if (/^https?:\/\//i.test(apiBase)) {
        return `${apiBase.replace(/\/$/, "")}/auth/google/register`;
    }

    const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8080";
    return `${backendOrigin.replace(/\/$/, "")}/api/auth/google/register`;
}

export default function Register({
    status,
    oauth_error,
    oauth_error_code,
}: {
    status?: string;
    oauth_error?: string;
    oauth_error_code?: string;
}) {
    const googleRegisterUrl = buildGoogleRegisterUrl();
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showExistingAccountDialog, setShowExistingAccountDialog] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const isExistingGoogleAccount = oauth_error_code === "email_exists";

    // Regex validasi nama: hanya huruf, spasi, petik atas, dan strip
    const nameRegex = /^[A-Za-z\s'-]+$/;

    useEffect(() => {
        markLandingSplashSkipOnce();
    }, []);

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
                ease: "power3.out",
            });
        }
    }, []);

    useEffect(() => {
        if (isExistingGoogleAccount) {
            setShowExistingAccountDialog(true);
        }
    }, [isExistingGoogleAccount]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route("register"), {
            onSuccess: () => {
                toast.success("Pendaftaran berhasil.", {
                    description: "Akun berhasil dibuat. Silakan lanjutkan proses login.",
                });
            },
            onError: (formErrors) => {
                const firstError = Object.values(formErrors).find(
                    (message) =>
                        typeof message === "string" && message.trim() !== ""
                );

                toast.error("Pendaftaran gagal.", {
                    description:
                        typeof firstError === "string"
                            ? firstError
                            : "Periksa kembali data pendaftaran Anda.",
                });
            },
            onFinish: () => reset("password", "password_confirmation"),
        });
    };

    return (
        <>
            <Head title="Daftar" />

            <div className="relative min-h-screen bg-gradient-to-br from-[#0a0f1f] via-[#0b152b] to-[#060910] px-4 py-10 text-white overflow-hidden">
                <div className="pointer-events-none absolute top-16 right-12 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
                <div
                    className="pointer-events-none absolute bottom-10 left-10 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl"
                    style={{ animationDelay: "0.5s" }}
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
                                    <Image
                                        src={logo}
                                        alt="Lintas Data Prima"
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 object-contain"
                                    />
                                </div>
                                <h1 className="text-3xl text-white mb-2">
                                    Buat Akun Baru
                                </h1>
                                <p className="text-white/80">
                                    Bergabung dengan Lintas Data Prima hari ini
                                </p>
                            </div>

                            {status && (
                                <div className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                                    {status}
                                </div>
                            )}

                            {oauth_error && !isExistingGoogleAccount && (
                                <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                                    {oauth_error}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-6">
                                {/* VALIDASI NAMA */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="name"
                                        className="text-sm font-medium text-white/90"
                                    >
                                        Nama Lengkap
                                    </label>

                                    <div className="relative">
                                        <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />

                                        <Input
                                            id="name"
                                            name="name"
                                            value={data.name}
                                            autoComplete="name"
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 text-base text-white placeholder:text-white/60 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/50 backdrop-blur-sm"
                                            onChange={(e) => {
                                                const value = e.target.value;

                                                // validasi: hanya huruf, spasi, petik atas, strip
                                                if (
                                                    value === "" ||
                                                    nameRegex.test(value)
                                                ) {
                                                    setData("name", value);
                                                }
                                            }}
                                            required
                                        />
                                    </div>

                                    <InputError
                                        message={errors.name}
                                        className="text-sm text-red-300"
                                    />
                                </div>

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
                                                setData("email", e.target.value.toLowerCase())
                                            }
                                            required
                                        />
                                    </div>
                                    <InputError
                                        message={errors.email}
                                        className="text-sm text-red-300"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-white/90"
                                    >
                                        Kata Sandi
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                                        <Input
                                            id="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password"
                                            value={data.password}
                                            autoComplete="new-password"
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 pr-12 text-base text-white placeholder:text-white/60 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/50 backdrop-blur-sm"
                                            onChange={(e) =>
                                                setData(
                                                    "password",
                                                    e.target.value
                                                )
                                            }
                                            required
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
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password_confirmation"
                                            value={data.password_confirmation}
                                            autoComplete="new-password"
                                            className="h-12 rounded-[16px] border-white/30 bg-white/15 pl-11 pr-12 text-base text-white placeholder:text-white/60 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-400/50 backdrop-blur-sm"
                                            onChange={(e) =>
                                                setData(
                                                    "password_confirmation",
                                                    e.target.value
                                                )
                                            }
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (prev) => !prev
                                                )
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white/80"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError
                                        message={errors.password_confirmation}
                                        className="text-sm text-red-300"
                                    />
                                </div>

                                <div className="text-xs text-white/70">
                                    Dengan mendaftar, Anda menyetujui{" "}
                                    <span className="font-medium text-cyan-300">
                                        Syarat & Ketentuan
                                    </span>{" "}
                                    dan{" "}
                                    <span className="font-medium text-cyan-300">
                                        Kebijakan Privasi
                                    </span>{" "}
                                    Lintas Data Prima.
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-base font-semibold text-white shadow-[0_8px_32px_rgba(34,211,238,0.5)] border border-cyan-400/30 rounded-[20px]"
                                >
                                    {processing
                                        ? "Memproses..."
                                        : "Daftar Sekarang"}
                                </Button>

                                <a
                                    href={googleRegisterUrl}
                                    className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-[20px] border border-white/30 bg-white/10 px-4 text-base font-semibold text-white transition hover:bg-white/20"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 48 48"
                                        className="h-5 w-5 shrink-0"
                                        aria-hidden="true"
                                    >
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                        <path fill="none" d="M0 0h48v48H0z"/>
                                    </svg>
                                    Daftar dengan Google
                                </a>
                            </form>

                            <div className="mt-8 text-center text-sm text-white/80">
                                Sudah punya akun?{" "}
                                <Link
                                    href={route("login")}
                                    className="font-semibold text-cyan-300 hover:text-cyan-200"
                                >
                                    Masuk di sini
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isExistingGoogleAccount && (
                <AlertDialog
                    open={showExistingAccountDialog}
                    onOpenChange={setShowExistingAccountDialog}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Email Sudah Terdaftar</AlertDialogTitle>
                            <AlertDialogDescription>
                                {oauth_error || "Akun dengan email Google ini sudah terdaftar. Silakan lanjut login."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Tutup</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    window.location.href = route("login");
                                }}
                            >
                                Ke Halaman Login
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

