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
