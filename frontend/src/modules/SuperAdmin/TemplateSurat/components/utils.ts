import type { Template } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';

import {
    DEFAULT_FOOTER_TEXT,
    DEFAULT_HEADER_TEXT,
    DEFAULT_TEMPLATE_CONTENT,
} from './constants';

import type { TemplateFormData } from './types';

export function normalizeMultiline(value: string | null | undefined): string {
    return (value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

export function renderTemplateText(
    content: string | null | undefined,
    replacements: Record<string, string>,
) {
    let output = content ?? '';

    Object.entries(replacements).forEach(([key, value]) => {
        output = output.replaceAll(key, value);
        output = output.replaceAll(
            key.replace('{{', '${').replace('}}', '}'),
            value,
        );
    });

    return output.trim();
}

export function buildInitialFormState(template?: Template | null): TemplateFormData {
    return {
        name: template?.name ?? '',
        template_content:
            normalizeMultiline(template?.templateContent) || DEFAULT_TEMPLATE_CONTENT,
        header_text:
            normalizeMultiline(template?.headerText) || DEFAULT_HEADER_TEXT,
        footer_text:
            normalizeMultiline(template?.footerText) || DEFAULT_FOOTER_TEXT,
        logo_file: null,
        remove_logo: false,
    };
}
