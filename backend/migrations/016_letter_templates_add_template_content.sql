ALTER TABLE letter_templates
  ADD COLUMN template_content LONGTEXT NULL AFTER file_name;
