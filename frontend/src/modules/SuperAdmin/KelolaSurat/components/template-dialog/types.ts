export interface Template {
    id: number;
    name: string;
    fileName: string;
    templateContent: string | null;
    headerText: string | null;
    footerText: string | null;
    logoUrl: string | null;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
}

export interface TemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const PLACEHOLDERS: Record<string, string> = {
    '{{logo}}': 'Logo Perusahaan',
    '{{header}}': 'Header Surat',
    '{{nomor_surat}}': 'Nomor Surat',
    '{{tanggal}}': 'Tanggal Surat',
    '{{pengirim}}': 'Nama Pengirim',
    '{{divisi_pengirim}}': 'Divisi Pengirim',
    '{{penerima}}': 'Penerima / Divisi Tujuan',
    '{{perihal}}': 'Perihal',
    '{{isi_surat}}': 'Isi Surat',
    '{{prioritas}}': 'Prioritas',
    '{{catatan_disposisi}}': 'Catatan Disposisi',
    '{{tanggal_disposisi}}': 'Tanggal Disposisi',
    '{{oleh}}': 'HR yang Mendisposisi',
    '{{footer}}': 'Footer Surat',
};
