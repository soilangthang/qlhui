import QuanTriPanel, { type QuanTriStats, type QuanTriUser } from "@/components/quan-tri-panel";
import { assertAdminOrRedirect } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Quản trị",
};

export default async function QuanTriPage() {
  const payload = await assertAdminOrRedirect();

  const [usersRaw, chuHui, admin, huiLineAgg] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        rule: true,
        chuHuiAccessUnlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where: { rule: "user" } }),
    prisma.user.count({ where: { rule: "admin" } }),
    prisma.huiLine.groupBy({
      by: ["userId"],
      _count: { id: true },
      _sum: { tienCo: true },
    }),
  ]);

  const huiStatsByUser = new Map(
    huiLineAgg.map((row) => [
      row.userId,
      {
        dayHui: row._count.id,
        tienCoTong: Number(row._sum.tienCo ?? 0),
      },
    ]),
  );

  const users: QuanTriUser[] = usersRaw.map((u) => {
    const s = u.rule === "user" ? huiStatsByUser.get(u.id) : undefined;
    return {
      ...u,
      huiLineCount: s?.dayHui ?? 0,
      tienCoTong: s?.tienCoTong ?? 0,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  });

  const stats: QuanTriStats = {
    chuHui,
    admin,
  };

  const me = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { name: true },
  });

  return (
    <QuanTriPanel
      currentAdminId={payload.sub}
      currentAdminName={me?.name ?? "Admin"}
      users={users}
      stats={stats}
    />
  );
}
