import { AlertTriangle, Loader2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { api, apiUrl, resolveAssetUrl } from '@/shared/lib/api';

import { AccountDetailUser, AccountProfile, AccountRecord } from './types';

interface AccountDetailDialogProps {
    user: AccountRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onToggleStatus: (user: AccountRecord) => void;
}

type TabKey = 'akun' | 'pribadi';

export default function AccountDetailDialog({
    user,
    open,
    onOpenChange,
    onToggleStatus,
}: AccountDetailDialogProps) {
    const [detailUser, setDetailUser] = useState<AccountDetailUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('akun');

    useEffect(() => {
        if (!open || !user) {
            setDetailUser(null);
            setActiveTab('akun');
            return;
        }

        setLoading(true);
        api.get(apiUrl(`/super-admin/accounts/${user.id}/detail`))
            .then(({ data }) => {
                if (data?.user) {
                    setDetailUser(data.user);
                } else {
                    setDetailUser({ ...user, profile: null });
                }
            })
            .catch(() => {
                setDetailUser({ ...user, profile: null });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [open, user]);

    if (!open || !user) {
        return null;
    }

    const displayUser = detailUser ?? user;
    const profile = detailUser?.profile ?? null;
    const profilePhotoUrl = resolveAssetUrl(profile?.profile_photo_url ?? null);
    const hasProfile = !!profile;

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'akun', label: 'Informasi Akun' },
        { key: 'pribadi', label: 'Data Pribadi' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[96vw] overflow-hidden border-0 bg-white p-0 sm:w-full sm:max-w-2xl">
                <DialogHeader className="space-y-0 border-b border-slate-100 px-4 py-4 pr-12 text-left sm:px-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            {loading ? (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            ) : profilePhotoUrl ? (
                                <img
                                    src={profilePhotoUrl}
                                    alt={displayUser.name}
                                    className="h-16 w-16 rounded-full border-2 border-blue-100 object-cover shadow-sm"
                                />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 shadow-sm">
                                    <User className="h-7 w-7 text-blue-600" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg font-semibold text-blue-900">
                                Detail Akun
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-sm text-slate-500">
                                Informasi lengkap akun pengguna sistem.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex min-h-[280px] items-center justify-center px-4 py-10 sm:px-6">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                        <div className="mb-4 flex border-b border-slate-200">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative flex-1 px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                                        activeTab === tab.key
                                            ? 'text-blue-900'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.key && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-900" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'akun' && (
                            <div className="space-y-3 py-2 text-sm">
                                <InfoRow label="User ID" value={displayUser.employee_code} />
                                <InfoRow label="Nama" value={displayUser.name} />
                                <InfoRow label="Email" value={displayUser.email} />
                                <InfoRow
                                    label="Role"
                                    value={
                                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                            {displayUser.role}
                                        </span>
                                    }
                                />
                                {displayUser.division && (
                                    <InfoRow label="Divisi" value={displayUser.division} />
                                )}
                                <InfoRow
                                    label="Status"
                                    value={
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                displayUser.status === 'Active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-slate-200 text-slate-700'
                                            }`}
                                        >
                                            {displayUser.status}
                                        </span>
                                    }
                                />
                                <InfoRow
                                    label="Tanggal Nonaktif"
                                    value={displayUser.inactive_at ?? '-'}
                                />
                                <InfoRow
                                    label="Terdaftar"
                                    value={displayUser.registered_at ?? '-'}
                                />
                                <InfoRow
                                    label="Login Terakhir"
                                    value={displayUser.last_login_at ?? '-'}
                                />
                            </div>
                        )}

                        {activeTab === 'pribadi' && (
                            hasProfile ? (
                                <ProfileSection profile={profile} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <User className="mb-2 h-10 w-10 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-500">
                                        Data pribadi belum tersedia
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Pengguna belum melengkapi profil
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                )}

                <DialogFooter className="border-t border-slate-100 px-4 py-4 sm:px-6">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 sm:w-auto"
                            >
                                {user.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className={`h-5 w-5 ${user.status === 'Active' ? 'text-orange-500' : 'text-green-600'}`} />
                                    <AlertDialogTitle>{user.status === 'Active' ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?'}</AlertDialogTitle>
                                </div>
                                <AlertDialogDescription>
                                    Apakah Anda yakin ingin {user.status === 'Active' ? 'menonaktifkan' : 'mengaktifkan'} akun <span className="font-semibold text-slate-900">{user.name}</span>?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onToggleStatus(user)}
                                    className={user.status === 'Active' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
                                >
                                    Ya, {user.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="w-full bg-blue-900 text-white hover:bg-blue-800 sm:w-auto"
                    >
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-4 mb-1 border-b border-slate-100 pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-800">{children}</h3>
        </div>
    );
}

function ProfileSection({ profile }: { profile: AccountProfile }) {
    const isStaff = profile.type === 'staff';
    const isPelamar = profile.type === 'pelamar';

    return (
        <div className="space-y-0">
            {/* Personal Data */}
            <SectionTitle>Data Pribadi</SectionTitle>
            <div className="space-y-3 py-2 text-sm">
                {isPelamar && profile.full_name && (
                    <InfoRow label="Nama Lengkap" value={profile.full_name} />
                )}
                {isPelamar && profile.email && (
                    <InfoRow label="Email Profil" value={profile.email} />
                )}
                <InfoRow label="No. Telepon" value={profile.phone ?? '-'} />
                <InfoRow label="Tanggal Lahir" value={profile.date_of_birth ?? '-'} />
                <InfoRow label="Jenis Kelamin" value={profile.gender ?? '-'} />
                <InfoRow label="Agama" value={profile.religion ?? '-'} />
            </div>

            {/* Address */}
            <SectionTitle>Alamat</SectionTitle>
            <div className="space-y-3 py-2 text-sm">
                <InfoRow label="Alamat KTP" value={profile.address ?? '-'} />
                <InfoRow label="Alamat Domisili" value={profile.domicile_address ?? '-'} />
                <InfoRow label="Kota" value={profile.city ?? '-'} />
                <InfoRow label="Provinsi" value={profile.province ?? '-'} />
            </div>

            {/* Education */}
            {isStaff && profile.education_level && (
                <>
                    <SectionTitle>Pendidikan</SectionTitle>
                    <div className="space-y-3 py-2 text-sm">
                        <InfoRow label="Tingkat Pendidikan" value={profile.education_level} />
                    </div>
                </>
            )}

            {profile.educations && profile.educations.length > 0 && (
                <>
                    {!isStaff && <SectionTitle>Pendidikan</SectionTitle>}
                    {isStaff && !profile.education_level && <SectionTitle>Pendidikan</SectionTitle>}
                    <div className="mt-2 space-y-2">
                        {profile.educations.map((edu, idx) => (
                            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                                {edu.institution && (
                                    <p className="font-semibold text-slate-800">{edu.institution}</p>
                                )}
                                {edu.degree && (
                                    <p className="text-slate-600">
                                        {edu.degree}
                                        {edu.field_of_study ? ` — ${edu.field_of_study}` : ''}
                                    </p>
                                )}
                                {(edu.start_year || edu.end_year) && (
                                    <p className="text-xs text-slate-400">
                                        {edu.start_year ?? '?'} - {edu.end_year ?? 'Sekarang'}
                                    </p>
                                )}
                                {edu.gpa && (
                                    <p className="text-xs text-slate-500">IPK: {edu.gpa}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Experience (Pelamar only) */}
            {isPelamar && profile.experiences && profile.experiences.length > 0 && (
                <>
                    <SectionTitle>Pengalaman Kerja</SectionTitle>
                    <div className="mt-2 space-y-2">
                        {profile.experiences.map((exp, idx) => (
                            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                                {exp.position && (
                                    <p className="font-semibold text-slate-800">{exp.position}</p>
                                )}
                                {exp.company && (
                                    <p className="text-slate-600">{exp.company}</p>
                                )}
                                {(exp.start_date || exp.end_date) && (
                                    <p className="text-xs text-slate-400">
                                        {exp.start_date ?? '?'} - {exp.end_date ?? 'Sekarang'}
                                    </p>
                                )}
                                {exp.description && (
                                    <p className="mt-1 text-xs text-slate-500">{exp.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Certifications (Pelamar only) */}
            {isPelamar && profile.certifications && profile.certifications.length > 0 && (
                <>
                    <SectionTitle>Sertifikasi</SectionTitle>
                    <div className="mt-2 space-y-2">
                        {profile.certifications.map((cert, idx) => (
                            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                                {cert.name && (
                                    <p className="font-semibold text-slate-800">{cert.name}</p>
                                )}
                                {cert.issuer && (
                                    <p className="text-slate-600">{cert.issuer}</p>
                                )}
                                {cert.year && (
                                    <p className="text-xs text-slate-400">Tahun: {cert.year}</p>
                                )}
                                {cert.file_url && (
                                    <a
                                        href={cert.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                                    >
                                        Lihat Sertifikat
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-2">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900 sm:col-span-2">
                {value ?? '-'}
            </span>
        </div>
    );
}
