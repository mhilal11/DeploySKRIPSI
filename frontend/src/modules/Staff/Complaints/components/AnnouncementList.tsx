import { Megaphone } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';

import type { AnnouncementRecord } from '../types';

interface AnnouncementListProps {
    announcements: AnnouncementRecord[];
}

export default function AnnouncementList({ announcements }: AnnouncementListProps) {
    if (announcements.length === 0) {
        return (
            <Card className="p-6">
                <p className="text-sm text-slate-500">Belum ada pengumuman terbaru.</p>
            </Card>
        );
    }

    return (
        <Card className="space-y-4 p-6">
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
        </Card>
    );
}


