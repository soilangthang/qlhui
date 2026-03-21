import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  /** Tăng khi thêm/xóa model trong schema để không giữ PrismaClient cũ (thiếu delegate). */
  prismaInstanceRevision?: number;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL");
}

/** Đổi số này mỗi lần schema Prisma thay đổi cấu trúc model (migrate + generate). */
const PRISMA_INSTANCE_REVISION = 7;

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ["error", "warn"],
  });
}

function prismaHasOpeningMemberMarkDelegate(client: PrismaClient) {
  return (
    typeof (client as unknown as { huiOpeningMemberPaidMark?: { findMany?: unknown } }).huiOpeningMemberPaidMark
      ?.findMany === "function"
  );
}

function getOrCreatePrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  const revisionOk = globalForPrisma.prismaInstanceRevision === PRISMA_INSTANCE_REVISION;
  const delegateOk = existing ? prismaHasOpeningMemberMarkDelegate(existing) : false;

  if (existing && revisionOk && delegateOk) {
    return existing;
  }

  if (existing) {
    void existing.$disconnect().catch(() => {});
  }

  const next = createPrismaClient();
  globalForPrisma.prisma = next;
  globalForPrisma.prismaInstanceRevision = PRISMA_INSTANCE_REVISION;
  return next;
}

export const prisma: PrismaClient = getOrCreatePrisma();
