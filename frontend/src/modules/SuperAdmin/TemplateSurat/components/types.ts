import type { Template } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';
import type { InertiaFormProps } from '@/shared/lib/inertia';

export type TemplateSuratPageProps = Record<string, unknown> & {
    templates?: Template[];
    placeholders?: Record<string, string>;
};

export type TemplateFormData = {
    name: string;
    template_content: string;
    header_text: string;
    footer_text: string;
    logo_file: File | null;
    remove_logo: boolean;
};

export type EditableField = 'template_content' | 'header_text' | 'footer_text';

export type EditorMode = 'create' | 'edit';

export type ConfirmTemplateAction =
    | { type: 'deactivate'; template: Template }
    | { type: 'delete'; template: Template }
    | null;

export type TemplateForm = InertiaFormProps<TemplateFormData>;

export type TemplateMutationResponse = {
    status?: string;
};

export type TemplatePreviewModel = {
    bodyParagraphs: string[];
    dispositionDate: string;
    dispositionNote: string;
    footerLines: string[];
    headerLines: string[];
    priority: string;
    processedBy: string;
    recipient: string;
    sender: string;
    senderDivision: string;
    subject: string;
    tanggal: string;
    nomorSurat: string;
};
