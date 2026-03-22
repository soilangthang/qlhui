-- Logo lưu trực tiếp trên OwnerReceiptSetting (tránh bảng phụ chưa migrate).

ALTER TABLE "OwnerReceiptSetting" ADD COLUMN IF NOT EXISTS "logoImageData" BYTEA;
ALTER TABLE "OwnerReceiptSetting" ADD COLUMN IF NOT EXISTS "logoMimeType" TEXT;
ALTER TABLE "OwnerReceiptSetting" ADD COLUMN IF NOT EXISTS "logoFileName" TEXT;

-- Nếu từng dùng bảng OwnerReceiptLogoUpload, chuyển dữ liệu rồi xóa bảng.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'OwnerReceiptLogoUpload'
  ) THEN
    UPDATE "OwnerReceiptSetting" AS s
    SET
      "logoImageData" = u."imageData",
      "logoMimeType" = u."mimeType",
      "logoFileName" = u."fileName"
    FROM "OwnerReceiptLogoUpload" AS u
    WHERE s."userId" = u."settingId"
      AND s."logoImageData" IS NULL;

    DROP TABLE IF EXISTS "OwnerReceiptLogoUpload";
  END IF;
END $$;
