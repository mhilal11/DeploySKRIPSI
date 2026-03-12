import { Camera, User as UserIcon } from 'lucide-react';
import Image from 'next/image';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

interface ProfileHeaderProps {
    avatarSize: number;
    photoPreview: string | null;
    photoChanged: boolean;
    onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPhotoSave: () => void;
    onPhotoCancel: () => void;
    fullName: string;
    email: string;
    completion: number;
    savingPhoto: boolean;
    disabled?: boolean;
}

export default function ProfileHeader({
    avatarSize,
    photoPreview,
    photoChanged,
    onPhotoChange,
    onPhotoSave,
    onPhotoCancel,
    fullName,
    email,
    completion,
    savingPhoto,
    disabled = false,
}: ProfileHeaderProps) {
    return (
        <Card className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
            <div
                className="relative shrink-0"
                style={{ width: avatarSize, height: avatarSize }}
            >
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 border-blue-900 bg-slate-100 shadow-md">
                    {photoPreview ? (
                        <Image
                            src={photoPreview}
                            alt="Foto profil"
                            width={avatarSize}
                            height={avatarSize}
                            unoptimized
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <UserIcon className="h-16 w-16" />
                        </div>
                    )}
                </div>
                {!disabled && (
                    <label
                        htmlFor="profile-photo"
                        className="absolute bottom-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-900 text-white shadow"
                    >
                        <Camera className="h-4 w-4" />
                        <input
                            id="profile-photo"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onPhotoChange}
                        />
                    </label>
                )}
            </div>

            {/* Save/Cancel buttons for photo */}
            {photoChanged && !disabled && (
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onPhotoSave}
                        disabled={savingPhoto}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {savingPhoto ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menyimpan...
                            </>
                        ) : (
                            'Simpan Foto'
                        )}
                    </button>
                    <button
                        onClick={onPhotoCancel}
                        disabled={savingPhoto}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Batal
                    </button>
                </div>
            )}
            <div className="text-center sm:text-left">
                <h2 className="text-xl font-semibold text-blue-900">
                    {fullName || 'Nama Lengkap'}
                </h2>
                <p className="text-sm text-slate-500">
                    {email || 'email@contoh.com'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge className="bg-blue-900 text-white">Pelamar</Badge>
                    <Badge
                        variant="outline"
                        className="border-green-500 text-green-700"
                    >
                        Profil {completion}% Lengkap
                    </Badge>
                </div>
            </div>
        </Card>
    );
}



