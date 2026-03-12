import {
    AlignLeft,
    FileText,
    Image as ImageIcon,
    Type,
    X,
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

import type { Template } from './types';
import type { ChangeEvent, FormEvent, RefObject } from 'react';

type TemplateEditorCardProps = {
    editingTemplate: Template | null;
    processing: boolean;
    logoPreview: string | null;
    logoInputRef: RefObject<HTMLInputElement>;
    data: {
        name: string;
        header_text: string;
        footer_text: string;
    };
    errors: Partial<Record<'name' | 'template_file' | 'logo_file' | 'header_text' | 'footer_text', string>>;
    onSubmit: (event: FormEvent) => void;
    onCancel: () => void;
    onNameChange: (value: string) => void;
    onTemplateFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onHeaderChange: (value: string) => void;
    onFooterChange: (value: string) => void;
    onClearLogo: () => void;
};

export function TemplateEditorCard({
    editingTemplate,
    processing,
    logoPreview,
    logoInputRef,
    data,
    errors,
    onSubmit,
    onCancel,
    onNameChange,
    onTemplateFileChange,
    onLogoChange,
    onHeaderChange,
    onFooterChange,
    onClearLogo,
}: TemplateEditorCardProps) {
    return (
        <Card className="border-2 border-dashed bg-slate-50/50 p-3 sm:p-5">
            <div className="mb-3 flex items-center justify-between sm:mb-4">
                <h4 className="text-xs font-medium sm:text-sm">
                    {editingTemplate ? 'Edit Template' : 'Upload Template Baru'}
                </h4>
            </div>
            <form onSubmit={onSubmit} className="space-y-3 sm:space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Nama Template
                    </Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(event) => onNameChange(event.target.value)}
                        placeholder="Contoh: Template Disposisi Resmi"
                    />
                    {errors.name && (
                        <p className="text-xs text-red-500">{errors.name}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="template_file" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        File Template (.docx)
                        {editingTemplate && <span className="text-xs text-slate-500">(kosongkan jika tidak ingin mengubah)</span>}
                    </Label>
                    <Input
                        id="template_file"
                        type="file"
                        accept=".docx"
                        onChange={onTemplateFileChange}
                    />
                    {errors.template_file && (
                        <p className="text-xs text-red-500">{errors.template_file}</p>
                    )}
                </div>

                <div className="border-t pt-4">
                    <p className="mb-3 text-sm font-medium text-slate-700">
                        Pengaturan Tambahan (Opsional)
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="logo_file" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Logo Perusahaan
                    </Label>
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <Input
                                id="logo_file"
                                ref={logoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={onLogoChange}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Format: JPG, JPEG, PNG. Max: 5MB
                            </p>
                        </div>
                        {logoPreview && (
                            <div className="relative">
                                <Image
                                    src={logoPreview}
                                    alt="Logo Preview"
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="h-16 w-16 rounded-lg border bg-white p-1 object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={onClearLogo}
                                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>
                    {errors.logo_file && (
                        <p className="text-xs text-red-500">{errors.logo_file}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="header_text" className="flex items-center gap-2">
                        <AlignLeft className="h-4 w-4" />
                        Header Surat
                    </Label>
                    <Textarea
                        id="header_text"
                        value={data.header_text}
                        onChange={(event) => onHeaderChange(event.target.value)}
                        placeholder="Contoh: PT. LINTAS DAYA PRIMA&#10;Jl. Alamat Perusahaan No. 123, Kota"
                        rows={3}
                        className="resize-none"
                    />
                    <p className="text-xs text-slate-500">
                        Teks yang akan muncul di bagian atas surat
                    </p>
                    {errors.header_text && (
                        <p className="text-xs text-red-500">{errors.header_text}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="footer_text" className="flex items-center gap-2">
                        <AlignLeft className="h-4 w-4" />
                        Footer Surat
                    </Label>
                    <Textarea
                        id="footer_text"
                        value={data.footer_text}
                        onChange={(event) => onFooterChange(event.target.value)}
                        placeholder="Contoh: Dokumen ini diterbitkan secara elektronik dan sah tanpa tanda tangan."
                        rows={2}
                        className="resize-none"
                    />
                    <p className="text-xs text-slate-500">
                        Teks yang akan muncul di bagian bawah surat
                    </p>
                    {errors.footer_text && (
                        <p className="text-xs text-red-500">{errors.footer_text}</p>
                    )}
                </div>

                <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                        Batal
                    </Button>
                    <Button type="submit" size="sm" disabled={processing}>
                        {processing
                            ? (editingTemplate ? 'Menyimpan...' : 'Mengupload...')
                            : (editingTemplate ? 'Simpan Perubahan' : 'Upload Template')}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
