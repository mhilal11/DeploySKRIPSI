import { FileText } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

import type { RegulationRecord } from '../types';

interface RegulationListProps {
    regulations: RegulationRecord[];
}

export default function RegulationList({ regulations }: RegulationListProps) {
    if (regulations.length === 0) {
        return (
            <Card className="p-6">
                <p className="text-sm text-slate-500">
                    Belum ada regulasi yang dibagikan ke divisi Anda.
                </p>
            </Card>
        );
    }

    return (
        <Card className="space-y-3 p-6">
            {regulations.map((regulation) => (
                <div
                    key={regulation.id}
                    className="flex flex-col gap-3 rounded-lg bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-blue-900/10 p-2 text-blue-900">
                            <FileText className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                {regulation.title}
                            </p>
                            <p className="text-xs text-slate-500">
                                {regulation.category} - Upload: {regulation.uploadDate}
                            </p>
                        </div>
                    </div>
                    {regulation.fileUrl && (
                        <a
                            href={regulation.fileUrl}
                            className="text-sm font-semibold text-blue-900 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Lihat
                        </a>
                    )}
                </div>
            ))}
        </Card>
    );
}


