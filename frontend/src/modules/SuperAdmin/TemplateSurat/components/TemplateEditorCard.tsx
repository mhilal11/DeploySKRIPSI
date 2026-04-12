import { FileText, FilePlus2, Save, X } from 'lucide-react';
import Image from 'next/image';

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

import type { EditableField, EditorMode, TemplateForm } from './types';
import type { ChangeEvent, FormEvent, RefObject } from 'react';

type TemplateEditorCardProps = {
    activeField: EditableField;
    editorMode: EditorMode;
    form: TemplateForm;
    footerRef: RefObject<HTMLTextAreaElement>;
    headerRef: RefObject<HTMLTextAreaElement>;
    isBusy: boolean;
    logoInputRef: RefObject<HTMLInputElement>;
    logoPreview: string | null;
    templateContentRef: RefObject<HTMLTextAreaElement>;
    canPreview: boolean;
    isPdfPreviewLoading: boolean;
    onClearLogo: () => void;
    onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onOpenPdfPreview: () => void;
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
    templateContentRef,
    canPreview,
    isPdfPreviewLoading,
    onClearLogo,
    onLogoChange,
    onOpenPdfPreview,
    onResetEditor,
    onSetActiveField,
    onSubmit,
}: TemplateEditorCardProps) {
    const isEditing = editorMode === 'edit';

    return (
        <Card className="flex h-full flex-col border-slate-200 bg-white shadow-sm">
            <CardHeader className="shrink-0 border-b border-slate-100">
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
            <CardContent className="flex-1 overflow-y-auto pt-6">
                <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="template-name">Nama Template</Label>
                        <Input
                            id="template-name"
                            value={form.data.name}
                            disabled={isBusy}
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
                                disabled={isBusy}
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
                                disabled={isBusy}
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
                                disabled={isBusy}
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
                                        disabled={isBusy}
                                    >
                                        <X />
                                        Hapus logo
                                    </Button>
                                </div>
                            )}
                        </div>
                        {form.errors.logo_file && (
                            <p className="text-xs text-red-500">
                                {form.errors.logo_file}
                            </p>
                        )}
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
                            disabled={isBusy}
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
                        {canPreview && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onOpenPdfPreview}
                                disabled={isBusy || isPdfPreviewLoading}
                            >
                                <FileText />
                                {isPdfPreviewLoading ? 'Menyiapkan PDF...' : 'Preview PDF'}
                            </Button>
                        )}
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
