import { unstable_cache } from "next/cache";

import HuiVienPanel from "@/components/hui-vien-panel";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

const loadHuiVienPageDataCached = unstable_cache(
  async (userId: string) => {
    return prisma.huiMember.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, phone: true, note: true },
    });
  },
  ["hui-vien-page-data-v1"],
  { revalidate: 120, tags: ["hui-vien-page-data"] },
);

export default async function HuiVienPage() {
  const userId = await assertChuHuiUserId();
  const members = await loadHuiVienPageDataCached(userId);
  return (
    <HuiVienPanel
      initialMembers={members.map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        note: m.note ?? "-",
      }))}
    />
  );
}
