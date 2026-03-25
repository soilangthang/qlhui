import HuiVienPanel from "@/components/hui-vien-panel";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

export default async function HuiVienPage() {
  const userId = await assertChuHuiUserId();
  const members = await prisma.huiMember.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, note: true },
  });
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
