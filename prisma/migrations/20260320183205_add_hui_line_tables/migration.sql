-- CreateEnum
CREATE TYPE "HuiLineStatus" AS ENUM ('DANG_CHAY', 'SAP_MO', 'CHO_GOP');

-- CreateTable
CREATE TABLE "HuiLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "soChan" INTEGER NOT NULL,
    "mucHuiThang" DECIMAL(14,2) NOT NULL,
    "tienCo" DECIMAL(14,2),
    "ngayMo" TIMESTAMP(3) NOT NULL,
    "status" "HuiLineStatus" NOT NULL DEFAULT 'DANG_CHAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuiLine_pkey" PRIMARY KEY ("id")
);
