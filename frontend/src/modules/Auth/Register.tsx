import { gsap } from "gsap";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { FormEventHandler, useEffect, useRef, useState } from "react";

import InputError from "@/shared/components/InputError";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Head, Link, useForm } from "@/shared/lib/inertia";

const logo = "/img/LogoLDP.png";

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Regex validasi nama: hanya huruf, spasi, petik atas, dan strip
    const nameRegex = /^[A-Za-z\s'-]+$/;

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route("register"), {
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
                                    <img
                                        src={logo}
                                        alt="Lintas Data Prima"
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
        </>
    );
}



