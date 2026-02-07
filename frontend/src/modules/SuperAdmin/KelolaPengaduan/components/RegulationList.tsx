import { FileText } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

import type { RegulationRecord } from '../types';

interface RegulationListProps {
    regulations: RegulationRecord[];
}

export default function RegulationList({ regulations }: RegulationListProps) {
    return (
        <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-blue-900">Regulasi Terkini</h3>
                    <p className="text-sm text-slate-500">
                        Dokumen kebijakan dan panduan terkait hubungan industrial
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {regulations.length === 0 && (
                    <p className="text-sm text-slate-500">Belum ada regulasi yang tersedia.</p>
                )}
                {regulations.map((regulation) => (
                    <div
                        key={regulation.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                    >
                        <div className="flex items-center gap-4">
                            <span className="rounded-lg bg-blue-900/10 p-2 text-blue-900">
                                <FileText className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="font-medium text-slate-900">
                                    {regulation.title}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {regulation.category} â€¢ Upload: {regulation.uploadDate}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {regulation.fileUrl && (
                                <>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-200 text-blue-900 hover:bg-blue-50"
                                    >
                                        <a href={regulation.fileUrl} target="_blank" rel="noreferrer">
                                            Lihat
                                        </a>
                                    </Button>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-200 text-slate-700 hover:bg-slate-50"
                                    >
                                        <a href={regulation.fileUrl} download={regulation.fileName ?? undefined}>
                                            Download
                                        </a>
                                    </Button>
                                </>
                            )}
                            {!regulation.fileUrl && (
                                <Button size="sm" variant="outline" disabled>
                                    Tidak tersedia
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}



