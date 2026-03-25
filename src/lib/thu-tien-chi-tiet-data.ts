import { unstable_cache } from "next/cache";

import type { HuiOpeningForMetrics } from "@/lib/hui-member-line-metrics";
import { getOwnerReceiptLogoDataUrl } from "@/lib/owner-receipt-logo";
import { logPerf, perfNowMs } from "@/lib/perf-log";
import { prisma } from "@/lib/prisma";
import { parseMemberIdFromNote } from "@/lib/member-tracking-key";

export { parseMemberIdFromNote } from "@/lib/member-tracking-key";

type LoadThuTienOptions = {
  includeReceiptSetting?: boolean;
  /**
   * false: không nhúng QR/logo base64 trong RSC (client gọi /api/cai-dat/receipt-images).
   * Giảm mạnh kích thước payload trang chi tiết hụi viên / phiếu thu.
   */
  embedReceiptImages?: boolean;
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
        openings: openings.map(
          (o): HuiOpeningForMetrics => ({
            kyThu: o.kyThu,
            status: o.status === "DA_GIAO_TIEN" ? "DA_GIAO_TIEN" : "CHO_GIAO_TIEN",
            contributionPerSlot: o.contributionPerSlot,
            winnerName: o.winnerName,
            winnerPhone: o.winnerPhone,
            winnerLegStt: o.winnerLegStt,
            winnerSlots: o.winnerSlots,
          }),
        ),
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
  ["thu-tien-rows-members-v2"],
  // TTL dài hơn để giảm truy vấn lặp khi người dùng chuyển tab qua lại.
  { revalidate: 90, tags: ["thu-tien-panel-data", "chi-tiet-hui-vien-data"] },
);

const loadReceiptSettingForClientCached = unstable_cache(
  async (userId: string) => {
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
  },
  ["thu-tien-receipt-setting-v1"],
  { revalidate: 600, tags: ["thu-tien-panel-data", "chi-tiet-hui-vien-data"] },
);

const loadReceiptSettingTextForClientCached = unstable_cache(
  async (userId: string) => {
    const receiptSetting =
      (await prisma.ownerReceiptSetting.findUnique({
        where: { userId },
        select: {
          huiName: true,
          ownerName: true,
          address: true,
          phone: true,
          bankAccount: true,
          bankName: true,
          accountName: true,
          qrImageUrl: true,
          phieuGhiChu: true,
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
      } as const);

    const receiptSettingForClient = {
      huiName: receiptSetting.huiName,
      ownerName: receiptSetting.ownerName,
      address: receiptSetting.address,
      phone: receiptSetting.phone,
      bankAccount: receiptSetting.bankAccount,
      bankName: receiptSetting.bankName,
      accountName: receiptSetting.accountName,
      qrImageUrl: receiptSetting.qrImageUrl,
      qrImageDataUrl: "",
      logoImageDataUrl: "",
      phieuGhiChu: receiptSetting.phieuGhiChu ?? "",
    };

    return { receiptSettingForClient };
  },
  ["thu-tien-receipt-setting-text-v1"],
  { revalidate: 600, tags: ["thu-tien-panel-data", "chi-tiet-hui-vien-data"] },
);

export async function loadThuTienChiTietPanelData(userId: string, options: LoadThuTienOptions = {}) {
  const t0 = perfNowMs();
  const includeReceiptSetting = options.includeReceiptSetting ?? true;
  const embedReceiptImages = options.embedReceiptImages ?? true;
  const { members, rows } = await loadRowsAndMembersCached(userId);

  if (!includeReceiptSetting) {
    logPerf("loadThuTienChiTietPanelData", t0, `userId=${userId} withSetting=false`);
    return { members, rows };
  }

  const settingBundle = embedReceiptImages
    ? await loadReceiptSettingForClientCached(userId)
    : await loadReceiptSettingTextForClientCached(userId);
  logPerf(
    "loadThuTienChiTietPanelData",
    t0,
    `userId=${userId} withSetting=true embedImages=${embedReceiptImages}`,
  );
  return { members, rows, receiptSettingForClient: settingBundle.receiptSettingForClient };
}
