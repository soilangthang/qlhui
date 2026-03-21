-- Per-user isolation (idempotent — an toàn khi DB đã migrate một phần).

-- HuiMember
DO $hui_member$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'HuiMember' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "HuiMember" ADD COLUMN "userId" TEXT;
    UPDATE "HuiMember" SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
    ALTER TABLE "HuiMember" ALTER COLUMN "userId" SET NOT NULL;
  END IF;
END $hui_member$;

DROP INDEX IF EXISTS "HuiMember_phone_key";

CREATE UNIQUE INDEX IF NOT EXISTS "HuiMember_userId_phone_key" ON "HuiMember"("userId", "phone");

DO $hui_member_fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HuiMember_userId_fkey') THEN
    ALTER TABLE "HuiMember" ADD CONSTRAINT "HuiMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $hui_member_fk$;

CREATE INDEX IF NOT EXISTS "HuiMember_userId_idx" ON "HuiMember"("userId");

-- HuiLine
DO $hui_line$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'HuiLine' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "HuiLine" ADD COLUMN "userId" TEXT;
    UPDATE "HuiLine" SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
    ALTER TABLE "HuiLine" ALTER COLUMN "userId" SET NOT NULL;
  END IF;
END $hui_line$;

DO $hui_line_fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HuiLine_userId_fkey') THEN
    ALTER TABLE "HuiLine" ADD CONSTRAINT "HuiLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $hui_line_fk$;

CREATE INDEX IF NOT EXISTS "HuiLine_userId_idx" ON "HuiLine"("userId");

-- OwnerReceiptSetting: PK = userId
DO $owner$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'OwnerReceiptSetting' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'OwnerReceiptSetting' AND column_name = 'userId'
    ) THEN
      ALTER TABLE "OwnerReceiptSetting" ADD COLUMN "userId" TEXT;
    END IF;

    UPDATE "OwnerReceiptSetting" SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;

    ALTER TABLE "OwnerReceiptQrUpload" DROP CONSTRAINT IF EXISTS "OwnerReceiptQrUpload_settingId_fkey";

    UPDATE "OwnerReceiptQrUpload" AS ou
    SET "settingId" = s."userId"
    FROM "OwnerReceiptSetting" AS s
    WHERE ou."settingId" = s."id";

    ALTER TABLE "OwnerReceiptSetting" DROP CONSTRAINT "OwnerReceiptSetting_pkey";
    ALTER TABLE "OwnerReceiptSetting" DROP COLUMN "id";
    ALTER TABLE "OwnerReceiptSetting" ALTER COLUMN "userId" SET NOT NULL;
    ALTER TABLE "OwnerReceiptSetting" ADD CONSTRAINT "OwnerReceiptSetting_pkey" PRIMARY KEY ("userId");
    ALTER TABLE "OwnerReceiptSetting" ADD CONSTRAINT "OwnerReceiptSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE "OwnerReceiptQrUpload" ADD CONSTRAINT "OwnerReceiptQrUpload_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "OwnerReceiptSetting"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $owner$;
