-- CreateEnum
CREATE TYPE "HuiCycle" AS ENUM ('NGAY', 'THANG', 'NAM');

-- AlterTable
ALTER TABLE "HuiLine" ADD COLUMN     "chuKy" "HuiCycle" NOT NULL DEFAULT 'THANG';
