import { Eye } from 'lucide-react';
import Image from 'next/image';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

import type { TemplatePreviewModel } from './types';

type TemplatePreviewCardProps = {
    logoPreview: string | null;
    open: boolean;
    previewModel: TemplatePreviewModel;
    onOpenChange: (open: boolean) => void;
};

export function TemplatePreviewCard({
    logoPreview,
    open,
    previewModel,
    onOpenChange,
}: TemplatePreviewCardProps) {
    const [companyName, ...companyDetails] = previewModel.headerLines;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-6xl">
                <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
                    <DialogTitle className="flex items-center gap-2 text-base text-blue-950 sm:text-lg">
                        <Eye className="h-4 w-4" />
                        Preview Template Surat
                    </DialogTitle>
                    <DialogDescription>
                        Preview ini mengikuti layout surat modern dengan field yang
                        sudah tersedia di sistem.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-4 py-6">
                    <div className="mx-auto max-w-[210mm] overflow-hidden rounded-[28px] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                        <div className="h-3 bg-[linear-gradient(90deg,#5b3b8c_0%,#7752a4_64%,#f0b400_100%)]" />

                        <div className="space-y-5 px-5 py-6 sm:px-8">
                            <section className="grid gap-4 border-b-2 border-slate-200 pb-5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                                <div className="grid h-[72px] w-[72px] place-items-center rounded-[20px] border border-[#e7ddf3] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5fc_100%)]">
                                    {logoPreview ? (
                                        <Image
                                            src={logoPreview}
                                            alt="Logo perusahaan"
                                            width={52}
                                            height={52}
                                            unoptimized
                                            className="h-[52px] w-[52px] object-contain"
                                        />
                                    ) : (
                                        <div className="text-[30px] font-black lowercase leading-none tracking-[-0.08em] text-[#5b3b8c]">
                                            <span className="text-[#f0b400]">d</span>p
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <h1 className="text-xl font-extrabold leading-tight text-slate-900">
                                        {companyName || 'PT. Lintas Data Prima'}
                                    </h1>
                                    {companyDetails.map((line) => (
                                        <p
                                            key={line}
                                            className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm"
                                        >
                                            {line}
                                        </p>
                                    ))}
                                </div>

                                <div className="w-fit rounded-full bg-[#efe9f8] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#5b3b8c]">
                                    HRIS LDP
                                </div>
                            </section>

                            <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                                    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                        Informasi Surat
                                    </h2>
                                    <div className="grid gap-2 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
                                        <div className="text-slate-500">Nomor</div>
                                        <div className="font-semibold text-slate-900">
                                            : {previewModel.nomorSurat}
                                        </div>
                                        <div className="text-slate-500">Tanggal</div>
                                        <div className="font-semibold text-slate-900">
                                            : {previewModel.tanggal}
                                        </div>
                                        <div className="text-slate-500">Pengirim</div>
                                        <div className="font-semibold text-slate-900">
                                            : {previewModel.sender}
                                        </div>
                                        <div className="text-slate-500">Divisi Pengirim</div>
                                        <div className="font-semibold text-slate-900">
                                            : {previewModel.senderDivision}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                                    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                        Tujuan Surat
                                    </h2>
                                    <p className="text-sm font-bold text-slate-900">
                                        Kepada Yth.
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-slate-700">
                                        {previewModel.recipient}
                                    </p>
                                </div>
                            </section>

                            <section className="flex flex-col gap-3 rounded-[18px] border border-[#e7ddf3] bg-[linear-gradient(90deg,#faf7ff_0%,#fffdf3_100%)] p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                        Perihal
                                    </div>
                                    <div className="mt-1 text-xl font-black leading-tight text-slate-900">
                                        {previewModel.subject}
                                    </div>
                                </div>
                                <div className="w-fit rounded-xl border border-[#f7c5bf] bg-[#fdecea] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#b42318]">
                                    Prioritas: {previewModel.priority}
                                </div>
                            </section>

                            <section className="space-y-3 px-1 text-sm leading-7 text-slate-700">
                                {previewModel.bodyParagraphs.length > 0 ? (
                                    previewModel.bodyParagraphs.map((paragraph, index) => (
                                        <p
                                            key={`${index}-${paragraph.slice(0, 24)}`}
                                            className={
                                                index === 0 || index === previewModel.bodyParagraphs.length - 1
                                                    ? 'text-left font-semibold'
                                                    : 'text-justify'
                                            }
                                        >
                                            {paragraph}
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-slate-400">
                                        Isi template akan tampil di sini.
                                    </p>
                                )}
                            </section>

                            <section className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-end">
                                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                    <strong>Catatan disposisi:</strong>
                                    <p className="mt-2 leading-6">
                                        {previewModel.dispositionNote}
                                    </p>
                                </div>

                                <div className="border-t border-slate-200 pt-3">
                                    <div className="text-base font-bold text-slate-900">
                                        {previewModel.sender}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500">
                                        {previewModel.senderDivision} - PT. Lintas Data Prima
                                    </div>
                                </div>
                            </section>

                            <section className="overflow-hidden rounded-[20px] border border-slate-200">
                                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Catatan Disposisi
                                    </h3>
                                    <div className="w-fit rounded-full bg-[#efe9f8] px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-[#5b3b8c]">
                                        Internal Follow-up
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                                    <div className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
                                        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                            Arahan / Tindak Lanjut
                                        </div>
                                        <div className="min-h-[86px] rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                            {previewModel.dispositionNote}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 p-4">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                                Tanggal Disposisi
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-slate-900">
                                                {previewModel.dispositionDate}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                                Diproses oleh
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-slate-900">
                                                {previewModel.processedBy}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                                Prioritas
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-slate-900">
                                                {previewModel.priority}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {previewModel.footerLines.length > 0 && (
                                <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="max-w-xl">
                                        <strong className="text-slate-700">
                                            {previewModel.footerLines[0]}
                                        </strong>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        {previewModel.footerLines.slice(1).map((line) => (
                                            <div key={line}>{line}</div>
                                        ))}
                                    </div>
                                </footer>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
