import { Eye } from 'lucide-react';
import Image from 'next/image';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';

type TemplatePreviewCardProps = {
    logoPreview: string | null;
    renderedContent: string;
    renderedFooter: string;
    renderedHeader: string;
};

export function TemplatePreviewCard({
    logoPreview,
    renderedContent,
    renderedFooter,
    renderedHeader,
}: TemplatePreviewCardProps) {
    return (
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-base text-blue-950">
                    <Eye className="h-4 w-4" />
                    Preview Langsung
                </CardTitle>
                <CardDescription>
                    Preview memakai data contoh agar perubahan template bisa dicek saat
                    mengetik.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                    <div className="mx-auto min-h-[620px] rounded-[24px] border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8">
                        {logoPreview && (
                            <div className="mb-5 flex justify-center border-b border-slate-100 pb-5">
                                <Image
                                    src={logoPreview}
                                    alt="Preview logo"
                                    width={80}
                                    height={80}
                                    unoptimized
                                    className="h-20 w-20 object-contain"
                                />
                            </div>
                        )}

                        {renderedHeader && (
                            <div className="mb-6 whitespace-pre-wrap border-b border-slate-200 pb-5 text-center text-sm font-medium leading-6 text-slate-700">
                                {renderedHeader}
                            </div>
                        )}

                        <div className="space-y-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {renderedContent || (
                                <p className="text-slate-400">
                                    Isi template akan tampil di sini.
                                </p>
                            )}
                        </div>

                        {renderedFooter && (
                            <div className="mt-8 whitespace-pre-wrap border-t border-slate-200 pt-5 text-sm leading-6 text-slate-500">
                                {renderedFooter}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
