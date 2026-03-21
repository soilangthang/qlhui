-- CreateTable
CREATE TABLE "OwnerReceiptQrUpload" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "imageData" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerReceiptQrUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerReceiptQrUpload_settingId_key" ON "OwnerReceiptQrUpload"("settingId");

-- AddForeignKey
ALTER TABLE "OwnerReceiptQrUpload" ADD CONSTRAINT "OwnerReceiptQrUpload_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "OwnerReceiptSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
