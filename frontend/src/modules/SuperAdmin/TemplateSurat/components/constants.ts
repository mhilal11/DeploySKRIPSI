export const DEFAULT_TEMPLATE_CONTENT = [
    'Nomor: {{nomor_surat}}',
    'Tanggal: {{tanggal}}',
    '',
    'Kepada Yth.',
    '{{penerima}}',
    '',
    'Perihal: {{perihal}}',
    '',
    'Dengan hormat,',
    '{{isi_surat}}',
    '',
    'Prioritas: {{prioritas}}',
    '',
    'Catatan Disposisi:',
    '{{catatan_disposisi}}',
    '',
    'Tanggal Disposisi: {{tanggal_disposisi}}',
    'Diproses oleh: {{oleh}}',
].join('\n');

export const DEFAULT_HEADER_TEXT = 'PT. Lintas Data Prima\nDivisi Human Capital';

export const DEFAULT_FOOTER_TEXT =
    'Dokumen ini diproses secara elektronik oleh sistem HRIS LDP.';

export const NON_BODY_PLACEHOLDERS = new Set([
    '{{logo}}',
    '{{header}}',
    '{{footer}}',
]);

export const PREVIEW_VALUES: Record<string, string> = {
    '{{nomor_surat}}': '001/HC/LDP/IV/2026',
    '{{tanggal}}': '01 April 2026',
    '{{pengirim}}': 'Alya Putri',
    '{{divisi_pengirim}}': 'Human Capital',
    '{{penerima}}': 'Divisi Operasional',
    '{{perihal}}': 'Tindak Lanjut Kebutuhan Personel',
    '{{isi_surat}}':
        'Mohon menindaklanjuti kebutuhan personel untuk area operasional sesuai prioritas yang telah disepakati pada rapat koordinasi minggu ini.',
    '{{prioritas}}': 'Tinggi',
    '{{catatan_disposisi}}':
        'Harap diproses maksimal 2 hari kerja dan koordinasikan hasilnya kembali ke Human Capital.',
    '{{tanggal_disposisi}}': '02 April 2026 09:30',
    '{{oleh}}': 'Nadia Rahma',
    '{{header}}': DEFAULT_HEADER_TEXT,
    '{{footer}}': DEFAULT_FOOTER_TEXT,
    '{{logo}}': '',
};
