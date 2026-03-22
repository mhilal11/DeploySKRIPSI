ALTER TABLE surat_reply_histories
  ADD COLUMN lampiran_path VARCHAR(255) NULL AFTER note,
  ADD COLUMN lampiran_nama VARCHAR(255) NULL AFTER lampiran_path,
  ADD COLUMN lampiran_mime VARCHAR(255) NULL AFTER lampiran_nama,
  ADD COLUMN lampiran_size BIGINT NULL AFTER lampiran_mime;
