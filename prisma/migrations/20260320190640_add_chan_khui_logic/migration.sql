-- AlterTable
ALTER TABLE "HuiLine" ALTER COLUMN "status" SET DEFAULT 'CHO_GOP';

-- CreateTable
CREATE TABLE "HuiLeg" (
    "id" TEXT NOT NULL,
    "huiLineId" TEXT NOT NULL,
    "stt" INTEGER NOT NULL,
    "memberName" TEXT,
    "memberPhone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuiLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuiOpening" (
    "id" TEXT NOT NULL,
    "huiLineId" TEXT NOT NULL,
    "kyThu" INTEGER NOT NULL,
    "ngayKhui" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuiOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HuiLeg_huiLineId_stt_key" ON "HuiLeg"("huiLineId", "stt");

-- CreateIndex
CREATE UNIQUE INDEX "HuiOpening_huiLineId_kyThu_key" ON "HuiOpening"("huiLineId", "kyThu");

-- AddForeignKey
ALTER TABLE "HuiLeg" ADD CONSTRAINT "HuiLeg_huiLineId_fkey" FOREIGN KEY ("huiLineId") REFERENCES "HuiLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuiOpening" ADD CONSTRAINT "HuiOpening_huiLineId_fkey" FOREIGN KEY ("huiLineId") REFERENCES "HuiLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
