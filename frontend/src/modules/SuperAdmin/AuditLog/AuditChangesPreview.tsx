import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

import { changeTypeMeta } from './audit-log-utils';

import type { AuditChange } from './audit-log-utils';

type AuditChangesPreviewProps = {
    itemId: number;
    changes: AuditChange[];
    onOpenDetail: () => void;
};

export function AuditChangesPreview({
    itemId,
    changes,
    onOpenDetail,
}: AuditChangesPreviewProps) {
    if (changes.length === 0) {
        return (
            <div className="space-y-2">
                <p className="text-xs text-slate-500">
                    Tidak ada perubahan field yang terdeteksi.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={onOpenDetail}
                >
                    Lihat detail log
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-2">
                {changes.slice(0, 2).map((change) => (
                    <div key={`${itemId}-${change.key}`} className="flex items-center justify-between gap-2 text-[11px]">
                        <p className="truncate font-medium text-slate-700">{change.label}</p>
                        <Badge
                            variant="outline"
                            className={changeTypeMeta[change.type].className}
                        >
                            {changeTypeMeta[change.type].label}
                        </Badge>
                    </div>
                ))}
                {changes.length > 2 && (
                    <p className="text-[11px] text-slate-500">
                        +{changes.length - 2} perubahan lainnya
                    </p>
                )}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={onOpenDetail}
            >
                Lihat detail perubahan ({changes.length})
            </Button>
        </div>
    );
}
