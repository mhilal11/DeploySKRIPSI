import { Megaphone } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

import type { AnnouncementRecord } from '../types';

interface AnnouncementListProps {
    announcements: AnnouncementRecord[];
}

export default function AnnouncementList({ announcements }: AnnouncementListProps) {
    return (
        <Card className="p-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-blue-900">Pengumuman HRD</h3>
                <p className="text-sm text-slate-500">
                    Informasi terbaru terkait program dan kebijakan karyawan
                </p>
            </div>

            <div className="space-y-4">
                {announcements.length === 0 && (
                    <p className="text-sm text-slate-500">
                        Belum ada pengumuman yang dipublikasikan.
                    </p>
                )}
                {announcements.map((announcement) => (
                    <div
                        key={announcement.id}
                        className="rounded-lg border border-blue-100 bg-blue-50/60 p-4"
                    >
                        <div className="flex items-start gap-3">
                            <span className="mt-1 text-blue-900">
                                <Megaphone className="h-4 w-4" />
                            </span>
                            <div>
                                <h4 className="text-sm font-semibold text-blue-900">
                                    {announcement.title}
                                </h4>
                                <p className="mt-1 text-sm text-slate-700">
                                    {announcement.content}
                                </p>
                                <p className="mt-2 text-xs uppercase tracking-wide text-blue-800/70">
                                    {announcement.date}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}



