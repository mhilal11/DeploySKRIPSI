export type AuditLogRecord = {
    id: number;
    user_name?: string | null;
    user_email?: string | null;
    user_role?: string | null;
    module: string;
    action: string;
    entity_type?: string | null;
    entity_id?: string | null;
    description?: string | null;
    old_values?: unknown;
    new_values?: unknown;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
    is_viewed?: boolean;
};

type FlatRecord = Record<string, unknown>;
export type ChangeType = 'added' | 'removed' | 'changed';

export type AuditChange = {
    key: string;
    label: string;
    type: ChangeType;
    before: unknown;
    after: unknown;
};

export type AuditDetailState = {
    item: AuditLogRecord;
    changes: AuditChange[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const parseAuditPayload = (value: unknown): unknown => {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return value;
    }

    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    return value;
};

const flattenValue = (path: string, value: unknown, target: FlatRecord) => {
    if (isPlainObject(value)) {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            target[path] = value;
            return;
        }
        entries.forEach(([nestedKey, nestedValue]) => {
            flattenValue(path ? `${path}.${nestedKey}` : nestedKey, nestedValue, target);
        });
        return;
    }

    target[path] = value;
};

const toFlatRecord = (raw: unknown): FlatRecord => {
    const parsed = parseAuditPayload(raw);

    if (parsed == null) {
        return {};
    }
    if (isPlainObject(parsed)) {
        const output: FlatRecord = {};
        Object.entries(parsed).forEach(([key, value]) => {
            flattenValue(key, value, output);
        });
        return output;
    }
    if (Array.isArray(parsed)) {
        return { data: parsed };
    }
    return { value: parsed };
};

const isEqualValue = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return a == null && b == null;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let index = 0; index < a.length; index += 1) {
            if (!isEqualValue(a[index], b[index])) return false;
        }
        return true;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) => isEqualValue(a[key], b[key]));
    }
    return false;
};

const toTitleCase = (value: string) =>
    value
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const formatFieldLabel = (path: string) =>
    path
        .split('.')
        .map((segment) => toTitleCase(segment))
        .join(' > ');

export const summarizeValue = (value: unknown): string => {
    if (value == null) return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
        return value.trim() ? value : '(kosong)';
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return '(kosong)';
        const isSimple = value.every(
            (item) =>
                item == null ||
                typeof item === 'string' ||
                typeof item === 'number' ||
                typeof item === 'boolean',
        );
        if (isSimple) {
            return value.map((item) => summarizeValue(item)).join(', ');
        }
        return `${value.length} item data`;
    }
    if (isPlainObject(value)) {
        const totalFields = Object.keys(value).length;
        return `Objek (${totalFields} field)`;
    }
    return String(value);
};

const normalizeComparableValue = (value: unknown): unknown => {
    if (value == null) return '';
    if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized === '' ? '' : normalized;
    }
    return value;
};

export const extractChanges = (oldValues: unknown, newValues: unknown): AuditChange[] => {
    const before = toFlatRecord(oldValues);
    const after = toFlatRecord(newValues);
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    const changes: AuditChange[] = [];

    allKeys.forEach((key) => {
        const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
        const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
        const beforeValue = before[key];
        const afterValue = after[key];
        const normalizedBefore = normalizeComparableValue(beforeValue);
        const normalizedAfter = normalizeComparableValue(afterValue);

        if (!hasBefore && hasAfter && normalizedAfter === '') return;
        if (hasBefore && !hasAfter && normalizedBefore === '') return;
        if (key === 'password_reset' && normalizedAfter !== true) return;

        if (!hasBefore && hasAfter) {
            changes.push({
                key,
                label: formatFieldLabel(key),
                type: 'added',
                before: null,
                after: afterValue,
            });
            return;
        }
        if (hasBefore && !hasAfter) {
            changes.push({
                key,
                label: formatFieldLabel(key),
                type: 'removed',
                before: beforeValue,
                after: null,
            });
            return;
        }
        if (!isEqualValue(normalizedBefore, normalizedAfter)) {
            changes.push({
                key,
                label: formatFieldLabel(key),
                type: 'changed',
                before: beforeValue,
                after: afterValue,
            });
        }
    });

    return changes;
};

const asStringOrNull = (value: unknown): string | null => {
    if (value == null) return null;
    const normalized = String(value).trim();
    return normalized === '' ? null : normalized;
};

const extractEntityName = (item: AuditLogRecord): string | null => {
    const newValues = toFlatRecord(item.new_values);
    const oldValues = toFlatRecord(item.old_values);
    const candidates = [
        'name',
        'full_name',
        'user_name',
        'employee_name',
        'applicant_name',
        'division_name',
        'title',
        'subject',
        'code',
    ];

    for (const key of candidates) {
        const current = asStringOrNull(newValues[key]) ?? asStringOrNull(oldValues[key]);
        if (current) {
            return current;
        }
    }

    return null;
};

export const formatObjectLabel = (item: AuditLogRecord): string => {
    const rawType = asStringOrNull(item.entity_type) ?? 'Objek';
    const typeLabel = toTitleCase(rawType.replace(/[._-]+/g, ' '));
    const idLabel = asStringOrNull(item.entity_id);
    const suffix = idLabel ? `#${idLabel}` : '';
    const displayName = extractEntityName(item);

    if (/^user$/i.test(rawType)) {
        if (displayName) {
            return `${typeLabel}${suffix} - ${displayName}`;
        }
        return `${typeLabel}${suffix}`.trim();
    }

    if (displayName) {
        return `${typeLabel}${suffix} - ${displayName}`;
    }

    return `${typeLabel}${suffix}`.trim();
};

export const changeTypeMeta: Record<ChangeType, { label: string; className: string }> = {
    added: {
        label: 'Ditambah',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    removed: {
        label: 'Dihapus',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
    },
    changed: {
        label: 'Diubah',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
};
