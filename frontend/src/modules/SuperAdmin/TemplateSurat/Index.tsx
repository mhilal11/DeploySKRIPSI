import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    PLACEHOLDERS,
    type Template,
} from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';
import SuperAdminLayout from '@/modules/SuperAdmin/Layout';
import {
    TemplateConfirmDialog,
    TemplateEditorCard,
    TemplateListPanel,
    TemplatePageActions,
    TemplatePlaceholderCard,
    TemplatePdfPreviewDialog,
    TemplatePreviewCard,
    TemplateStatsGrid,
    type ConfirmTemplateAction,
    type EditableField,
    type EditorMode,
    type TemplateMutationResponse,
    type TemplateSuratPageProps,
} from '@/modules/SuperAdmin/TemplateSurat/components';
import {
    NON_BODY_PLACEHOLDERS,
    PREVIEW_VALUES,
} from '@/modules/SuperAdmin/TemplateSurat/components/constants';
import {
    buildInitialFormState,
    buildTemplatePreviewModel,
} from '@/modules/SuperAdmin/TemplateSurat/components/utils';
import { api, apiUrl, isAxiosError } from '@/shared/lib/api';
import { Head, router, useForm, usePage, usePageManager } from '@/shared/lib/inertia';
import { route } from '@/shared/lib/route';
import type { PageProps } from '@/shared/types';

import type { ChangeEvent, FormEvent, RefObject } from 'react';

const ALLOWED_LOGO_FILE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
]);

export default function TemplateSuratIndex() {
    const page = usePage<PageProps<TemplateSuratPageProps>>();
    const { mergeProps } = usePageManager();
    const auth = page.props?.auth;
    const initialTemplates = page.props?.templates ?? [];
    const placeholders = page.props?.placeholders ?? PLACEHOLDERS;
    const initialSelectedTemplate =
        initialTemplates.find((template) => template.isActive) ??
        initialTemplates[0] ??
        null;

    const isHumanCapitalAdmin =
        auth?.user?.role === 'Admin' &&
        typeof auth?.user?.division === 'string' &&
        /human\s+(capital|resources)/i.test(auth?.user?.division ?? '');

    const breadcrumbs = isHumanCapitalAdmin
        ? [
            { label: 'Admin', href: route('admin-staff.dashboard') },
            { label: 'Kelola Surat' },
            { label: 'Template Surat' },
        ]
        : [
            { label: 'Super Admin', href: route('super-admin.dashboard') },
            { label: 'Kelola Surat' },
            { label: 'Template Surat' },
        ];

    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
        initialSelectedTemplate?.id ?? null,
    );
    const [editorMode, setEditorMode] = useState<EditorMode>(
        initialTemplates.length > 0 ? 'edit' : 'create',
    );
    const [activeField, setActiveField] =
        useState<EditableField>('template_content');
    const [logoPreview, setLogoPreview] = useState<string | null>(
        initialSelectedTemplate?.logoUrl ?? null,
    );
    const [confirmAction, setConfirmAction] =
        useState<ConfirmTemplateAction>(null);
    const [isMutatingTemplate, setIsMutatingTemplate] = useState(false);
    const [isRefreshingTemplates, setIsRefreshingTemplates] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isPdfPreviewLoading, setIsPdfPreviewLoading] = useState(false);
    const [isPdfPreviewVisible, setIsPdfPreviewVisible] = useState(false);
    const [hasPreviewAccess, setHasPreviewAccess] = useState(
        initialTemplates.length > 0,
    );
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    const templateContentRef = useRef<HTMLTextAreaElement>(null);
    const headerRef = useRef<HTMLTextAreaElement>(null);
    const footerRef = useRef<HTMLTextAreaElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const selectedTemplate = useMemo(
        () =>
            editorMode === 'edit'
                ? templates.find((template) => template.id === selectedTemplateId) ?? null
                : null,
        [editorMode, selectedTemplateId, templates],
    );
    const activeTemplate = useMemo(
        () => templates.find((template) => template.isActive) ?? null,
        [templates],
    );

    const form = useForm(buildInitialFormState(selectedTemplate));
    const { clearErrors, setData } = form;

    useEffect(() => {
        setData(buildInitialFormState(selectedTemplate));
        clearErrors();
        setLogoPreview(selectedTemplate?.logoUrl ?? null);
        setActiveField('template_content');
        setHasPreviewAccess(Boolean(selectedTemplate));
        setIsPdfPreviewVisible(false);
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    }, [clearErrors, selectedTemplate, setData]);

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
                window.URL.revokeObjectURL(pdfPreviewUrl);
            }
        };
    }, [pdfPreviewUrl]);

    const previewModel = useMemo(
        () =>
            buildTemplatePreviewModel(
                form.data.template_content,
                form.data.header_text,
                form.data.footer_text,
                PREVIEW_VALUES,
            ),
        [form.data.footer_text, form.data.header_text, form.data.template_content],
    );

    const isBusy =
        form.processing || isMutatingTemplate || isRefreshingTemplates;

    const resetLogoInput = () => {
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    const getFirstErrorMessage = (
        errors: Record<string, string> | undefined,
        fallbackMessage: string,
    ) => {
        if (!errors) {
            return fallbackMessage;
        }

        const firstMessage = Object.values(errors).find(
            (value) => typeof value === 'string' && value.trim() !== '',
        );

        return firstMessage ?? fallbackMessage;
    };

    const syncTemplates = (
        nextTemplates: Template[],
        options?: { preferredTemplateId?: number | null; mode?: EditorMode | 'auto' },
    ) => {
        setTemplates(nextTemplates);
        mergeProps({ templates: nextTemplates });

        if (options?.mode === 'create') {
            setEditorMode('create');
            setSelectedTemplateId(null);
            return;
        }

        const nextSelected =
            options?.preferredTemplateId != null
                ? nextTemplates.find(
                      (template) => template.id === options.preferredTemplateId,
                  ) ?? null
                : null;

        const resolvedSelection =
            nextSelected ??
            nextTemplates.find((template) => template.isActive) ??
            nextTemplates[0] ??
            null;

        if (!resolvedSelection) {
            setEditorMode('create');
            setSelectedTemplateId(null);
            return;
        }

        setEditorMode('edit');
        setSelectedTemplateId(resolvedSelection.id);

        return resolvedSelection;
    };

    const refreshTemplates = async (options?: {
        preferredTemplateId?: number | null;
        mode?: EditorMode | 'auto';
        suppressErrorToast?: boolean;
    }) => {
        setIsRefreshingTemplates(true);
        try {
            const { data } = await api.get(
                apiUrl(route('super-admin.letters.templates.list')),
                {
                    params: { _t: Date.now() },
                },
            );
            const nextTemplates = (data?.templates ?? []) as Template[];
            syncTemplates(nextTemplates, options);
            return true;
        } catch {
            if (!options?.suppressErrorToast) {
                toast.error('Gagal memuat ulang data template surat.');
            }
            return false;
        } finally {
            setIsRefreshingTemplates(false);
        }
    };

    const selectTemplate = (template: Template | null) => {
        if (isBusy) {
            return;
        }

        setEditorMode(template ? 'edit' : 'create');
        setSelectedTemplateId(template?.id ?? null);
    };

    const handleCreateNew = () => {
        if (isBusy) {
            return;
        }

        setEditorMode('create');
        setSelectedTemplateId(null);
        form.setData(buildInitialFormState(null));
        form.clearErrors();
        setLogoPreview(null);
        setActiveField('template_content');
        setHasPreviewAccess(false);
        setIsPreviewVisible(false);
        setIsPdfPreviewVisible(false);
        if (pdfPreviewUrl) {
            window.URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
        resetLogoInput();
        templateContentRef.current?.focus();
    };

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        clearErrors('logo_file');

        if (!file) {
            form.setData('logo_file', null);
            setLogoPreview(
                form.data.remove_logo ? null : selectedTemplate?.logoUrl ?? null,
            );
            resetLogoInput();
            return;
        }

        if (!ALLOWED_LOGO_FILE_TYPES.has(file.type)) {
            form.setData('logo_file', null);
            form.setError('logo_file', 'Logo harus berupa PNG atau JPG.');
            setLogoPreview(
                form.data.remove_logo ? null : selectedTemplate?.logoUrl ?? null,
            );
            resetLogoInput();
            toast.error('Logo harus berupa PNG atau JPG.');
            return;
        }

        form.setData('logo_file', file);
        form.setData('remove_logo', false);

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleClearLogo = () => {
        form.setData('logo_file', null);
        form.setData('remove_logo', true);
        clearErrors('logo_file');
        setLogoPreview(null);
        resetLogoInput();
    };

    const insertPlaceholder = (placeholder: string) => {
        if (NON_BODY_PLACEHOLDERS.has(placeholder)) {
            return;
        }

        const fieldRefMap: Record<EditableField, RefObject<HTMLTextAreaElement>> = {
            template_content: templateContentRef,
            header_text: headerRef,
            footer_text: footerRef,
        };
        const field = fieldRefMap[activeField].current;

        if (!field) {
            form.setData(activeField, `${form.data[activeField]}${placeholder}`);
            return;
        }

        const start = field.selectionStart ?? field.value.length;
        const end = field.selectionEnd ?? field.value.length;
        const nextValue =
            form.data[activeField].slice(0, start) +
            placeholder +
            form.data[activeField].slice(end);

        form.setData(activeField, nextValue);

        requestAnimationFrame(() => {
            field.focus();
            const caret = start + placeholder.length;
            field.setSelectionRange(caret, caret);
        });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const editingTemplate = editorMode === 'edit' ? selectedTemplate : null;
        const toastId = toast.loading(
            editingTemplate
                ? 'Menyimpan perubahan template surat...'
                : 'Menyimpan template surat...',
        );

        const submitOptions = {
            forceFormData: true,
            onSuccess: async (data?: TemplateMutationResponse) => {
                const successMessage =
                    data?.status ??
                    (editingTemplate
                        ? 'Template berhasil diperbarui.'
                        : 'Template berhasil dibuat.');

                if (editingTemplate) {
                    syncTemplates(
                        templates.map((template) =>
                            template.id === editingTemplate.id
                                ? {
                                      ...template,
                                      name: form.data.name.trim() || template.name,
                                      templateContent:
                                          form.data.template_content.trim() || null,
                                      headerText:
                                          form.data.header_text.trim() || null,
                                      footerText:
                                          form.data.footer_text.trim() || null,
                                      logoUrl: form.data.remove_logo
                                          ? null
                                          : logoPreview ?? template.logoUrl,
                                  }
                                : template,
                        ),
                        {
                            preferredTemplateId: editingTemplate.id,
                            mode: 'auto',
                        },
                    );
                }

                setHasPreviewAccess(true);
                setIsPreviewVisible(true);

                const refreshed = await refreshTemplates({
                    preferredTemplateId: editingTemplate?.id ?? null,
                    mode: 'auto',
                    suppressErrorToast: true,
                });

                if (refreshed) {
                    toast.success(successMessage, { id: toastId });
                    return;
                }

                toast.success(successMessage, {
                    id: toastId,
                    description:
                        'Perubahan tersimpan, tetapi daftar template belum berhasil dimuat ulang.',
                });
            },
            onError: (errors: Record<string, string>) => {
                toast.error(
                    getFirstErrorMessage(
                        errors,
                        editingTemplate
                            ? 'Gagal memperbarui template surat.'
                            : 'Gagal membuat template surat.',
                    ),
                    { id: toastId },
                );
            },
        };

        if (editingTemplate) {
            form.post(
                route('super-admin.letters.templates.update', {
                    template: editingTemplate.id,
                }),
                submitOptions,
            );
            return;
        }

        form.post(route('super-admin.letters.templates.store'), submitOptions);
    };

    const executeToggle = (template: Template) => {
        setIsMutatingTemplate(true);
        const isDeactivating = template.isActive;
        const toastId = toast.loading(
            isDeactivating
                ? 'Menonaktifkan template surat...'
                : 'Mengaktifkan template surat...',
        );
        router.post(
            route('super-admin.letters.templates.toggle', { template: template.id }),
            {},
            {
                onSuccess: async (data?: TemplateMutationResponse) => {
                    const successMessage =
                        data?.status ??
                        (isDeactivating
                            ? 'Template berhasil dinonaktifkan.'
                            : 'Template berhasil diaktifkan.');

                    syncTemplates(
                        templates.map((item) => {
                            if (item.id === template.id) {
                                return { ...item, isActive: !isDeactivating };
                            }

                            if (!isDeactivating && item.isActive) {
                                return { ...item, isActive: false };
                            }

                            return item;
                        }),
                        {
                            preferredTemplateId: template.id,
                            mode: 'auto',
                        },
                    );

                    const refreshed = await refreshTemplates({
                        preferredTemplateId: template.id,
                        mode: 'auto',
                        suppressErrorToast: true,
                    });

                    if (refreshed) {
                        toast.success(successMessage, { id: toastId });
                    } else {
                        toast.success(successMessage, {
                            id: toastId,
                            description:
                                'Status tersimpan, tetapi daftar template belum berhasil dimuat ulang.',
                        });
                    }
                    setConfirmAction(null);
                },
                onError: (errors: Record<string, string>) =>
                    toast.error(
                        getFirstErrorMessage(
                            errors,
                            'Gagal mengubah status template surat.',
                        ),
                        { id: toastId },
                    ),
                onFinish: () => setIsMutatingTemplate(false),
            },
        );
    };

    const executeDelete = (template: Template) => {
        setIsMutatingTemplate(true);
        const toastId = toast.loading('Menghapus template surat...');
        router.delete(
            route('super-admin.letters.templates.destroy', { template: template.id }),
            {},
            {
                onSuccess: async (data?: TemplateMutationResponse) => {
                    const successMessage =
                        data?.status ?? 'Template berhasil dihapus.';

                    const nextTemplates = templates.filter(
                        (item) => item.id !== template.id,
                    );
                    syncTemplates(nextTemplates, {
                        mode: nextTemplates.length > 0 ? 'auto' : 'create',
                    });

                    const refreshed = await refreshTemplates({
                        mode: 'auto',
                        suppressErrorToast: true,
                    });

                    if (refreshed) {
                        toast.success(successMessage, { id: toastId });
                    } else {
                        toast.success(successMessage, {
                            id: toastId,
                            description:
                                'Template terhapus, tetapi daftar template belum berhasil dimuat ulang.',
                        });
                    }
                    setConfirmAction(null);
                },
                onError: (errors: Record<string, string>) =>
                    toast.error(
                        getFirstErrorMessage(
                            errors,
                            'Gagal menghapus template surat.',
                        ),
                        { id: toastId },
                    ),
                onFinish: () => setIsMutatingTemplate(false),
            },
        );
    };

    const handleToggleRequest = (template: Template) => {
        if (template.isActive) {
            setConfirmAction({ type: 'deactivate', template });
            return;
        }

        executeToggle(template);
    };

    const handleDeleteRequest = (template: Template) => {
        setConfirmAction({ type: 'delete', template });
    };

    const handleConfirmAction = () => {
        if (!confirmAction) {
            return;
        }

        if (confirmAction.type === 'delete') {
            executeDelete(confirmAction.template);
            return;
        }

        executeToggle(confirmAction.template);
    };

    const handleConfirmDialogOpenChange = (open: boolean) => {
        if (!open && !isMutatingTemplate) {
            setConfirmAction(null);
        }
    };

    const openDownload = (template: Template) => {
        const toastId = toast.loading('Menyiapkan file template...');
        const downloadWindow = window.open(
            apiUrl(
                route('super-admin.letters.templates.download', {
                    template: template.id,
                }),
            ),
            '_blank',
        );

        if (!downloadWindow) {
            toast.error('Browser memblokir jendela unduhan template.', {
                id: toastId,
            });
            return;
        }

        toast.success(`File template "${template.name}" sedang diunduh.`, {
            id: toastId,
        });
    };

    const openPdfPreview = async () => {
        if (!hasPreviewAccess) {
            return;
        }

        const toastId = toast.loading('Menyiapkan preview PDF...');
        setIsPdfPreviewLoading(true);
        setIsPdfPreviewVisible(true);

        try {
            const payload = new FormData();
            payload.append('name', form.data.name);
            payload.append('template_content', form.data.template_content);
            payload.append('header_text', form.data.header_text);
            payload.append('footer_text', form.data.footer_text);
            payload.append('remove_logo', String(form.data.remove_logo));

            if (editorMode === 'edit' && selectedTemplateId != null) {
                payload.append('template_id', String(selectedTemplateId));
            }

            if (form.data.logo_file) {
                payload.append('logo_file', form.data.logo_file);
            }

            const response = await api.post(
                apiUrl('/super-admin/kelola-surat/templates/preview-pdf'),
                payload,
                {
                    responseType: 'blob',
                },
            );

            const nextUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' }),
            );

            setPdfPreviewUrl((current) => {
                if (current) {
                    window.URL.revokeObjectURL(current);
                }
                return nextUrl;
            });

            toast.success('Preview PDF siap ditampilkan.', { id: toastId });
        } catch (error) {
            let message = 'Gagal menyiapkan preview PDF template.';
            if (isAxiosError(error) && error.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const parsed = JSON.parse(text) as {
                        error?: string;
                        errors?: Record<string, string>;
                    };
                    message =
                        parsed.error ??
                        Object.values(parsed.errors ?? {})[0] ??
                        message;
                } catch {
                    // ignore blob parse failure
                }
            }
            setIsPdfPreviewVisible(false);
            toast.error(message, { id: toastId });
        } finally {
            setIsPdfPreviewLoading(false);
        }
    };

    return (
        <SuperAdminLayout
            title="Template Surat"
            description="Edit template disposisi langsung dari UI dengan preview live tanpa proses download-edit-upload ulang."
            breadcrumbs={breadcrumbs}
            actions={
                <TemplatePageActions
                    editorMode={editorMode}
                    isBusy={isBusy}
                    onCreateNew={handleCreateNew}
                />
            }
        >
            <Head title="Template Surat" />

            <TemplateStatsGrid
                templatesCount={templates.length}
                activeTemplateName={activeTemplate?.name ?? null}
            />

            <div className="grid items-stretch gap-6 xl:grid-cols-[340px_minmax(280px,0.75fr)_minmax(0,1.15fr)]">
                <TemplateListPanel
                    editorMode={editorMode}
                    isBusy={isBusy}
                    isRefreshingTemplates={isRefreshingTemplates}
                    selectedTemplateId={selectedTemplateId}
                    templates={templates}
                    onDeleteTemplate={handleDeleteRequest}
                    onDownloadTemplate={openDownload}
                    onSelectTemplate={selectTemplate}
                    onToggleTemplate={handleToggleRequest}
                />

                <div className="h-full min-h-0">
                    <TemplatePlaceholderCard
                        isBusy={isBusy}
                        placeholders={placeholders}
                        onInsertPlaceholder={insertPlaceholder}
                    />
                </div>

                <div className="min-w-0 h-full">
                    <TemplateEditorCard
                        activeField={activeField}
                        editorMode={editorMode}
                        form={form}
                        footerRef={footerRef}
                        headerRef={headerRef}
                        isBusy={isBusy}
                        canPreview={hasPreviewAccess}
                        isPdfPreviewLoading={isPdfPreviewLoading}
                        isPreviewVisible={isPreviewVisible}
                        logoInputRef={logoInputRef}
                        logoPreview={logoPreview}
                        templateContentRef={templateContentRef}
                        onClearLogo={handleClearLogo}
                        onLogoChange={handleLogoChange}
                        onOpenPdfPreview={openPdfPreview}
                        onResetEditor={handleCreateNew}
                        onSetActiveField={setActiveField}
                        onSubmit={handleSubmit}
                        onTogglePreview={() =>
                            setIsPreviewVisible((current) => !current)
                        }
                    />
                </div>
            </div>

            <TemplateConfirmDialog
                confirmAction={confirmAction}
                isMutatingTemplate={isMutatingTemplate}
                onConfirm={handleConfirmAction}
                onOpenChange={handleConfirmDialogOpenChange}
            />

            <TemplatePreviewCard
                open={hasPreviewAccess && isPreviewVisible}
                onOpenChange={setIsPreviewVisible}
                logoPreview={logoPreview}
                previewModel={previewModel}
            />

            <TemplatePdfPreviewDialog
                open={hasPreviewAccess && isPdfPreviewVisible}
                onOpenChange={setIsPdfPreviewVisible}
                isLoading={isPdfPreviewLoading}
                pdfUrl={pdfPreviewUrl}
            />
        </SuperAdminLayout>
    );
}
