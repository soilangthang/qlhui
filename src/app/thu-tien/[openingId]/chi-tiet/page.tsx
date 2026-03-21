import { notFound } from "next/navigation";

import HuiShell from "@/components/hui-shell";
import ThuTienChiTietPanel from "@/components/thu-tien-chi-tiet-panel";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { loadThuTienChiTietPanelData } from "@/lib/thu-tien-chi-tiet-data";
import { openingWinnerMatchesMember } from "@/lib/hui-member-line-metrics";
import { prisma } from "@/lib/prisma";

export default async function ThuTienChiTietPage({
  params,
}: {
  params: Promise<{ openingId: string }>;
}) {
  const { openingId } = await params;

  const userId = await assertChuHuiUserId();

  const opening = await prisma.huiOpening.findFirst({
    where: { id: openingId, huiLine: { userId } },
    select: {
      id: true,
      winnerName: true,
      winnerPhone: true,
    },
  });
  if (!opening) notFound();

  const { members, rows, receiptSettingForClient } = await loadThuTienChiTietPanelData(userId);

  const defaultMember =
    members.find((item) => openingWinnerMatchesMember(opening.winnerName, opening.winnerPhone, item)) ??
    members[0] ??
    null;

  return (
    <HuiShell>
      <ThuTienChiTietPanel
        members={members}
        rows={rows}
        defaultMemberId={defaultMember?.id ?? ""}
        receiptSetting={receiptSettingForClient}
      />
    </HuiShell>
  );
}
