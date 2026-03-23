import { unstable_cache } from "next/cache";

import { getOwnerReceiptLogoDataUrl } from "@/lib/owner-receipt-logo";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";
import { parseMemberIdFromNote } from "@/lib/member-tracking-key";

export { parseMemberIdFromNote } from "@/lib/member-tracking-key";

type LoadThuTienOptions = {
  includeReceiptSetting?: boolean;
};

const loadRowsAndMembersCached = unstable_cache(
  async (userId: string) => {
    const t0 = perfNowMs();
    const members = await prisma.huiMember.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, phone: true },
    });

    const lines = await prisma.huiLine.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        soChan: true,
        mucHuiThang: true,
        tienCo: true,
        chuKy: true,
        ngayMo: true,
        legs: {
          select: { stt: true, memberName: true, memberPhone: true, note: true },
        },
        openings: {
          orderBy: { kyThu: "asc" },
          select: {
            kyThu: true,
            ngayKhui: true,
            status: true,
            bidAmount: true,
            contributionPerSlot: true,
            grossPayout: true,
            finalPayout: true,
            winnerName: true,
            winnerPhone: true,
            winnerLegStt: true,
            winnerSlots: true,
          },
        },
      },
    });

    const rows = lines.map((line) => {
      const openings = line.openings ?? [];
      const latest = openings.length > 0 ? openings[openings.length - 1] : null;
      return {
        lineId: line.id,
        lineName: line.name,
        lineAmount: Number(line.mucHuiThang),
        lineTienCo: Math.max(0, Math.round(Number(line.tienCo ?? 0))),
        ngayMo: line.ngayMo.toISOString(),
        chuKy: line.chuKy,
        totalCycles: line.soChan,
        latestKy: latest?.kyThu ?? null,
        latestDate: latest?.ngayKhui.toISOString() ?? null,
        latestOpeningStatus: latest?.status ?? null,
        latestBidAmount: latest?.bidAmount ?? 0,
        latestContributionPerSlot: latest?.contributionPerSlot ?? 0,
        latestGrossPayout: latest?.grossPayout ?? 0,
        latestFinalPayout: latest?.finalPayout ?? 0,
        latestWinnerName: latest?.winnerName ?? null,
        latestWinnerPhone: latest?.winnerPhone ?? null,
        latestWinnerLegStt: latest?.winnerLegStt ?? null,
        latestWinnerSlots: latest?.winnerSlots ?? 1,
        openings: openings.map((o) => ({
          kyThu: o.kyThu,
          ngayKhui: o.ngayKhui.toISOString(),
          status: o.status,
          contributionPerSlot: o.contributionPerSlot,
          grossPayout: o.grossPayout,
          finalPayout: o.finalPayout,
          winnerName: o.winnerName,
          winnerPhone: o.winnerPhone,
          winnerLegStt: o.winnerLegStt,
          winnerSlots: o.winnerSlots,
          bidAmount: o.bidAmount,
        })),
        participants: line.legs.map((leg) => ({
          legStt: leg.stt,
          memberId: parseMemberIdFromNote(leg.note),
          memberName: leg.memberName,
          memberPhone: leg.memberPhone,
        })),
      };
    });
    logPerf("loadThuTienRowsAndMembers", t0, `userId=${userId} members=${members.length} rows=${rows.length}`);
    return { members, rows };
  },
  ["thu-tien-rows-members-v1"],
  // TTL ngắn: giảm lag tab switch nhưng vẫn giữ dữ liệu gần realtime.
  { revalidate: 15, tags: ["thu-tien-panel-data"] },
);

async function loadReceiptSettingForClient(userId: string) {
  const receiptSetting =
    (await prisma.ownerReceiptSetting.findUnique({
      where: { userId },
      include: {
        qrUpload: {
          select: {
            imageData: true,
            mimeType: true,
          },
        },
      },
    })) ??
    ({
      huiName: "Hụi mini",
      ownerName: "Chủ hụi",
      address: "",
      phone: "",
      bankAccount: "",
      bankName: "",
      accountName: "",
      qrImageUrl: "",
      phieuGhiChu: "",
      qrUpload: null,
    } as const);

  const logoImageDataUrl = await getOwnerReceiptLogoDataUrl(userId);

  const receiptSettingForClient = {
    huiName: receiptSetting.huiName,
    ownerName: receiptSetting.ownerName,
    address: receiptSetting.address,
    phone: receiptSetting.phone,
    bankAccount: receiptSetting.bankAccount,
    bankName: receiptSetting.bankName,
    accountName: receiptSetting.accountName,
    qrImageUrl: receiptSetting.qrImageUrl,
    qrImageDataUrl: receiptSetting.qrUpload
      ? `data:${receiptSetting.qrUpload.mimeType};base64,${Buffer.from(receiptSetting.qrUpload.imageData).toString("base64")}`
      : "",
    logoImageDataUrl,
    phieuGhiChu: receiptSetting.phieuGhiChu ?? "",
  };

  return { receiptSettingForClient };
}

export async function loadThuTienChiTietPanelData(userId: string, options: LoadThuTienOptions = {}) {
  const t0 = perfNowMs();
  const includeReceiptSetting = options.includeReceiptSetting ?? true;
  const { members, rows } = await loadRowsAndMembersCached(userId);

  if (!includeReceiptSetting) {
    logPerf("loadThuTienChiTietPanelData", t0, `userId=${userId} withSetting=false`);
    return { members, rows };
  }

  const settingBundle = await loadReceiptSettingForClient(userId);
  logPerf("loadThuTienChiTietPanelData", t0, `userId=${userId} withSetting=true`);
  return { members, rows, receiptSettingForClient: settingBundle.receiptSettingForClient };
}
