-- CreateTable
CREATE TABLE "HuiOpeningMemberPaidMark" (
    "id" TEXT NOT NULL,
    "huiOpeningId" TEXT NOT NULL,
    "memberKey" TEXT NOT NULL,
    "paidFull" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuiOpeningMemberPaidMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HuiOpeningMemberPaidMark_huiOpeningId_idx" ON "HuiOpeningMemberPaidMark"("huiOpeningId");

-- CreateIndex
CREATE UNIQUE INDEX "HuiOpeningMemberPaidMark_huiOpeningId_memberKey_key" ON "HuiOpeningMemberPaidMark"("huiOpeningId", "memberKey");

-- AddForeignKey
ALTER TABLE "HuiOpeningMemberPaidMark" ADD CONSTRAINT "HuiOpeningMemberPaidMark_huiOpeningId_fkey" FOREIGN KEY ("huiOpeningId") REFERENCES "HuiOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
