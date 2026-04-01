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
    renderTemplateText,
} from '@/modules/SuperAdmin/TemplateSurat/components/utils';
import { api, apiUrl } from '@/shared/lib/api';
import { Head, router, useForm, usePage, usePageManager } from '@/shared/lib/inertia';
import { route } from '@/shared/lib/route';
import type { PageProps } from '@/shared/types';

import type { ChangeEvent, FormEvent, RefObject } from 'react';

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
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    }, [clearErrors, selectedTemplate, setData]);

    const renderedHeader = useMemo(
        () => renderTemplateText(form.data.header_text, PREVIEW_VALUES),
        [form.data.header_text],
    );
    const renderedContent = useMemo(
        () => renderTemplateText(form.data.template_content, PREVIEW_VALUES),
        [form.data.template_content],
    );
    const renderedFooter = useMemo(
        () => renderTemplateText(form.data.footer_text, PREVIEW_VALUES),
        [form.data.footer_text],
    );

    const isBusy =
        form.processing || isMutatingTemplate || isRefreshingTemplates;

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
    };

    const refreshTemplates = async (options?: {
        preferredTemplateId?: number | null;
        mode?: EditorMode | 'auto';
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
            return nextTemplates;
        } catch {
            toast.error('Gagal memuat ulang data template surat.');
            return [];
        } finally {
            setIsRefreshingTemplates(false);
        }
    };

    const selectTemplate = (template: Template | null) => {
        setEditorMode(template ? 'edit' : 'create');
        setSelectedTemplateId(template?.id ?? null);
    };

    const handleCreateNew = () => {
        setEditorMode('create');
        setSelectedTemplateId(null);
        form.setData(buildInitialFormState(null));
        form.clearErrors();
        setLogoPreview(null);
        setActiveField('template_content');
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
        templateContentRef.current?.focus();
    };

    const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        form.setData('logo_file', file);
        form.setData('remove_logo', false);

        if (!file) {
            setLogoPreview(selectedTemplate?.logoUrl ?? null);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleClearLogo = () => {
        form.setData('logo_file', null);
        form.setData('remove_logo', true);
        setLogoPreview(null);
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
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

        const submitOptions = {
            forceFormData: true,
            onSuccess: async (data?: TemplateMutationResponse) => {
                toast.success(
                    data?.status ??
                        (editingTemplate
                            ? 'Template berhasil diperbarui.'
                            : 'Template berhasil dibuat.'),
                );
                await refreshTemplates({
                    preferredTemplateId: editingTemplate?.id ?? null,
                    mode: 'auto',
                });
            },
            onError: () => {
                toast.error(
                    editingTemplate
                        ? 'Gagal memperbarui template surat.'
                        : 'Gagal membuat template surat.',
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
        router.post(
            route('super-admin.letters.templates.toggle', { template: template.id }),
            {},
            {
                onSuccess: async (data?: TemplateMutationResponse) => {
                    toast.success(
                        data?.status ??
                            (template.isActive
                                ? 'Template berhasil dinonaktifkan.'
                                : 'Template berhasil diaktifkan.'),
                    );
                    await refreshTemplates({
                        preferredTemplateId: template.id,
                        mode: 'auto',
                    });
                    setConfirmAction(null);
                },
                onError: () =>
                    toast.error('Gagal mengubah status template surat.'),
                onFinish: () => setIsMutatingTemplate(false),
            },
        );
    };

    const executeDelete = (template: Template) => {
        setIsMutatingTemplate(true);
        router.delete(
            route('super-admin.letters.templates.destroy', { template: template.id }),
            {
                onSuccess: async (data?: TemplateMutationResponse) => {
                    toast.success(data?.status ?? 'Template berhasil dihapus.');
                    await refreshTemplates({ mode: 'auto' });
                    setConfirmAction(null);
                },
                onError: () => toast.error('Gagal menghapus template surat.'),
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

    const openDownload = (templateId: number) => {
        window.open(
            apiUrl(
                route('super-admin.letters.templates.download', {
                    template: templateId,
                }),
            ),
            '_blank',
        );
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

            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
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

                <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                    <TemplateEditorCard
                        activeField={activeField}
                        editorMode={editorMode}
                        form={form}
                        footerRef={footerRef}
                        headerRef={headerRef}
                        isBusy={isBusy}
                        logoInputRef={logoInputRef}
                        logoPreview={logoPreview}
                        placeholders={placeholders}
                        templateContentRef={templateContentRef}
                        onClearLogo={handleClearLogo}
                        onInsertPlaceholder={insertPlaceholder}
                        onLogoChange={handleLogoChange}
                        onResetEditor={handleCreateNew}
                        onSetActiveField={setActiveField}
                        onSubmit={handleSubmit}
                    />

                    <TemplatePreviewCard
                        logoPreview={logoPreview}
                        renderedContent={renderedContent}
                        renderedFooter={renderedFooter}
                        renderedHeader={renderedHeader}
                    />
                </div>
            </div>

            <TemplateConfirmDialog
                confirmAction={confirmAction}
                isMutatingTemplate={isMutatingTemplate}
                onConfirm={handleConfirmAction}
                onOpenChange={handleConfirmDialogOpenChange}
            />
        </SuperAdminLayout>
    );
}
