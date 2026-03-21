-- CreateTable
CREATE TABLE "OwnerReceiptSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "huiName" TEXT NOT NULL DEFAULT 'Hụi mini',
    "ownerName" TEXT NOT NULL DEFAULT 'Chủ hụi',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerReceiptSetting_pkey" PRIMARY KEY ("id")
);
