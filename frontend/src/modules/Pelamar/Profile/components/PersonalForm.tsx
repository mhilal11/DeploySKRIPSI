import { Save } from 'lucide-react';

import { AutocompleteInput, AutocompleteOption } from '@/shared/components/ui/autocomplete-input';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
    getAllProvinces,
    getCitiesByProvince,
    getCityDisplayName
} from '@/shared/data/indonesian-locations';

import { ApplicantProfileForm } from '../profileTypes';

interface PersonalFormProps {
    data: ApplicantProfileForm['personal'];
    errors: Record<string, string>;
    onChange: (key: keyof ApplicantProfileForm['personal'], value: string) => void;
    onSave: () => void;
    onReset: () => void;
    processing: boolean;
    disabled?: boolean;
}

export default function PersonalForm({
    data,
    errors,
    onChange,
    onSave,
    onReset,
    processing,
    disabled = false,
}: PersonalFormProps) {
    // Validation: Only letters, spaces, hyphens, and apostrophes
    const handleNameChange = (value: string) => {
        const validNamePattern = /^[a-zA-Z\s\-']*$/;
        if (validNamePattern.test(value) || value === '') {
            onChange('full_name', value);
        }
    };

    // Validation: Must contain @
    const handleEmailChange = (value: string) => {
        onChange('email', value);
    };

    // Validation: Only numbers, 8-13 characters
    const handlePhoneChange = (value: string) => {
        const numbersOnly = value.replace(/\D/g, '');
        if (numbersOnly.length <= 13) {
            onChange('phone', numbersOnly);
        }
    };

    // Province and city options
    const provinceOptions: AutocompleteOption[] = getAllProvinces().map(province => ({
        value: province,
        label: province,
    }));

    const cityOptions: AutocompleteOption[] = data.province
        ? getCitiesByProvince(data.province).map(city => ({
            value: getCityDisplayName(city),
            label: getCityDisplayName(city),
        }))
        : [];

    const handleProvinceChange = (value: string) => {
        onChange('province', value);
        // Clear city when province changes
        if (data.province !== value) {
            onChange('city', '');
        }
    };

    // Get today's date in YYYY-MM-DD format for max date restriction
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const maxDate = yesterday.toISOString().split('T')[0];

    return (
        <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Data Pribadi
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <Label>Nama Lengkap *</Label>
                    <Input
                        value={data.full_name}
                        onChange={(event) => handleNameChange(event.target.value)}
                        placeholder="Masukkan nama lengkap"
                        disabled={disabled}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Hanya huruf, spasi, tanda hubung (-) dan apostrof (&apos;)
                    </p>
                    {errors['personal.full_name'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.full_name']}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Email *</Label>
                    <Input
                        type="email"
                        value={data.email}
                        onChange={(event) => handleEmailChange(event.target.value)}
                        placeholder="email@contoh.com"
                        disabled={disabled}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Harus mengandung simbol @
                    </p>
                    {errors['personal.email'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.email']}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Nomor Telepon *</Label>
                    <Input
                        value={data.phone}
                        onChange={(event) => handlePhoneChange(event.target.value)}
                        placeholder="08xxxxxxxxxx"
                        disabled={disabled}
                        maxLength={13}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        8-13 digit angka
                    </p>
                    {data.phone && (data.phone.length < 8 || data.phone.length > 13) && (
                        <p className="mt-1 text-sm text-amber-600">
                            Nomor telepon harus 8-13 digit
                        </p>
                    )}
                    {errors['personal.phone'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.phone']}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Tanggal Lahir *</Label>
                    <Input
                        type="date"
                        value={data.date_of_birth}
                        onChange={(event) => onChange('date_of_birth', event.target.value)}
                        disabled={disabled}
                        max={maxDate}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Tidak dapat memilih tanggal hari ini atau masa depan
                    </p>
                    {errors['personal.date_of_birth'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.date_of_birth']}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Jenis Kelamin *</Label>
                    <Select
                        value={data.gender}
                        onValueChange={(value) => onChange('gender', value)}
                        disabled={disabled}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis kelamin" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors['personal.gender'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.gender']}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Agama *</Label>
                    <Select
                        value={data.religion}
                        onValueChange={(value) => onChange('religion', value)}
                        disabled={disabled}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih agama" />
                        </SelectTrigger>
                        <SelectContent>
                            {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map(
                                (religion) => (
                                    <SelectItem key={religion} value={religion}>
                                        {religion}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                    {errors['personal.religion'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.religion']}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-6">
                <Label>Alamat Lengkap *</Label>
                <Textarea
                    value={data.address}
                    onChange={(event) => onChange('address', event.target.value)}
                    placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
                    rows={3}
                    disabled={disabled}
                />
                {errors['personal.address'] && (
                    <p className="mt-1 text-sm text-red-500">
                        {errors['personal.address']}
                    </p>
                )}
            </div>

            <div className="mt-6">
                <Label>Alamat Domisili *</Label>
                <Textarea
                    value={data.domicile_address}
                    onChange={(event) => onChange('domicile_address', event.target.value)}
                    placeholder="Alamat tempat tinggal saat ini"
                    rows={3}
                    disabled={disabled}
                />
                <p className="mt-1 text-xs text-slate-500">
                    Isi alamat domisili saat ini.
                </p>
                {errors['personal.domicile_address'] && (
                    <p className="mt-1 text-sm text-red-500">
                        {errors['personal.domicile_address']}
                    </p>
                )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <Label>Provinsi *</Label>
                    <AutocompleteInput
                        options={provinceOptions}
                        value={data.province}
                        onValueChange={handleProvinceChange}
                        placeholder="Ketik provinsi..."
                        emptyText="Provinsi tidak ditemukan"
                        disabled={disabled}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Ketik nama provinsi untuk mencari
                    </p>
                    {errors['personal.province'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.province']}
                        </p>
                    )}
                </div>
                <div>
                    <Label>Kota/Kabupaten *</Label>
                    <AutocompleteInput
                        options={cityOptions}
                        value={data.city}
                        onValueChange={(value) => onChange('city', value)}
                        placeholder={data.province ? "Ketik kota/kabupaten..." : "Pilih provinsi terlebih dahulu"}
                        emptyText="Kota/kabupaten tidak ditemukan"
                        disabled={disabled || !data.province}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        {data.province ? "Ketik nama kota/kabupaten untuk mencari" : "Pilih provinsi terlebih dahulu"}
                    </p>
                    {errors['personal.city'] && (
                        <p className="mt-1 text-sm text-red-500">
                            {errors['personal.city']}
                        </p>
                    )}
                </div>
            </div>

            {!disabled && (
                <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                        onClick={onSave}
                        disabled={processing}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Data Pribadi
                    </Button>
                </div>
            )}
        </Card>
    );
}


