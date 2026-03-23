import { notFound } from "next/navigation";

import ThuTienChiTietPanel from "@/components/thu-tien-chi-tiet-panel";
import type { PhieuGiaoSlipPayload } from "@/components/phieu-giao-hui-block";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { openingWinnerMatchesMember, participantMatchesMember } from "@/lib/hui-member-line-metrics";
import { loadThuTienChiTietPanelData } from "@/lib/thu-tien-chi-tiet-data";
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
      kyThu: true,
      ngayKhui: true,
      bidAmount: true,
      grossPayout: true,
      finalPayout: true,
      contributors: true,
      contributionPerSlot: true,
      winnerSlots: true,
      winnerName: true,
      winnerPhone: true,
      note: true,
      huiLine: {
        select: {
          id: true,
          name: true,
          soChan: true,
          mucHuiThang: true,
          tienCo: true,
          chuKy: true,
          ngayMo: true,
        },
      },
    },
  });
  if (!opening) notFound();

  const { members, rows, receiptSettingForClient } = await loadThuTienChiTietPanelData(userId);
  const receiptSetting = receiptSettingForClient ?? {
    huiName: "Hụi mini",
    ownerName: "Chủ hụi",
    address: "",
    phone: "",
    bankAccount: "",
    bankName: "",
    accountName: "",
    qrImageUrl: "",
    qrImageDataUrl: "",
    logoImageDataUrl: "",
    phieuGhiChu: "",
  };

  const defaultMember =
    members.find((item) => openingWinnerMatchesMember(opening.winnerName, opening.winnerPhone, item)) ??
    members[0] ??
    null;

  const lineRow = rows.find((r) => r.lineId === opening.huiLine.id);
  let memberSlots: number | undefined;
  if (lineRow && defaultMember) {
    const n = lineRow.participants.reduce(
      (acc, p) => acc + (participantMatchesMember(p, defaultMember) ? 1 : 0),
      0,
    );
    if (n > 0) memberSlots = n;
  }

  const deliverySlip: PhieuGiaoSlipPayload = {
    lineName: opening.huiLine.name,
    lineAmount: Number(opening.huiLine.mucHuiThang),
    tienCoLine: Math.max(0, Math.round(Number(opening.huiLine.tienCo ?? 0))),
    ngayMoIso: opening.huiLine.ngayMo.toISOString(),
    chuKy: opening.huiLine.chuKy,
    totalCycles: opening.huiLine.soChan,
    kyThu: opening.kyThu,
    ngayKhuiIso: opening.ngayKhui.toISOString(),
    bidAmount: opening.bidAmount,
    grossPayout: opening.grossPayout,
    finalPayout: opening.finalPayout,
    winnerName: opening.winnerName?.trim() || "—",
    winnerPhone: opening.winnerPhone?.trim() || null,
    openingNote: opening.note?.trim() || null,
    winnerSlots: Math.max(1, opening.winnerSlots || 1),
    contributors: opening.contributors,
    contributionPerSlot: opening.contributionPerSlot,
    memberSlots,
  };

  return (
    <ThuTienChiTietPanel
      members={members}
      rows={rows}
      defaultMemberId={defaultMember?.id ?? ""}
      receiptSetting={receiptSetting}
      deliverySlip={deliverySlip}
    />
  );
}
