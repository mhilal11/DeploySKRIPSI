import type { Template } from '@/modules/SuperAdmin/KelolaSurat/components/template-dialog/types';

import {
    DEFAULT_FOOTER_TEXT,
    DEFAULT_HEADER_TEXT,
    DEFAULT_TEMPLATE_CONTENT,
} from './constants';

import type { TemplateFormData, TemplatePreviewModel } from './types';

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

function startsWithLabel(line: string, label: string) {
    return line.toLowerCase().startsWith(`${label.toLowerCase()}:`);
}

function extractValueFromLine(line: string, label: string) {
    if (!startsWithLabel(line, label)) {
        return null;
    }

    return line.slice(label.length + 1).trim();
}

function isKnownSectionLine(line: string) {
    const normalized = line.trim().toLowerCase();
    if (!normalized) {
        return false;
    }

    return (
        normalized === 'kepada yth.' ||
        normalized === 'kepada yth' ||
        startsWithLabel(line, 'Nomor') ||
        startsWithLabel(line, 'Tanggal') ||
        startsWithLabel(line, 'Pengirim') ||
        startsWithLabel(line, 'Divisi Pengirim') ||
        startsWithLabel(line, 'Perihal') ||
        startsWithLabel(line, 'Prioritas') ||
        startsWithLabel(line, 'Catatan Disposisi') ||
        startsWithLabel(line, 'Tanggal Disposisi') ||
        startsWithLabel(line, 'Diproses oleh') ||
        startsWithLabel(line, 'Oleh')
    );
}

function splitParagraphs(lines: string[]) {
    const paragraphs: string[] = [];
    let current: string[] = [];

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            if (current.length > 0) {
                paragraphs.push(current.join(' '));
                current = [];
            }
            return;
        }

        current.push(trimmed);
    });

    if (current.length > 0) {
        paragraphs.push(current.join(' '));
    }

    return paragraphs;
}

function normalizeBodyParagraphs(paragraphs: string[]) {
    const normalized: string[] = [];

    paragraphs.forEach((paragraph) => {
        const trimmed = paragraph.trim();
        const lower = trimmed.toLowerCase();
        const opening = 'dengan hormat,';

        if (lower.startsWith(opening) && trimmed.length > opening.length) {
            normalized.push('Dengan hormat,');

            const remaining = trimmed.slice(opening.length).trim();
            if (remaining) {
                normalized.push(remaining);
            }
            return;
        }

        normalized.push(trimmed);
    });

    return normalized.filter(Boolean);
}

function extractBodyParagraphs(renderedContent: string) {
    const normalized = normalizeMultiline(renderedContent);
    if (!normalized) {
        return [];
    }

    const lines = normalized.split('\n');
    const bodyLines: string[] = [];
    let skipRecipientBlock = false;
    let skipDispositionBlock = false;

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
            if (skipRecipientBlock || skipDispositionBlock) {
                skipRecipientBlock = false;
                skipDispositionBlock = false;
            }
            bodyLines.push('');
            return;
        }

        if (skipRecipientBlock) {
            if (isKnownSectionLine(trimmed)) {
                skipRecipientBlock = false;
            } else {
                return;
            }
        }

        if (skipDispositionBlock) {
            if (isKnownSectionLine(trimmed)) {
                skipDispositionBlock = false;
            } else {
                return;
            }
        }

        const lower = trimmed.toLowerCase();
        if (lower === 'kepada yth.' || lower === 'kepada yth') {
            skipRecipientBlock = true;
            return;
        }

        if (startsWithLabel(trimmed, 'Catatan Disposisi')) {
            const value = extractValueFromLine(trimmed, 'Catatan Disposisi');
            if (!value) {
                skipDispositionBlock = true;
            }
            return;
        }

        if (isKnownSectionLine(trimmed)) {
            return;
        }

        bodyLines.push(trimmed);
    });

    return normalizeBodyParagraphs(splitParagraphs(bodyLines));
}

export function buildTemplatePreviewModel(
    content: string | null | undefined,
    headerText: string | null | undefined,
    footerText: string | null | undefined,
    replacements: Record<string, string>,
): TemplatePreviewModel {
    const renderedContent = renderTemplateText(content, replacements);
    const renderedHeader = renderTemplateText(headerText, replacements);
    const renderedFooter = renderTemplateText(footerText, replacements);
    const bodyParagraphs = extractBodyParagraphs(renderedContent);

    return {
        bodyParagraphs:
            bodyParagraphs.length > 0
                ? bodyParagraphs
                : normalizeBodyParagraphs(
                    splitParagraphs(normalizeMultiline(replacements['{{isi_surat}}']).split('\n')),
                ),
        dispositionDate: replacements['{{tanggal_disposisi}}'] || '-',
        dispositionNote: replacements['{{catatan_disposisi}}'] || '-',
        footerLines: normalizeMultiline(renderedFooter).split('\n').filter(Boolean),
        headerLines: normalizeMultiline(renderedHeader).split('\n').filter(Boolean),
        priority: replacements['{{prioritas}}'] || '-',
        processedBy: replacements['{{oleh}}'] || '-',
        recipient: replacements['{{penerima}}'] || '-',
        sender: replacements['{{pengirim}}'] || '-',
        senderDivision: replacements['{{divisi_pengirim}}'] || '-',
        subject: replacements['{{perihal}}'] || '-',
        tanggal: replacements['{{tanggal}}'] || '-',
        nomorSurat: replacements['{{nomor_surat}}'] || '-',
    };
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
