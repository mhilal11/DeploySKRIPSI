export const DEFAULT_TEMPLATE_CONTENT = [
    'Nomor: {{nomor_surat}}',
    'Tanggal: {{tanggal}}',
    'Pengirim: {{pengirim}}',
    'Divisi Pengirim: {{divisi_pengirim}}',
    '',
    'Kepada Yth.',
    '{{penerima}}',
    '',
    'Perihal: {{perihal}}',
    'Prioritas: {{prioritas}}',
    '',
    'Dengan hormat,',
    '{{isi_surat}}',
    '',
    'Demikian disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.',
    '',
    'Catatan Disposisi:',
    '{{catatan_disposisi}}',
    '',
    'Tanggal Disposisi: {{tanggal_disposisi}}',
    'Diproses oleh: {{oleh}}',
].join('\n');

export const DEFAULT_HEADER_TEXT = [
    'PT. Lintas Data Prima',
    'Divisi Human Capital • Template Surat Resmi / Disposisi Internal',
    'Jl. Contoh Kantor No. 88, Jakarta • human.capital@ldp.co.id • +62 21 5555 8888',
].join('\n');

export const DEFAULT_FOOTER_TEXT = [
    'Dokumen elektronik. Template ini dapat dipakai untuk kebutuhan surat resmi internal maupun eksternal.',
    'Diproses melalui sistem HRIS LDP',
].join('\n');

export const NON_BODY_PLACEHOLDERS = new Set([
    '{{logo}}',
    '{{header}}',
    '{{footer}}',
]);

export const PREVIEW_VALUES: Record<string, string> = {
    '{{nomor_surat}}': '003/COR/2026',
    '{{tanggal}}': '07 Februari 2026',
    '{{pengirim}}': 'Akbar',
    '{{divisi_pengirim}}': 'Corporate',
    '{{penerima}}': 'Government and Partner',
    '{{perihal}}': 'Undangan Kolaborasi',
    '{{isi_surat}}':
        'Sehubungan dengan rencana sinergi antara PT. Lintas Data Prima dan pihak Government and Partner, kami mengundang Bapak/Ibu untuk mendiskusikan peluang kolaborasi, ruang lingkup kerja sama, serta rencana tindak lanjut yang dapat memberikan nilai tambah bagi kedua belah pihak.\n\nWaktu pelaksanaan dan detail agenda dapat disesuaikan dengan ketersediaan pihak terkait. Template ini dapat dipakai ulang untuk surat undangan, nota dinas, surat pengantar, maupun disposisi internal hanya dengan mengganti metadata dan isi utama surat.',
    '{{prioritas}}': 'High',
    '{{catatan_disposisi}}':
        'OK, lanjutkan ke Government and Partner untuk koordinasi agenda dan tindak lanjut awal.',
    '{{tanggal_disposisi}}': '-',
    '{{oleh}}': 'HR Admin',
    '{{header}}': DEFAULT_HEADER_TEXT,
    '{{footer}}': DEFAULT_FOOTER_TEXT,
    '{{logo}}': '',
};
