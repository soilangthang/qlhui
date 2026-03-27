-- CreateEnum
CREATE TYPE "HuiLineKind" AS ENUM ('THUONG', 'GOP');

-- AlterTable
ALTER TABLE "HuiLine"
ADD COLUMN "kind" "HuiLineKind" NOT NULL DEFAULT 'THUONG',
ADD COLUMN "gopCycleDays" INTEGER,
ADD COLUMN "fixedBid" INTEGER;
