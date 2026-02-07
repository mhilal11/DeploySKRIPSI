import {
    Upload,
    Download,
    Trash2,
    Check,
    X,
    FileText,
    Info,
    Image as ImageIcon,
    Type,
    AlignLeft,
    Pencil
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';
import { apiUrl } from '@/shared/lib/api';
import { useForm, router } from '@/shared/lib/inertia';

interface Template {
    id: number;
    name: string;
    fileName: string;
    headerText: string | null;
    footerText: string | null;
    logoUrl: string | null;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
}

interface TemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PLACEHOLDERS: Record<string, string> = {
    '{{logo}}': 'Logo Perusahaan',
    '{{header}}': 'Header Surat',
    '{{nomor_surat}}': 'Nomor Surat',
    '{{tanggal}}': 'Tanggal Surat',
    '{{pengirim}}': 'Nama Pengirim',
    '{{divisi_pengirim}}': 'Divisi Pengirim',
    '{{penerima}}': 'Penerima / Divisi Tujuan',
    '{{perihal}}': 'Perihal',
    '{{isi_surat}}': 'Isi Surat',
    '{{prioritas}}': 'Prioritas',
    '{{catatan_disposisi}}': 'Catatan Disposisi',
    '{{tanggal_disposisi}}': 'Tanggal Disposisi',
    '{{oleh}}': 'HR yang Mendisposisi',
    '{{footer}}': 'Footer Surat',
};

export default function TemplateDialog({ open, onOpenChange }: TemplateDialogProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: '',
        template_file: null as File | null,
        header_text: '',
        footer_text: '',
        logo_file: null as File | null,
        remove_logo: false,
    });

    // Fetch templates when dialog opens
    useEffect(() => {
        if (open) {
            fetchTemplates();
        }
    }, [open]);

    // Handle logo preview
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        form.setData('logo_file', file);

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setLogoPreview(null);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await fetch(apiUrl(route('super-admin.letters.templates.list')), {
                credentials: 'include',
            });
            const data = await response.json();
            setTemplates(data.templates || []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('super-admin.letters.templates.store'), {
            forceFormData: true,
            onSuccess: () => {
                setShowUpload(false);
                form.reset();
                setLogoPreview(null);
                fetchTemplates();
            },
        });
    };

    const handleToggle = (templateId: number) => {
        router.post(
            route('super-admin.letters.templates.toggle', { template: templateId }),
            {},
            { onSuccess: () => fetchTemplates() }
        );
    };

    const handleDelete = (templateId: number) => {
        if (confirm('Hapus template ini?')) {
            router.delete(
                route('super-admin.letters.templates.destroy', { template: templateId }),
                { onSuccess: () => fetchTemplates() }
            );
        }
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        form.setData({
            name: template.name,
            template_file: null,
            header_text: template.headerText || '',
            footer_text: template.footerText || '',
            logo_file: null,
            remove_logo: false,
        });
        setLogoPreview(template.logoUrl);
        setShowUpload(true);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        form.post(route('super-admin.letters.templates.update', { template: editingTemplate.id }), {
            forceFormData: true,
            onSuccess: () => {
                setShowUpload(false);
                setEditingTemplate(null);
                form.reset();
                setLogoPreview(null);
                fetchTemplates();
            },
        });
    };

    const handleCancelUpload = () => {
        setShowUpload(false);
        setEditingTemplate(null);
        form.reset();
        setLogoPreview(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] p-0 flex flex-col gap-0">
                <DialogHeader className="px-5 sm:px-8 py-4 sm:py-5 border-b pr-10 sm:pr-12 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                        Template Surat Word
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Upload template .docx dengan placeholder, header, footer, dan logo untuk disposisi final.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="px-5 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
                        {/* Upload Section */}
                        {showUpload ? (
                            <Card className="p-3 sm:p-5 border-dashed border-2 bg-slate-50/50">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <h4 className="text-xs sm:text-sm font-medium">
                                        {editingTemplate ? 'Edit Template' : 'Upload Template Baru'}
                                    </h4>
                                </div>
                                <form onSubmit={editingTemplate ? handleUpdate : handleUpload} className="space-y-3 sm:space-y-5">
                                    {/* Template Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="flex items-center gap-2">
                                            <Type className="h-4 w-4" />
                                            Nama Template
                                        </Label>
                                        <Input
                                            id="name"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder="Contoh: Template Disposisi Resmi"
                                        />
                                        {form.errors.name && (
                                            <p className="text-xs text-red-500">{form.errors.name}</p>
                                        )}
                                    </div>

                                    {/* Template File */}
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
                                            onChange={(e) => form.setData('template_file', e.target.files?.[0] || null)}
                                        />
                                        {form.errors.template_file && (
                                            <p className="text-xs text-red-500">{form.errors.template_file}</p>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t pt-4">
                                        <p className="text-sm font-medium text-slate-700 mb-3">
                                            Pengaturan Tambahan (Opsional)
                                        </p>
                                    </div>

                                    {/* Logo Upload */}
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
                                                    onChange={handleLogoChange}
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Format: JPG, JPEG, PNG. Max: 5MB
                                                </p>
                                            </div>
                                            {logoPreview && (
                                                <div className="relative">
                                                    <img
                                                        src={logoPreview}
                                                        alt="Logo Preview"
                                                        className="h-16 w-16 object-contain border rounded-lg bg-white p-1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            form.setData('logo_file', null);
                                                            setLogoPreview(null);
                                                            if (logoInputRef.current) {
                                                                logoInputRef.current.value = '';
                                                            }
                                                        }}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {form.errors.logo_file && (
                                            <p className="text-xs text-red-500">{form.errors.logo_file}</p>
                                        )}
                                    </div>

                                    {/* Header Text */}
                                    <div className="space-y-2">
                                        <Label htmlFor="header_text" className="flex items-center gap-2">
                                            <AlignLeft className="h-4 w-4" />
                                            Header Surat
                                        </Label>
                                        <Textarea
                                            id="header_text"
                                            value={form.data.header_text}
                                            onChange={(e) => form.setData('header_text', e.target.value)}
                                            placeholder="Contoh: PT. LINTAS DAYA PRIMA&#10;Jl. Alamat Perusahaan No. 123, Kota"
                                            rows={3}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-slate-500">
                                            Teks yang akan muncul di bagian atas surat
                                        </p>
                                        {form.errors.header_text && (
                                            <p className="text-xs text-red-500">{form.errors.header_text}</p>
                                        )}
                                    </div>

                                    {/* Footer Text */}
                                    <div className="space-y-2">
                                        <Label htmlFor="footer_text" className="flex items-center gap-2">
                                            <AlignLeft className="h-4 w-4" />
                                            Footer Surat
                                        </Label>
                                        <Textarea
                                            id="footer_text"
                                            value={form.data.footer_text}
                                            onChange={(e) => form.setData('footer_text', e.target.value)}
                                            placeholder="Contoh: Dokumen ini diterbitkan secara elektronik dan sah tanpa tanda tangan."
                                            rows={2}
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-slate-500">
                                            Teks yang akan muncul di bagian bawah surat
                                        </p>
                                        {form.errors.footer_text && (
                                            <p className="text-xs text-red-500">{form.errors.footer_text}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <Button type="button" variant="outline" size="sm" onClick={handleCancelUpload}>
                                            Batal
                                        </Button>
                                        <Button type="submit" size="sm" disabled={form.processing}>
                                            {form.processing
                                                ? (editingTemplate ? 'Menyimpan...' : 'Mengupload...')
                                                : (editingTemplate ? 'Simpan Perubahan' : 'Upload Template')}
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        ) : (
                            <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => setShowUpload(true)}>
                                <Upload className="h-4 w-4" />
                                <span className="hidden sm:inline">Upload Template Baru</span>
                                <span className="sm:hidden">Upload</span>
                            </Button>
                        )}

                        {/* Templates List */}
                        <div>
                            <h4 className="text-xs sm:text-sm font-medium mb-2">Template Tersedia</h4>
                            {loading ? (
                                <p className="text-xs sm:text-sm text-slate-500 py-4 text-center">Memuat...</p>
                            ) : templates.length > 0 ? (
                                <div className="space-y-2 sm:space-y-3">
                                    {templates.map((template) => (
                                        <div
                                            key={template.id}
                                            className="p-3 sm:p-4 bg-slate-50 rounded-lg border"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                    {template.logoUrl && (
                                                        <img
                                                            src={template.logoUrl}
                                                            alt="Logo"
                                                            className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded border bg-white p-0.5 shrink-0"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-xs sm:text-sm truncate">{template.name}</p>
                                                        <p className="text-[10px] sm:text-xs text-slate-500 truncate">{template.fileName}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2">
                                                    <div className="flex items-center gap-1">
                                                        {template.isActive ? (
                                                            <Badge className="bg-green-100 text-green-700 text-[10px] sm:text-xs px-1.5 sm:px-2">Aktif</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2">Nonaktif</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 sm:h-8 sm:w-8"
                                                            onClick={() => handleToggle(template.id)}
                                                            title={template.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                                        >
                                                            {template.isActive ? (
                                                                <X className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                                                            ) : (
                                                                <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 sm:h-8 sm:w-8"
                                                            onClick={() => handleEdit(template)}
                                                            title="Edit Template"
                                                        >
                                                            <Pencil className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 sm:h-8 sm:w-8"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                window.open(apiUrl(route('super-admin.letters.templates.download', { template: template.id })), '_blank');
                                                            }}
                                                            title="Download Template (dengan header/footer/logo)"
                                                        >
                                                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 sm:h-8 sm:w-8 text-red-600"
                                                            onClick={() => handleDelete(template.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Show header/footer info if present */}
                                            {(template.headerText || template.footerText) && (
                                                <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                                    {template.headerText && (
                                                        <div>
                                                            <span className="text-slate-400">Header:</span>
                                                            <p className="text-slate-600 truncate">{template.headerText}</p>
                                                        </div>
                                                    )}
                                                    {template.footerText && (
                                                        <div>
                                                            <span className="text-slate-400">Footer:</span>
                                                            <p className="text-slate-600 truncate">{template.footerText}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-sm text-slate-500">
                                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                    <p className="mb-3">Belum ada template</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        asChild
                                    >
                                        <a href={apiUrl(route('super-admin.letters.templates.sample'))}>
                                            <Download className="h-4 w-4" />
                                            Unduh Template Contoh
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Download Sample Template */}
                        <div className="flex justify-center pt-2">
                            <Button
                                variant="link"
                                size="sm"
                                className="text-blue-600 gap-2 text-xs sm:text-sm"
                                asChild
                            >
                                <a href={apiUrl(route('super-admin.letters.templates.sample'))}>
                                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Unduh Template Contoh untuk diedit</span>
                                    <span className="sm:hidden">Unduh Contoh</span>
                                </a>
                            </Button>
                        </div>

                        {/* Placeholders Info */}
                        <div className="border-t pt-3 sm:pt-4">
                            <h4 className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-2">
                                <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                                Placeholder yang Tersedia
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs">
                                {Object.entries(PLACEHOLDERS).map(([key, label]) => (
                                    <div key={key} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded gap-2">
                                        <code className="text-[10px] sm:text-xs bg-white px-1.5 py-0.5 rounded border shrink-0">{key}</code>
                                        <span className="text-slate-500 text-right truncate">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-5 sm:px-8 py-4 sm:py-5 border-t bg-white shrink-0 z-10 relative">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}



