import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

export interface ApplicationHistoryItem {
    id: number;
    position: string;
    division?: string | null;
    status: string;
    submitted_at: string | null;
    notes?: string | null;
}

interface ApplicationHistoryProps {
    items: ApplicationHistoryItem[];
}

export default function ApplicationHistory({ items }: ApplicationHistoryProps) {
    return (
        <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">
                Riwayat Lamaran
            </h3>
            <div className="space-y-3">
                {items.length === 0 && (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                        Belum ada riwayat lamaran.
                    </p>
                )}
                {items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="font-medium text-slate-900">
                                {item.position}
                            </p>
                            <Badge className="bg-purple-500">
                                {item.status}
                            </Badge>
                        </div>
                        {item.division && (
                            <p className="text-xs text-slate-500">
                                Divisi: {item.division}
                            </p>
                        )}
                        <p className="text-sm text-slate-600">
                            Diajukan:{' '}
                            {item.submitted_at ? item.submitted_at : '-'}
                        </p>
                        {item.notes && (
                            <p className="text-sm text-slate-600">
                                Catatan: {item.notes}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
}


