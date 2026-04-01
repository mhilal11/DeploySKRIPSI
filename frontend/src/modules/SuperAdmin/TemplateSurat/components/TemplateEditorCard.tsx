import { FilePlus2, Save, Upload, X } from 'lucide-react';
import Image from 'next/image';
import type { ChangeEvent, FormEvent, RefObject } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

import { NON_BODY_PLACEHOLDERS } from './constants';
import type { EditableField, EditorMode, TemplateForm } from './types';

type TemplateEditorCardProps = {
    activeField: EditableField;
    editorMode: EditorMode;
    form: TemplateForm;
    footerRef: RefObject<HTMLTextAreaElement>;
    headerRef: RefObject<HTMLTextAreaElement>;
    isBusy: boolean;
    logoInputRef: RefObject<HTMLInputElement>;
    logoPreview: string | null;
    placeholders: Record<string, string>;
    templateContentRef: RefObject<HTMLTextAreaElement>;
    onClearLogo: () => void;
    onInsertPlaceholder: (placeholder: string) => void;
    onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onResetEditor: () => void;
    onSetActiveField: (field: EditableField) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TemplateEditorCard({
    activeField,
    editorMode,
    form,
    footerRef,
    headerRef,
    isBusy,
    logoInputRef,
    logoPreview,
    placeholders,
    templateContentRef,
    onClearLogo,
    onInsertPlaceholder,
    onLogoChange,
    onResetEditor,
    onSetActiveField,
    onSubmit,
}: TemplateEditorCardProps) {
    const isEditing = editorMode === 'edit';

    return (
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base text-blue-950">
                        {isEditing ? 'Edit Template' : 'Template Baru'}
                    </CardTitle>
                    <Badge variant={isEditing ? 'outline' : 'default'}>
                        {isEditing ? 'Mode Edit' : 'Mode Baru'}
                    </Badge>
                </div>
                <CardDescription>
                    Ubah isi template, header, footer, dan logo langsung dari halaman
                    ini.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="template-name">Nama Template</Label>
                        <Input
                            id="template-name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            placeholder="Contoh: Template Disposisi Utama"
                        />
                        {form.errors.name && (
                            <p className="text-xs text-red-500">{form.errors.name}</p>
                        )}
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="header-text">Header Surat</Label>
                            <Textarea
                                id="header-text"
                                ref={headerRef}
                                rows={4}
                                value={form.data.header_text}
                                onFocus={() => onSetActiveField('header_text')}
                                onChange={(event) =>
                                    form.setData('header_text', event.target.value)
                                }
                                placeholder="Header surat"
                            />
                            {form.errors.header_text && (
                                <p className="text-xs text-red-500">
                                    {form.errors.header_text}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="footer-text">Footer Surat</Label>
                            <Textarea
                                id="footer-text"
                                ref={footerRef}
                                rows={4}
                                value={form.data.footer_text}
                                onFocus={() => onSetActiveField('footer_text')}
                                onChange={(event) =>
                                    form.setData('footer_text', event.target.value)
                                }
                                placeholder="Footer surat"
                            />
                            {form.errors.footer_text && (
                                <p className="text-xs text-red-500">
                                    {form.errors.footer_text}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo-file">Logo Perusahaan</Label>
                        <div className="flex flex-wrap items-start gap-3">
                            <Input
                                id="logo-file"
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={onLogoChange}
                                className="max-w-sm"
                            />
                            {logoPreview && (
                                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <Image
                                        src={logoPreview}
                                        alt="Logo preview"
                                        width={48}
                                        height={48}
                                        unoptimized
                                        className="h-12 w-12 rounded-lg bg-white object-contain p-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClearLogo}
                                    >
                                        <X />
                                        Hapus logo
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="template-content">Isi Template</Label>
                            <span className="text-xs text-slate-500">
                                Bidang aktif: {activeField.replace('_', ' ')}
                            </span>
                        </div>
                        <Textarea
                            id="template-content"
                            ref={templateContentRef}
                            rows={16}
                            value={form.data.template_content}
                            onFocus={() => onSetActiveField('template_content')}
                            onChange={(event) =>
                                form.setData('template_content', event.target.value)
                            }
                            placeholder="Tulis isi template surat di sini"
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500">
                            Placeholder akan diganti otomatis saat dokumen final dibuat.
                        </p>
                        {form.errors.template_content && (
                            <p className="text-xs text-red-500">
                                {form.errors.template_content}
                            </p>
                        )}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Upload className="h-4 w-4" />
                            Placeholder Siap Pakai
                        </div>
                        <p className="text-xs text-slate-500">
                            Klik placeholder untuk menyisipkan ke area editor yang sedang
                            aktif.
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                            {Object.entries(placeholders).map(([key, label]) => {
                                const isAutomatic = NON_BODY_PLACEHOLDERS.has(key);

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        disabled={isAutomatic}
                                        onClick={() => onInsertPlaceholder(key)}
                                        className={cn(
                                            'flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors',
                                            isAutomatic
                                                ? 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                                                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50',
                                        )}
                                    >
                                        <code className="text-xs">{key}</code>
                                        <span className="ml-3 text-xs">
                                            {isAutomatic ? 'Otomatis' : label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" disabled={isBusy}>
                            <Save />
                            {form.processing
                                ? 'Menyimpan...'
                                : isEditing
                                  ? 'Simpan Perubahan'
                                  : 'Simpan Template'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onResetEditor}
                            disabled={isBusy}
                        >
                            <FilePlus2 />
                            Reset Editor
                        </Button>
                        {form.recentlySuccessful && (
                            <span className="text-sm text-emerald-600">
                                Template berhasil disimpan.
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
