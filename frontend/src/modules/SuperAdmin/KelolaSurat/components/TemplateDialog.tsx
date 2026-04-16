import {
    FileText,
    Info,
    Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { TemplateEditorCard } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/TemplateEditorCard';
import { TemplateListSection } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/TemplateListSection';
import { TemplatePlaceholderGrid } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/TemplatePlaceholderGrid';
import {
    PLACEHOLDERS,
} from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';
import type {
    Template,
    TemplateDialogProps,
} from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
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
import { apiUrl } from '@/shared/lib/api';
import { router, useForm } from '@/shared/lib/inertia';
import { imageUploadRule, validateFile } from '@/shared/lib/input-validation';

type ConfirmTemplateAction =
    | { type: 'deactivate'; template: Template }
    | { type: 'delete'; template: Template };

const docxTemplateRule = {
    allowedMimeTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['docx'],
    maxSizeBytes: 5 * 1024 * 1024,
    label: 'Template DOCX',
};

export default function TemplateDialog({ open, onOpenChange }: TemplateDialogProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmTemplateAction | null>(null);
    const [isMutatingTemplate, setIsMutatingTemplate] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: '',
        template_file: null as File | null,
        header_text: '',
        footer_text: '',
        logo_file: null as File | null,
        remove_logo: false,
    });

    useEffect(() => {
        if (open) {
            fetchTemplates();
        }
    }, [open]);

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        form.clearErrors('logo_file');

        if (!file) {
            form.setData('logo_file', null);
            setLogoPreview(null);
            return;
        }

        const validationMessage = validateFile(file, imageUploadRule);
        if (validationMessage) {
            form.setData('logo_file', null);
            form.setError('logo_file', validationMessage);
            setLogoPreview(null);
            if (logoInputRef.current) {
                logoInputRef.current.value = '';
            }
            toast.error(validationMessage);
            return;
        }

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

    const handleTemplateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        form.clearErrors('template_file');

        if (!file) {
            form.setData('template_file', null);
            return;
        }

        const validationMessage = validateFile(file, docxTemplateRule);
        if (validationMessage) {
            form.setData('template_file', null);
            form.setError('template_file', validationMessage);
            event.target.value = '';
            toast.error(validationMessage);
            return;
        }

        form.setData('template_file', file);
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

    const handleUpload = (event: React.FormEvent) => {
        event.preventDefault();
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

    const executeToggle = (templateId: number, onDone?: () => void) => {
        setIsMutatingTemplate(true);
        router.post(
            route('super-admin.letters.templates.toggle', { template: templateId }),
            {},
            {
                onSuccess: () => {
                    onDone?.();
                    fetchTemplates();
                },
                onFinish: () => setIsMutatingTemplate(false),
            },
        );
    };

    const executeDelete = (templateId: number, onDone?: () => void) => {
        setIsMutatingTemplate(true);
        router.delete(
            route('super-admin.letters.templates.destroy', { template: templateId }),
            {
                onSuccess: () => {
                    onDone?.();
                    fetchTemplates();
                },
                onFinish: () => setIsMutatingTemplate(false),
            },
        );
    };

    const handleToggle = (template: Template) => {
        if (template.isActive) {
            setConfirmAction({ type: 'deactivate', template });
            return;
        }

        executeToggle(template.id);
    };

    const handleDelete = (template: Template) => {
        setConfirmAction({ type: 'delete', template });
    };

    const handleConfirmAction = () => {
        if (!confirmAction) {
            return;
        }

        if (confirmAction.type === 'deactivate') {
            executeToggle(confirmAction.template.id, () => setConfirmAction(null));
            return;
        }

        executeDelete(confirmAction.template.id, () => setConfirmAction(null));
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

    const handleUpdate = (event: React.FormEvent) => {
        event.preventDefault();
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

    const isDeactivateAction = confirmAction?.type === 'deactivate';

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col gap-0 p-0 sm:max-h-[85vh] sm:max-w-3xl">
                    <DialogHeader className="shrink-0 border-b px-5 py-4 pr-10 sm:px-8 sm:py-5 sm:pr-12">
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                            Template Surat Word
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Upload template .docx dengan placeholder, header, footer, dan logo untuk disposisi final.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="space-y-4 px-5 py-4 sm:space-y-6 sm:px-8 sm:py-6">
                            {showUpload ? (
                                <TemplateEditorCard
                                    editingTemplate={editingTemplate}
                                    processing={form.processing}
                                    logoPreview={logoPreview}
                                    logoInputRef={logoInputRef}
                                    data={{
                                        name: form.data.name,
                                        header_text: form.data.header_text,
                                        footer_text: form.data.footer_text,
                                    }}
                                    errors={{
                                        name: form.errors.name,
                                        template_file: form.errors.template_file,
                                        logo_file: form.errors.logo_file,
                                        header_text: form.errors.header_text,
                                        footer_text: form.errors.footer_text,
                                    }}
                                    onSubmit={editingTemplate ? handleUpdate : handleUpload}
                                    onCancel={handleCancelUpload}
                                    onNameChange={(value) => form.setData('name', value)}
                                    onTemplateFileChange={handleTemplateFileChange}
                                    onLogoChange={handleLogoChange}
                                    onHeaderChange={(value) => form.setData('header_text', value)}
                                    onFooterChange={(value) => form.setData('footer_text', value)}
                                    onClearLogo={() => {
                                        form.setData('logo_file', null);
                                        setLogoPreview(null);
                                        if (logoInputRef.current) {
                                            logoInputRef.current.value = '';
                                        }
                                    }}
                                />
                            ) : (
                                <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => setShowUpload(true)}>
                                    <Upload className="h-4 w-4" />
                                    <span className="hidden sm:inline">Upload Template Baru</span>
                                    <span className="sm:hidden">Upload</span>
                                </Button>
                            )}

                            <div>
                                <h4 className="mb-2 text-xs font-medium sm:text-sm">Template Tersedia</h4>
                                <TemplateListSection
                                    loading={loading}
                                    templates={templates}
                                    onToggle={handleToggle}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            </div>

                            <div className="border-t pt-3 sm:pt-4">
                                <h4 className="mb-2 flex items-center gap-2 text-xs font-medium sm:text-sm">
                                    <Info className="h-3 w-3 text-blue-600 sm:h-4 sm:w-4" />
                                    Placeholder yang Tersedia
                                </h4>
                                <TemplatePlaceholderGrid placeholders={PLACEHOLDERS} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="relative z-10 shrink-0 border-t bg-white px-5 py-4 sm:px-8 sm:py-5">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 w-full text-sm sm:h-11 sm:w-auto sm:text-base">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(confirmAction)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && !isMutatingTemplate) {
                        setConfirmAction(null);
                    }
                }}
            >
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isDeactivateAction ? 'Nonaktifkan template surat?' : 'Hapus template surat?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isDeactivateAction ? (
                                <>
                                    Template <span className="font-semibold text-slate-900">{confirmAction?.template.name}</span> akan dinonaktifkan dan tidak dipakai sebagai template aktif.
                                </>
                            ) : (
                                <>
                                    Template <span className="font-semibold text-slate-900">{confirmAction?.template.name}</span> akan dihapus permanen dan tidak dapat dikembalikan.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isMutatingTemplate}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            disabled={isMutatingTemplate}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {isMutatingTemplate
                                ? 'Memproses...'
                                : isDeactivateAction
                                    ? 'Ya, nonaktifkan'
                                    : 'Ya, hapus'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
