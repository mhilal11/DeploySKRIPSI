import { Sparkles } from 'lucide-react';

import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';

type TemplateStatsGridProps = {
    activeTemplateName: string | null;
    templatesCount: number;
};

export function TemplateStatsGrid({
    activeTemplateName,
    templatesCount,
}: TemplateStatsGridProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                    <CardDescription>Total template</CardDescription>
                    <CardTitle className="text-3xl font-semibold text-blue-950">
                        {templatesCount}
                    </CardTitle>
                </CardHeader>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                    <CardDescription>Template aktif</CardDescription>
                    <CardTitle className="text-lg font-semibold text-blue-950">
                        {activeTemplateName ?? 'Belum ada template aktif'}
                    </CardTitle>
                </CardHeader>
            </Card>
            <Card className="border-slate-200 bg-gradient-to-br from-blue-950 to-blue-900 text-white shadow-sm">
                <CardHeader className="pb-4">
                    <CardDescription className="text-blue-100">
                        Mode kerja
                    </CardDescription>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Sparkles className="h-5 w-5" />
                        Editor Langsung
                    </CardTitle>
                </CardHeader>
            </Card>
        </div>
    );
}
