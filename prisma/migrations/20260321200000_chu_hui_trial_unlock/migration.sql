-- Dùng thử chủ hụi: sau 10 ngày cần admin mở khóa. Tài khoản hiện có được coi như đã mở khóa.
ALTER TABLE "User" ADD COLUMN "chuHuiAccessUnlocked" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "chuHuiAccessUnlocked" = true;
